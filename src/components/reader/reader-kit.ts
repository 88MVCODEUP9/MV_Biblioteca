import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   reader-kit
   ─────────────────────────────────────────────────────────────────────────
   Comportamentos compartilhados entre EpubReader e PDFReader.

   Extraído para eliminar duplicação (fullscreen, bloqueio de scroll, swipe,
   download) e para padronizar um recurso que nenhum dos três leitores tinha
   de forma consistente: os controles somem sozinhos após alguns segundos de
   inatividade, como em qualquer leitor profissional (Kindle, Apple Books,
   Google Play Livros), e voltam ao mover o mouse, tocar a tela ou apertar
   uma tecla.
────────────────────────────────────────────────────────────────────────── */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Controla o fullscreen real do navegador para um elemento específico.
 * Substitui a antiga lógica de `parentElement?.parentElement?.requestFullscreen()`
 * usada no EpubReader, que quebrava silenciosamente se a árvore DOM mudasse.
 */
export function useFullscreen(
  targetRef: React.RefObject<HTMLElement | null>
) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement) &&
          document.fullscreenElement === targetRef.current
      );
    };

    document.addEventListener('fullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
    };
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await targetRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Não foi possível alternar o fullscreen.', err);
    }
  }, [targetRef]);

  return { isFullscreen, toggleFullscreen };
}

/**
 * Trava o scroll do `body` enquanto o componente estiver montado
 * (usado pelos leitores em tela cheia sobre a página).
 */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}

interface SwipeOptions {
  onNext: () => void;
  onPrev: () => void;
  /** Distância horizontal mínima, em px, para considerar um swipe. */
  threshold?: number;
  /** Tolerância vertical, em px, para não confundir com scroll. */
  maxVertical?: number;
  disabled?: boolean;
}

/**
 * Gestos de arrastar para os lados (próxima / página anterior),
 * ignorando arrastos majoritariamente verticais (scroll).
 */
export function useSwipeNavigation({
  onNext,
  onPrev,
  threshold = 60,
  maxVertical = 100,
  disabled = false,
}: SwipeOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (disabled || event.touches.length !== 1) return;
      touchStartX.current = event.touches[0].clientX;
      touchStartY.current = event.touches[0].clientY;
    },
    [disabled]
  );

  const onTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (
        disabled ||
        touchStartX.current === null ||
        touchStartY.current === null
      ) {
        return;
      }

      const deltaX = touchStartX.current - event.changedTouches[0].clientX;
      const deltaY = Math.abs(
        touchStartY.current - event.changedTouches[0].clientY
      );

      if (Math.abs(deltaX) > threshold && deltaY < maxVertical) {
        if (deltaX > 0) {
          onNext();
        } else {
          onPrev();
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [disabled, threshold, maxVertical, onNext, onPrev]
  );

  return { onTouchStart, onTouchEnd };
}

interface AutoHideOptions {
  /** Tempo de inatividade antes de esconder os controles. */
  idleMs?: number;
  /** Enquanto true (painel aberto, carregando, com erro...), nunca esconde. */
  suspended?: boolean;
}

/**
 * Mostra os controles (header/footer/toolbars) e os esconde sozinho após um
 * período de inatividade, reaparecendo ao mover o mouse, tocar a tela,
 * pressionar uma tecla ou navegar de página. `suspended` mantém os controles
 * sempre visíveis (usado enquanto carrega, com erro, ou com um painel aberto).
 */
export function useAutoHideControls({
  idleMs = 3200,
  suspended = false,
}: AutoHideOptions = {}) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearTimer();
    if (suspended) return;

    timerRef.current = window.setTimeout(() => {
      setVisible(false);
    }, idleMs);
  }, [clearTimer, idleMs, suspended]);

  const wake = useCallback(() => {
    setVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const toggle = useCallback(() => {
    setVisible((current) => {
      const next = !current;
      if (next) scheduleHide();
      else clearTimer();
      return next;
    });
  }, [scheduleHide, clearTimer]);

  useEffect(() => {
    if (suspended) {
      // A visibilidade precisa permanecer explícita enquanto o leitor está suspenso.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      clearTimer();
      return;
    }

    scheduleHide();
    return clearTimer;
  }, [suspended, scheduleHide, clearTimer]);

  return { visible, wake, toggle };
}

/** Dispara o download de um arquivo remoto usando um link temporário. */
export function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  document.body.appendChild(link);
  link.click();
  link.remove();
}

/**
 * Pequena transição de entrada (fade + scale) para os overlays de leitura,
 * evitando que o leitor "pipoque" abruptamente sobre o conteúdo.
 * Retorna a className a aplicar no elemento raiz do overlay.
 */
export function useEntranceTransition(): string {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return entered
    ? 'opacity-100 scale-100'
    : 'opacity-0 scale-[0.98]';
}
