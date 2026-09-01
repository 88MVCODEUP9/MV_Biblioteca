import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

import { Document, Page, pdfjs } from 'react-pdf';

import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Maximize,
  Minimize,
  BookOpen,
  Loader2,
  MonitorDown,
} from 'lucide-react';

import {
  clamp,
  useAutoHideControls,
  useBodyScrollLock,
  useEntranceTransition,
  useFullscreen,
  triggerDownload,
} from './reader/reader-kit';

/* ─────────────────────────────────────────────────────────────────────────────
   PDF.js Worker
───────────────────────────────────────────────────────────────────────────── */

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* ─────────────────────────────────────────────────────────────────────────────
   Configurações
───────────────────────────────────────────────────────────────────────────── */

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

/*
 * Níveis de zoom disponíveis.
 *
 * 165% foi adicionado entre 150% e 175%.
 */
const ZOOM_LEVELS = [
  0.45,   // 45%
  0.5,   // 50%
  0.55,  // 55%
  0.6,   // 60%
  0.65,  // 65%
  0.7,   // 70%
  0.75,  // 75%
  0.85,  // 85%
  1,     // 100%
  1.1,   // 110%
  1.25,  // 125%
  1.5,   // 150%
  1.65,  // 165% ← NOVO
  1.75,  // 175%
  2,     // 200%
  2.5,   // 250%
  3,     // 300%
  3.5,   // 350%
  4,     // 400%
];

const DEFAULT_ZOOM = 1;

/* Tamanho aproximado de uma página PDF A4 em pontos. */

const PDF_WIDTH = 595;
const PDF_HEIGHT = 842;

/* ─────────────────────────────────────────────────────────────────────────────
   Tipos
───────────────────────────────────────────────────────────────────────────── */

interface PDFReaderProps {
  url: string;
  title: string;
  author: string;
  coverUrl?: string;
  onClose: () => void;
}

type ZoomMode = 'fit' | 'manual';

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   Componente
───────────────────────────────────────────────────────────────────────────── */

export function PDFReader({
  url,
  title,
  author,
  coverUrl,
  onClose,
}: PDFReaderProps) {
  /* ─────────────────────────────────────────────────────────────────────────
     Estado
  ───────────────────────────────────────────────────────────────────────── */

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const [scale, setScale] =
    useState(DEFAULT_ZOOM);

  const [zoomMode, setZoomMode] =
    useState<ZoomMode>('fit');

  const [rotation, setRotation] = useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [pageLoading, setPageLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [showZoomMenu, setShowZoomMenu] =
    useState(false);

  /* ─────────────────────────────────────────────────────────────────────────
     Refs
  ───────────────────────────────────────────────────────────────────────── */

  const rootRef =
    useRef<HTMLDivElement>(null);

  const contentRef =
    useRef<HTMLDivElement>(null);

  const touchStartX =
    useRef<number | null>(null);

  const touchStartY =
    useRef<number | null>(null);

  const lastTapTime =
    useRef(0);

  /* ─────────────────────────────────────────────────────────────────────────
     Responsividade
  ───────────────────────────────────────────────────────────────────────── */

  const [viewport, setViewport] =
    useState({
      width:
        typeof window !== 'undefined'
          ? window.innerWidth
          : 1280,

      height:
        typeof window !== 'undefined'
          ? window.innerHeight
          : 800,
    });

  const isMobile =
    viewport.width < 640;

  const isTablet =
    viewport.width >= 640 &&
    viewport.width < 1024;

  const isDesktop =
    viewport.width >= 1024;

  /* ─────────────────────────────────────────────────────────────────────────
     Atualização do viewport
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();

    window.addEventListener(
      'resize',
      handleResize
    );

    return () => {
      window.removeEventListener(
        'resize',
        handleResize
      );
    };
  }, []);

  /* ─────────────────────────────────────────────────────────────────────────
     Calcula zoom para "Ajustar à tela"
  ───────────────────────────────────────────────────────────────────────── */

  const calculateFitZoom = useCallback(() => {
    const container =
      contentRef.current;

    if (!container) {
      return DEFAULT_ZOOM;
    }

    const width =
      container.clientWidth;

    const height =
      container.clientHeight;

    if (!width || !height) {
      return DEFAULT_ZOOM;
    }

    const horizontalPadding =
      isMobile
        ? 0
        : isTablet
          ? 16
          : 48;

    const verticalPadding =
      isMobile
        ? 8
        : 24;

    const availableWidth =
      Math.max(
        width - horizontalPadding,
        200
      );

    const availableHeight =
      Math.max(
        height - verticalPadding,
        200
      );

    const widthScale =
      availableWidth / PDF_WIDTH;

    const heightScale =
      availableHeight / PDF_HEIGHT;

    /* Celular prioriza largura */

    if (isMobile) {
      return clamp(
        widthScale,
        MIN_ZOOM,
        MAX_ZOOM
      );
    }

    /* Tablet prioriza largura */

    if (isTablet) {
      return clamp(
        widthScale,
        MIN_ZOOM,
        MAX_ZOOM
      );
    }

    /* Desktop encaixa a página inteira */

    return clamp(
      Math.min(
        widthScale,
        heightScale
      ),
      MIN_ZOOM,
      MAX_ZOOM
    );
  }, [
    isMobile,
    isTablet,
  ]);

  /* ─────────────────────────────────────────────────────────────────────────
     Atualiza zoom automático
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (
      zoomMode !== 'fit' ||
      !numPages
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        const fitZoom =
          calculateFitZoom();

        setScale(fitZoom);
      }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    calculateFitZoom,
    numPages,
    zoomMode,
    viewport.width,
    viewport.height,
  ]);

  /* ─────────────────────────────────────────────────────────────────────────
     Zoom manual
  ───────────────────────────────────────────────────────────────────────── */

  const setManualZoom =
    useCallback((value: number) => {
      const nextZoom =
        clamp(
          value,
          MIN_ZOOM,
          MAX_ZOOM
        );

      setZoomMode('manual');
      setScale(nextZoom);
    }, []);

  const zoomIn =
    useCallback(() => {
      setScale(current => {
        const next =
          ZOOM_LEVELS.find(
            level =>
              level >
              current + 0.001
          );

        return next ?? MAX_ZOOM;
      });

      setZoomMode('manual');
    }, []);

  const zoomOut =
    useCallback(() => {
      setScale(current => {
        const reversed =
          [...ZOOM_LEVELS].reverse();

        const next =
          reversed.find(
            level =>
              level <
              current - 0.001
          );

        return next ?? MIN_ZOOM;
      });

      setZoomMode('manual');
    }, []);

  const fitToScreen =
    useCallback(() => {
      const fitZoom =
        calculateFitZoom();

      setScale(fitZoom);
      setZoomMode('fit');

      requestAnimationFrame(() => {
        contentRef.current?.scrollTo({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
      });
    }, [calculateFitZoom]);

  /* ─────────────────────────────────────────────────────────────────────────
     Navegação
  ───────────────────────────────────────────────────────────────────────── */

  const previousPage =
    useCallback(() => {
      setPageNumber(page =>
        Math.max(page - 1, 1)
      );
    }, []);

  const nextPage =
    useCallback(() => {
      setPageNumber(page =>
        Math.min(
          page + 1,
          numPages
        )
      );
    }, [numPages]);

  /* ─────────────────────────────────────────────────────────────────────────
     Fullscreen
  ───────────────────────────────────────────────────────────────────────── */

  const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);

  /* ─────────────────────────────────────────────────────────────────────────
     Download
  ───────────────────────────────────────────────────────────────────────── */

  const downloadPdf =
    useCallback(() => {
      triggerDownload(url, `${title}.pdf`);
    }, [url, title]);

  /* ─────────────────────────────────────────────────────────────────────────
     Teclado
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const handleKeyboard =
      (event: KeyboardEvent) => {
        const target =
          event.target as
            | HTMLElement
            | null;

        if (
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA'
        ) {
          return;
        }

        switch (event.key) {
          case 'Escape':
            if (showZoomMenu) {
              setShowZoomMenu(false);
              return;
            }

            if (isFullscreen) {
              document
                .exitFullscreen()
                .catch(() => {});
            } else {
              onClose();
            }
            break;

          case 'ArrowRight':
          case 'PageDown':
            event.preventDefault();
            nextPage();
            break;

          case 'ArrowLeft':
          case 'PageUp':
            event.preventDefault();
            previousPage();
            break;

          case '+':
          case '=':
            event.preventDefault();
            zoomIn();
            break;

          case '-':
          case '_':
            event.preventDefault();
            zoomOut();
            break;

          case '0':
            event.preventDefault();
            fitToScreen();
            break;

          case 'r':
          case 'R':
            event.preventDefault();

            setRotation(
              rotation =>
                (rotation + 90) % 360
            );

            break;
        }
      };

    document.addEventListener(
      'keydown',
      handleKeyboard
    );

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyboard
      );
    };
  }, [
    fitToScreen,
    isFullscreen,
    nextPage,
    onClose,
    previousPage,
    showZoomMenu,
    zoomIn,
    zoomOut,
  ]);

  useBodyScrollLock();

  const { visible: showControls, wake: wakeControls } =
    useAutoHideControls({
      suspended: isLoading || Boolean(error) || showZoomMenu,
    });

  const entranceClass = useEntranceTransition();

  /* ─────────────────────────────────────────────────────────────────────────
     Ctrl + roda = zoom
  ───────────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const element =
      contentRef.current;

    if (!element) {
      return;
    }

    const handleWheel =
      (event: WheelEvent) => {
        if (!event.ctrlKey) {
          return;
        }

        event.preventDefault();

        if (event.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      };

    element.addEventListener(
      'wheel',
      handleWheel,
      { passive: false }
    );

    return () => {
      element.removeEventListener(
        'wheel',
        handleWheel
      );
    };
  }, [
    zoomIn,
    zoomOut,
  ]);

  /* ─────────────────────────────────────────────────────────────────────────
     Touch / swipe / double tap
  ───────────────────────────────────────────────────────────────────────── */

  const handleTouchStart = (
    event: React.TouchEvent
  ) => {
    if (
      event.touches.length !== 1
    ) {
      return;
    }

    touchStartX.current =
      event.touches[0].clientX;

    touchStartY.current =
      event.touches[0].clientY;
  };

  const handleTouchEnd = (
    event: React.TouchEvent
  ) => {
    wakeControls();

    if (
      touchStartX.current === null ||
      touchStartY.current === null
    ) {
      return;
    }

    const currentTime =
      Date.now();

    const timeSinceLastTap =
      currentTime -
      lastTapTime.current;

    /* Double tap → zoom */

    if (
      timeSinceLastTap < 300
    ) {
      if (
        zoomMode === 'manual'
      ) {
        fitToScreen();
      } else {
        setManualZoom(
          clamp(
            scale * 1.5,
            MIN_ZOOM,
            MAX_ZOOM
          )
        );
      }

      lastTapTime.current = 0;
      return;
    }

    lastTapTime.current =
      currentTime;

    const dx =
      touchStartX.current -
      event.changedTouches[0].clientX;

    const dy =
      Math.abs(
        touchStartY.current -
        event.changedTouches[0].clientY
      );

    /* Swipe horizontal */

    if (
      Math.abs(dx) > 60 &&
      dy < 100 &&
      scale <= 1.3
    ) {
      if (dx > 0) {
        nextPage();
      } else {
        previousPage();
      }
    }

    touchStartX.current =
      null;

    touchStartY.current =
      null;
  };

  /* ─────────────────────────────────────────────────────────────────────────
     Zoom formatado
  ───────────────────────────────────────────────────────────────────────── */

  const zoomPercentage =
    useMemo(
      () =>
        `${Math.round(
          scale * 100
        )}%`,
      [scale]
    );

  /* ─────────────────────────────────────────────────────────────────────────
     Classes
  ───────────────────────────────────────────────────────────────────────── */

  const buttonClass = `
    flex items-center justify-center
    rounded-xl
    transition-all duration-200
    text-[var(--text-sub)]
    hover:text-[var(--gold)]
    hover:bg-[var(--gold-glow)]
    active:scale-95
    disabled:opacity-30
    disabled:pointer-events-none
  `;

  const activeButtonClass = `
    text-[var(--gold)]
    bg-[var(--gold-glow)]
  `;

  /* ─────────────────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────────────────── */

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Leitor de ${title}`}
      className={`
        pdf-reader-root
        fixed inset-0 z-[1000]
        flex flex-col
        bg-[#09090b]
        text-[var(--text)]
        overflow-hidden
        transition-[opacity,transform]
        duration-300 ease-out
        ${entranceClass}
      `}
      onMouseMove={wakeControls}
      onClick={(event) => {
        if (event.target === event.currentTarget) wakeControls();
      }}
    >
      {/* HEADER */}

      <header
        aria-hidden={!showControls}
        className={`
          relative
          z-30
          flex
          items-center
          gap-2
          px-3 sm:px-4
          py-2
          min-h-[56px]
          shrink-0
          bg-[var(--bg-2)]
          border-b
          border-[var(--border)]
          shadow-lg
          transition-[opacity,transform]
          duration-300 ease-out
          ${
            showControls
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-3 pointer-events-none'
          }
        `}
      >
        {/* Fechar */}

        <button
          onClick={onClose}
          className={`${buttonClass} w-10 h-10 hover:text-red-400 hover:bg-red-400/10`}
          aria-label="Fechar leitor"
          title="Fechar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Capa */}

        {!isMobile && coverUrl && (
          <img
            src={coverUrl}
            alt=""
            className="
              w-8 h-11
              object-cover
              rounded-md
              shadow-lg
              shrink-0
            "
          />
        )}

        {/* Informações */}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {title}
          </p>

          {!isMobile && (
            <p
              className="
                text-[11px]
                text-[var(--text-muted)]
                truncate
              "
            >
              {author} · PDF
            </p>
          )}
        </div>

        {/* ZOOM */}

        <div className="relative hidden sm:flex items-center">
          <div
            className="
              flex
              items-center
              gap-0.5
              p-1
              rounded-xl
              bg-[var(--bg-3)]
              border
              border-[var(--border)]
              shadow-sm
            "
          >
            {/* Ajustar */}

            <button
              onClick={fitToScreen}
              className={`
                ${buttonClass}
                w-9 h-9
                ${
                  zoomMode === 'fit'
                    ? activeButtonClass
                    : ''
                }
              `}
              title="Ajustar à tela (0)"
              aria-label="Ajustar à tela"
            >
              <MonitorDown className="w-4 h-4" />
            </button>

            {/* Zoom - */}

            <button
              onClick={zoomOut}
              className={`${buttonClass} w-9 h-9`}
              title="Diminuir zoom (-)"
              aria-label="Diminuir zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            {/* Percentual */}

            <button
              onClick={() =>
                setShowZoomMenu(
                  value => !value
                )
              }
              className="
                min-w-[64px]
                h-9
                px-2
                rounded-lg
                text-xs
                font-semibold
                text-[var(--text)]
                hover:bg-[var(--gold-glow)]
                transition-colors
              "
              title="Selecionar zoom"
            >
              {zoomPercentage}
            </button>

            {/* Zoom + */}

            <button
              onClick={zoomIn}
              className={`${buttonClass} w-9 h-9`}
              title="Aumentar zoom (+)"
              aria-label="Aumentar zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Menu de zoom */}

          {showZoomMenu && (
            <div
              className="
                absolute
                top-[calc(100%+8px)]
                right-0
                z-50
                w-44
                p-2
                rounded-2xl
                bg-[var(--bg-2)]
                border
                border-[var(--border)]
                shadow-2xl
              "
            >
              <p
                className="
                  px-3 py-2
                  text-[10px]
                  uppercase
                  tracking-wider
                  text-[var(--text-muted)]
                "
              >
                Nível de zoom
              </p>

              <div className="grid grid-cols-2 gap-1">
                {ZOOM_LEVELS.map(
                  level => (
                    <button
                      key={level}
                      onClick={() => {
                        setManualZoom(
                          level
                        );

                        setShowZoomMenu(
                          false
                        );
                      }}
                      className={`
                        px-2
                        py-2
                        rounded-lg
                        text-xs
                        transition-colors
                        ${
                          Math.abs(
                            scale - level
                          ) < 0.01
                            ? 'bg-[var(--gold-glow)] text-[var(--gold)]'
                            : 'text-[var(--text-sub)] hover:bg-[var(--bg-3)]'
                        }
                      `}
                    >
                      {Math.round(
                        level * 100
                      )}
                      %
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO */}

        <div
          className="
            hidden md:flex
            items-center
            gap-1
            px-1
            py-1
            rounded-xl
            bg-[var(--bg-3)]
            border
            border-[var(--border)]
          "
        >
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className={`${buttonClass} w-9 h-9`}
            title="Página anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span
            className="
              min-w-[80px]
              text-center
              text-xs
              font-medium
              text-[var(--text)]
            "
          >
            {pageNumber} / {numPages}
          </span>

          <button
            onClick={nextPage}
            disabled={
              pageNumber >= numPages
            }
            className={`${buttonClass} w-9 h-9`}
            title="Próxima página"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Rotação */}

        <button
          onClick={() =>
            setRotation(
              rotation =>
                (rotation + 90) % 360
            )
          }
          className={`${buttonClass} w-10 h-10`}
          title="Rotacionar página (R)"
          aria-label="Rotacionar página"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Download */}

        {!isMobile && (
          <button
            onClick={downloadPdf}
            className={`${buttonClass} w-10 h-10`}
            title="Baixar PDF"
            aria-label="Baixar PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen */}

        <button
          onClick={toggleFullscreen}
          className={`${buttonClass} w-10 h-10`}
          title={
            isFullscreen
              ? 'Sair da tela cheia'
              : 'Tela cheia'
          }
          aria-label="Tela cheia"
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-4 h-4" />
          )}
        </button>
      </header>

      {/* ÁREA DO PDF */}

      <main
        ref={contentRef}
        className="
          relative
          flex-1
          min-h-0
          overflow-auto
          bg-[#18181c]
          scrollbar-thin
        "
        onTouchStart={(event) => {
          handleTouchStart(event);
          wakeControls();
        }}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background */}

        <div
          className="
            pointer-events-none
            fixed
            inset-0
            opacity-30
            bg-[radial-gradient(circle_at_center,rgba(255,255,255,.04),transparent_60%)]
          "
        />

        {/* Loading */}

        {isLoading && !error && (
          <div
            className="
              absolute
              inset-0
              z-20
              flex
              flex-col
              items-center
              justify-center
              gap-4
              bg-[#18181c]
            "
          >
            <div
              className="
                w-14 h-14
                rounded-2xl
                flex
                items-center
                justify-center
                bg-[var(--gold-glow)]
              "
            >
              <Loader2
                className="
                  w-7 h-7
                  animate-spin
                  text-[var(--gold)]
                "
              />
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">
                Carregando PDF
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  text-[var(--text-muted)]
                "
              >
                Preparando o documento…
              </p>
            </div>
          </div>
        )}

        {/* Erro */}

        {error && (
          <div
            className="
              absolute
              inset-0
              z-20
              flex
              items-center
              justify-center
              p-6
            "
          >
            <div
              className="
                max-w-md
                w-full
                p-8
                rounded-3xl
                text-center
                bg-[var(--bg-2)]
                border
                border-[var(--border)]
                shadow-2xl
              "
            >
              <div
                className="
                  mx-auto
                  mb-5
                  w-16 h-16
                  rounded-2xl
                  flex
                  items-center
                  justify-center
                  bg-red-500/10
                "
              >
                <BookOpen className="w-8 h-8 text-red-400" />
              </div>

              <h2 className="text-base font-semibold">
                Não foi possível abrir o PDF
              </h2>

              <p
                className="
                  mt-2
                  text-sm
                  leading-relaxed
                  text-[var(--text-muted)]
                "
              >
                {error}
              </p>

              <div
                className="
                  mt-6
                  flex
                  flex-wrap
                  justify-center
                  gap-2
                "
              >
                <button
                  onClick={() =>
                    window.open(
                      url,
                      '_blank',
                      'noopener,noreferrer'
                    )
                  }
                  className="
                    px-4 py-2.5
                    rounded-xl
                    text-sm
                    font-medium
                    bg-[var(--gold)]
                    text-[var(--bg)]
                    hover:brightness-110
                    transition
                  "
                >
                  Abrir PDF
                </button>

                <button
                  onClick={downloadPdf}
                  className="
                    px-4 py-2.5
                    rounded-xl
                    text-sm
                    font-medium
                    bg-[var(--bg-3)]
                    border
                    border-[var(--border)]
                    hover:bg-[var(--bg-4)]
                    transition
                  "
                >
                  Baixar
                </button>

                <button
                  onClick={onClose}
                  className="
                    px-4 py-2.5
                    rounded-xl
                    text-sm
                    font-medium
                    bg-red-500/10
                    text-red-400
                    hover:bg-red-500/20
                    transition
                  "
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Documento */}

        <div
          className="
            relative
            z-10
            flex
            min-h-full
            justify-center
            items-start
            px-0
            sm:px-4
            py-3
            sm:py-6
          "
          style={{
            touchAction:
              scale > 1.25
                ? 'pan-x pan-y'
                : 'pan-y',
          }}
        >
          <Document
            file={url}
            onLoadSuccess={({
              numPages,
            }) => {
              setNumPages(numPages);
              setPageNumber(1);
              setIsLoading(false);
              setPageLoading(false);
              setError(null);
            }}
            onLoadError={event => {
              const message =
                event instanceof Error
                  ? event.message
                  : String(event);

              if (
                message
                  .toLowerCase()
                  .includes('cors')
              ) {
                setError(
                  'Este PDF não pode ser carregado diretamente devido às regras de CORS.'
                );
              } else if (
                message.includes(
                  'Invalid PDF'
                ) ||
                message.includes(
                  'startxref'
                )
              ) {
                setError(
                  'O arquivo informado não parece ser um PDF válido.'
                );
              } else {
                setError(
                  `Erro ao carregar o PDF: ${message}`
                );
              }

              setIsLoading(false);
            }}
            loading={null}
            error={null}
          >
            {!isLoading &&
              !error &&
              numPages > 0 && (
                <div
                  className="
                    relative
                    select-none
                    transition-all
                    duration-200
                  "
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    rotate={rotation}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    canvasBackground="white"
                    className="
                      overflow-hidden
                      rounded-sm
                      shadow-[0_12px_50px_rgba(0,0,0,.45)]
                    "
                    loading={
                      <div
                        className="
                          flex
                          items-center
                          justify-center
                          bg-white
                          rounded-sm
                        "
                        style={{
                          width:
                            PDF_WIDTH *
                            scale,

                          height:
                            PDF_HEIGHT *
                            scale,
                        }}
                      >
                        <Loader2
                          className="
                            w-8 h-8
                            animate-spin
                            text-[var(--gold)]
                          "
                        />
                      </div>
                    }
                    onRenderSuccess={() =>
                      setPageLoading(false)
                    }
                    onRenderError={() =>
                      setPageLoading(false)
                    }
                  />

                  {/* Indicador de renderização */}

                  {pageLoading && (
                    <div
                      className="
                        absolute
                        inset-0
                        flex
                        items-center
                        justify-center
                        bg-black/10
                        pointer-events-none
                      "
                    >
                      <Loader2
                        className="
                          w-7 h-7
                          animate-spin
                          text-[var(--gold)]
                        "
                      />
                    </div>
                  )}
                </div>
              )}
          </Document>
        </div>

        {/* Navegação lateral */}

        {!isLoading &&
          !error &&
          numPages > 0 && (
            <>
              <button
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="
                  hidden sm:flex
                  fixed
                  left-4
                  top-1/2
                  -translate-y-1/2
                  z-20
                  w-11 h-20
                  items-center
                  justify-center
                  rounded-2xl
                  bg-transparent
                  text-white/35
                  hover:bg-black/20
                  hover:text-white/80
                  disabled:opacity-0
                  transition-all
                "
                title="Página anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={nextPage}
                disabled={
                  pageNumber >= numPages
                }
                className="
                  hidden sm:flex
                  fixed
                  right-4
                  top-1/2
                  -translate-y-1/2
                  z-20
                  w-11 h-20
                  items-center
                  justify-center
                  rounded-2xl
                  bg-transparent
                  text-white/35
                  hover:bg-black/20
                  hover:text-white/80
                  disabled:opacity-0
                  transition-all
                "
                title="Próxima página"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
      </main>

      {/* FOOTER MOBILE / TABLET */}

      {(isMobile || isTablet) &&
        !isLoading &&
        !error && (
          <footer
            aria-hidden={!showControls}
            className={`
              relative
              z-30
              flex
              items-center
              justify-between
              gap-2
              px-3
              py-2
              min-h-[58px]
              bg-[var(--bg-2)]
              border-t
              border-[var(--border)]
              transition-[opacity,transform]
              duration-300 ease-out
              ${
                showControls
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-3 pointer-events-none'
              }
            `}
          >
            {/* Página anterior */}

            <button
              onClick={previousPage}
              disabled={pageNumber <= 1}
              className="
                w-11 h-11
                flex
                items-center
                justify-center
                rounded-xl
                text-[var(--text-sub)]
                hover:text-[var(--gold)]
                hover:bg-[var(--gold-glow)]
                disabled:opacity-30
              "
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Zoom */}

            <div
              className="
                flex
                items-center
                gap-1
                px-1
                py-1
                rounded-xl
                bg-[var(--bg-3)]
              "
            >
              <button
                onClick={zoomOut}
                className="
                  w-9 h-9
                  flex
                  items-center
                  justify-center
                  rounded-lg
                  hover:bg-[var(--gold-glow)]
                  hover:text-[var(--gold)]
                "
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={fitToScreen}
                className="
                  min-w-[55px]
                  text-xs
                  font-semibold
                "
                title="Ajustar à tela"
              >
                {zoomPercentage}
              </button>

              <button
                onClick={zoomIn}
                className="
                  w-9 h-9
                  flex
                  items-center
                  justify-center
                  rounded-lg
                  hover:bg-[var(--gold-glow)]
                  hover:text-[var(--gold)]
                "
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Página atual */}

            <span
              className="
                absolute
                left-1/2
                -translate-x-1/2
                bottom-[-1px]
                px-2
                py-0.5
                rounded-t-lg
                bg-[var(--bg-3)]
                text-[9px]
                text-[var(--text-muted)]
              "
            >
              {pageNumber} / {numPages}
            </span>

            {/* Próxima página */}

            <button
              onClick={nextPage}
              disabled={
                pageNumber >= numPages
              }
              className="
                w-11 h-11
                flex
                items-center
                justify-center
                rounded-xl
                text-[var(--text-sub)]
                hover:text-[var(--gold)]
                hover:bg-[var(--gold-glow)]
                disabled:opacity-30
              "
              aria-label="Próxima página"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </footer>
        )}

      {/* DICA DE ATALHOS — DESKTOP */}

      {isDesktop &&
        !isLoading &&
        !error && (
          <div
            className="
              pointer-events-none
              fixed
              bottom-4
              left-1/2
              -translate-x-1/2
              z-20
              px-4
              py-2
              rounded-full
              bg-black/50
              backdrop-blur-md
              border
              border-white/10
              text-[10px]
              text-white/60
              opacity-0
              hover:opacity-100
              transition-opacity
            "
          >
            ← → páginas · + − zoom · 0 ajustar ·
            R girar · Ctrl + roda zoom
          </div>
        )}
    </div>
  );
}
