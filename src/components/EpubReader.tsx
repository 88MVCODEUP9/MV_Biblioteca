import {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from 'react';
  
  import ePub from 'epubjs';
  
  import {
    BookOpen,
    Download,
    Loader2,
    X,
    Maximize,
    Minimize,
    Plus,
    Minus,
    Sun,
    Moon,
    Coffee,
    RotateCcw,
    List,
  } from 'lucide-react';

  import {
    useAutoHideControls,
    useBodyScrollLock,
    useEntranceTransition,
    useFullscreen,
    useSwipeNavigation,
    triggerDownload,
  } from './reader/reader-kit';
  
  interface EpubReaderProps {
    url: string;
    title: string;
    author: string;
    coverUrl?: string;
    onClose: () => void;
  }
  
  type ReaderTheme = 'light' | 'dark' | 'sepia';
  
  interface EpubLocation {
    start?: {
      cfi?: string;
      displayed?: {
        page?: number;
        total?: number;
      };
      href?: string;
    };
    end?: {
      cfi?: string;
    };
  }
  
  const FONT_SIZES = [
    90,
    100,
    110,
    120,
    130,
    140,
    150,
  ];
  
  export function EpubReader({
    url,
    title,
    author,
    coverUrl,
    onClose,
  }: EpubReaderProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const readerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<ReturnType<typeof ePub> | null>(null);
    type RenditionLike = {
      destroy?: () => void;
      themes: {
        default: (styles: Record<string, Record<string, string>>) => void;
        fontSize: (value: string) => void;
        register: (name: string, styles: Record<string, Record<string, string>>) => void;
        select: (name: string) => void;
      };
      on: (event: string, handler: (location?: EpubLocation) => void) => void;
      display: () => Promise<void>;
      next: () => Promise<void>;
      prev: () => Promise<void>;
    };
    const renditionRef = useRef<RenditionLike | null>(null);
  
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    const [theme, setTheme] =
      useState<ReaderTheme>('light');
  
    const [fontSize, setFontSize] = useState(100);
  
    const [progress, setProgress] = useState(0);
  
    const [currentPage, setCurrentPage] =
      useState<number | null>(null);
  
    const [totalPages, setTotalPages] =
      useState<number | null>(null);
  
    const [showSettings, setShowSettings] =
      useState(false);
  
    const [showToc, setShowToc] =
      useState(false);
  
    const [toc, setToc] = useState<Array<{ label?: string; href?: string; subitems?: Array<{ label?: string; href?: string }> }>>([]);
  
    const applyTheme = useCallback(
      (newTheme: ReaderTheme) => {
        const rendition = renditionRef.current;
  
        if (!rendition) return;
  
        const themes = {
          light: {
            body: {
              background: '#ffffff !important',
              color: '#202124 !important',
            },
            p: {
              color: '#202124 !important',
            },
            h1: {
              color: '#111111 !important',
            },
            h2: {
              color: '#111111 !important',
            },
            h3: {
              color: '#111111 !important',
            },
            a: {
              color: '#8a6d1d !important',
            },
          },
  
          dark: {
            body: {
              background: '#151515 !important',
              color: '#e8e8e8 !important',
            },
            p: {
              color: '#e8e8e8 !important',
            },
            h1: {
              color: '#ffffff !important',
            },
            h2: {
              color: '#ffffff !important',
            },
            h3: {
              color: '#ffffff !important',
            },
            a: {
              color: '#d8b86a !important',
            },
          },
  
          sepia: {
            body: {
              background: '#f4ecd8 !important',
              color: '#4b4032 !important',
            },
            p: {
              color: '#4b4032 !important',
            },
            h1: {
              color: '#3b3024 !important',
            },
            h2: {
              color: '#3b3024 !important',
            },
            h3: {
              color: '#3b3024 !important',
            },
            a: {
              color: '#8b642d !important',
            },
          },
        };
  
        rendition.themes.register(
          'reader-theme',
          themes[newTheme]
        );
  
        rendition.themes.select('reader-theme');
      },
      []
    );
  
    const applyFontSize = useCallback(
      (size: number) => {
        const rendition = renditionRef.current;
  
        if (!rendition) return;
  
        rendition.themes.fontSize(`${size}%`);
      },
      []
    );
  
    const increaseFont = useCallback(() => {
      setFontSize((current) => {
        const index = FONT_SIZES.indexOf(current);
  
        if (
          index === -1 ||
          index >= FONT_SIZES.length - 1
        ) {
          return current;
        }
  
        const next = FONT_SIZES[index + 1];
  
        applyFontSize(next);
  
        return next;
      });
    }, [applyFontSize]);
  
    const decreaseFont = useCallback(() => {
      setFontSize((current) => {
        const index = FONT_SIZES.indexOf(current);
  
        if (index <= 0) {
          return current;
        }
  
        const next = FONT_SIZES[index - 1];
  
        applyFontSize(next);
  
        return next;
      });
    }, [applyFontSize]);
  
    const resetFont = useCallback(() => {
      setFontSize(100);
      applyFontSize(100);
    }, [applyFontSize]);

    const protectRenderedContent = useCallback(() => {
      const reader = readerRef.current;

      if (!reader) return;

      const protectDocument = (doc: Document) => {
        const styleId = 'mv-reader-content-protection';

        if (!doc.getElementById(styleId)) {
          const style = doc.createElement('style');
          style.id = styleId;
          style.textContent = `
            html, body, body * {
              -webkit-user-select: none !important;
              user-select: none !important;
              -webkit-touch-callout: none !important;
            }

            html, body {
              cursor: default !important;
              overscroll-behavior: contain;
            }

            img, svg {
              -webkit-user-drag: none !important;
              user-drag: none !important;
              pointer-events: none !important;
            }

            ::selection {
              background: transparent !important;
            }
          `;
          doc.head?.appendChild(style);
        }

        const prevent = (event: Event) => event.preventDefault();
        const preventCopyKeys = (event: KeyboardEvent) => {
          const key = event.key.toLowerCase();

          if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x', 's', 'p'].includes(key)) {
            event.preventDefault();
            event.stopPropagation();
          }
        };

        doc.onselectstart = prevent;
        doc.oncopy = prevent;
        doc.oncut = prevent;
        doc.oncontextmenu = prevent;
        doc.ondragstart = prevent;
        doc.onkeydown = preventCopyKeys;
      };

      reader.querySelectorAll('iframe').forEach((frame) => {
        try {
          const doc = (frame as HTMLIFrameElement).contentDocument;
          if (doc) protectDocument(doc);
        } catch {
          // Alguns EPUBs podem usar conteúdo isolado; o CSS do tema ainda bloqueia seleção.
        }
      });
    }, []);
  
    const nextPage = useCallback(async () => {
      try {
        await renditionRef.current?.next();
      } catch {
        // Ignore navigation errors.
      }
    }, []);
  
    const previousPage = useCallback(async () => {
      try {
        await renditionRef.current?.prev();
      } catch {
        // Ignore navigation errors.
      }
    }, []);
  
    const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);

    const downloadEpub = useCallback(() => {
      triggerDownload(url, `${title}.epub`);
    }, [url, title]);
  
    const loadBook = useCallback(async () => {
      if (!readerRef.current) return;
  
      setLoading(true);
      setError(null);
      setProgress(0);
      setCurrentPage(null);
      setTotalPages(null);
  
      try {
        if (renditionRef.current) {
          try {
            renditionRef.current.destroy();
          } catch {
            // Ignore cleanup errors.
          }
        }
  
        if (bookRef.current) {
          try {
            bookRef.current.destroy();
          } catch {
            // Ignore cleanup errors.
          }
        }
  
        readerRef.current.innerHTML = '';
  
        const book = ePub(url);
  
        bookRef.current = book;
  
        const rendition = book.renderTo(
          readerRef.current,
          {
            width: '100%',
            height: '100%',
            spread: 'none',
            flow: 'paginated',
            manager: 'default',
          }
        );
  
        renditionRef.current = rendition;
  
        rendition.themes.default({
          body: {
            'font-family':
              'Georgia, "Times New Roman", serif !important',
            'line-height':
              '1.78 !important',
            'padding':
              'clamp(30px, 5vw, 64px) clamp(24px, 8vw, 110px) !important',
            'box-sizing':
              'border-box !important',
            'max-width':
              '980px !important',
            'margin':
              '0 auto !important',
            '-webkit-user-select':
              'none !important',
            'user-select':
              'none !important',
            '-webkit-touch-callout':
              'none !important',
            'text-rendering':
              'optimizeLegibility !important',
            '-webkit-font-smoothing':
              'antialiased !important',
          },
  
          p: {
            'line-height':
              '1.78 !important',
            'margin-bottom':
              '1.15em !important',
            'text-wrap':
              'pretty !important',
          },

          'h1, h2, h3, h4': {
            'line-height':
              '1.25 !important',
            'text-wrap':
              'balance !important',
          },

          'body *': {
            '-webkit-user-select':
              'none !important',
            'user-select':
              'none !important',
            '-webkit-touch-callout':
              'none !important',
          },
  
          img: {
            'max-width':
              '100% !important',
            'height':
              'auto !important',
            '-webkit-user-drag':
              'none !important',
            'user-select':
              'none !important',
          },

          '::selection': {
            'background':
              'transparent !important',
          },
        });
  
        rendition.themes.fontSize(
          `${fontSize}%`
        );
  
        applyTheme(theme);
  
        rendition.on(
          'relocated',
          (location: EpubLocation) => {
            const displayed =
              location?.start?.displayed;
  
            if (displayed) {
              setCurrentPage(
                displayed.page ?? null
              );
  
              setTotalPages(
                displayed.total ?? null
              );
            }
  
            const cfi =
              location?.start?.cfi;
  
            if (
              cfi &&
              book.locations?.length
            ) {
              const percentage =
                book.locations.percentageFromCfi(
                  cfi
                );
  
              if (
                typeof percentage === 'number'
              ) {
                setProgress(
                  Math.round(
                    percentage * 100
                  )
                );
              }
            }
          }
        );
  
        rendition.on(
          'rendered',
          () => {
            protectRenderedContent();
            window.requestAnimationFrame(protectRenderedContent);
            setLoading(false);
          }
        );
  
        const navigation = await book.loaded.navigation;
  
        if (navigation?.toc) {
          setToc(navigation.toc);
        }
  
        await book.ready;
  
        try {
          await book.locations.generate(1024);
        } catch (locationError) {
          console.warn(
            'Não foi possível gerar as localizações do EPUB.',
            locationError
          );
        }
  
        await rendition.display();
  
        setLoading(false);
      } catch (err) {
        console.error(
          'Erro ao abrir EPUB:',
          err
        );
  
        setLoading(false);
  
        setError(
          'Não foi possível abrir este EPUB. O arquivo pode estar corrompido, protegido ou o endereço pode estar indisponível.'
        );
      }
    }, [
      url,
      theme,
      fontSize,
      applyTheme,
      protectRenderedContent,
    ]);
  
    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadBook();

      return () => {
        try {
          renditionRef.current?.destroy?.();
        } catch {
          // Ignore.
        }

        try {
          bookRef.current?.destroy();
        } catch {
          // Ignore.
        }

        renditionRef.current = null;
        bookRef.current = null;
      };
    }, [loadBook]);
  
    useEffect(() => {
      applyTheme(theme);
    }, [theme, applyTheme]);
  
    useEffect(() => {
      applyFontSize(fontSize);
    }, [fontSize, applyFontSize]);
  
    const { visible: showControls, wake: wakeControls } =
      useAutoHideControls({
        suspended: loading || Boolean(error) || showSettings || showToc,
      });

    const entranceClass = useEntranceTransition();

    useBodyScrollLock();

    useEffect(() => {
      const handleKeyboard = (
        event: KeyboardEvent
      ) => {
        const target =
          event.target as HTMLElement | null;
  
        if (
          target?.tagName === 'INPUT' ||
          target?.tagName === 'TEXTAREA' ||
          target?.isContentEditable
        ) {
          return;
        }
  
        switch (event.key) {
          case 'ArrowRight':
          case 'PageDown':
          case ' ':
            event.preventDefault();
            void nextPage();
            break;
  
          case 'ArrowLeft':
          case 'PageUp':
            event.preventDefault();
            void previousPage();
            break;
  
          case 'Escape':
            if (showSettings) {
              setShowSettings(false);
              return;
            }
  
            if (showToc) {
              setShowToc(false);
              return;
            }
  
            if (document.fullscreenElement) {
              void document.exitFullscreen();
            } else {
              onClose();
            }
            break;
  
          case '+':
          case '=':
            event.preventDefault();
            increaseFont();
            break;
  
          case '-':
          case '_':
            event.preventDefault();
            decreaseFont();
            break;
  
          case '0':
            event.preventDefault();
            resetFont();
            break;
  
          case 'f':
          case 'F':
            event.preventDefault();
            void toggleFullscreen();
            break;
  
          case 't':
          case 'T':
            event.preventDefault();
            setShowToc((value) => !value);
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
      nextPage,
      previousPage,
      increaseFont,
      decreaseFont,
      resetFont,
      toggleFullscreen,
      onClose,
      showSettings,
      showToc,
    ]);

    const { onTouchStart: handleTouchStart, onTouchEnd: handleTouchEnd } =
      useSwipeNavigation({
        onNext: () => void nextPage(),
        onPrev: () => void previousPage(),
      });

    return (
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Leitor de ${title}`}
        className={`
          fixed inset-0
          z-[200]
          flex flex-col
          bg-[var(--bg)]
          overflow-hidden
          select-none
          transition-[opacity,transform]
          duration-300 ease-out
          ${entranceClass}
        `}
        onTouchStart={(event) => {
          handleTouchStart(event);
          wakeControls();
        }}
        onTouchEnd={handleTouchEnd}
        onMouseMove={wakeControls}
        onContextMenu={(event) => event.preventDefault()}
        onDragStart={(event) => event.preventDefault()}
        onCopy={(event) => event.preventDefault()}
        onCut={(event) => event.preventDefault()}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            wakeControls();
          }
        }}
      >
        {/* ================================================================
            HEADER
        ================================================================= */}
        {!loading && !error && (
          <header
            aria-hidden={!showControls}
            className={`
              relative
              z-30
              flex items-center gap-2
              px-3 sm:px-5
              py-2
              min-h-[58px]
              bg-[var(--bg-2)]/92
              backdrop-blur-xl
              border-b border-[var(--border)]
              shadow-[0_10px_35px_rgba(0,0,0,0.18)]
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
              type="button"
              onClick={onClose}
              className="
                icon-btn
                w-9 h-9
                flex-shrink-0
              "
              aria-label="Fechar leitor"
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
  
            {/* Capa */}
            <div
              className="
                flex-shrink-0
                w-8 h-11
                flex items-center
                justify-center
                overflow-hidden
                rounded
                bg-[var(--bg-3)]
              "
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt=""
                  className="
                    w-full h-full
                    object-cover
                  "
                />
              ) : (
                <BookOpen
                  className="
                    w-4 h-4
                    text-[var(--gold)]
                  "
                />
              )}
            </div>
  
            {/* Informações */}
            <div className="min-w-0 flex-1">
              <h1
                className="
                  font-serif
                  text-sm
                  font-medium
                  text-[var(--text)]
                  truncate
                "
              >
                {title}
              </h1>
  
              <p
                className="
                  text-[11px]
                  text-[var(--text-muted)]
                  truncate
                "
              >
                {author || 'Autor desconhecido'}
              </p>
            </div>
  
            {/* Progresso */}
            <div
              className="
                hidden sm:flex
                flex-col
                items-end
                min-w-[70px]
              "
            >
              <span
                className="
                  text-xs
                  font-medium
                  text-[var(--text)]
                "
              >
                {progress}%
              </span>
  
              {currentPage &&
                totalPages && (
                  <span
                    className="
                      text-[10px]
                      text-[var(--text-muted)]
                    "
                  >
                    {currentPage} / {totalPages}
                  </span>
                )}
            </div>
  
            {/* Controles */}
            <div
              className="
                flex items-center gap-1
                bg-[var(--bg-3)]
                rounded-xl
                p-1
              "
            >
              {/* Sumário */}
              {toc.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setShowToc(
                      (value) => !value
                    )
                  }
                  className={`
                    icon-btn
                    w-8 h-8
                    ${
                      showToc
                        ? 'text-[var(--gold)] bg-[var(--gold-glow)]'
                        : ''
                    }
                  `}
                  aria-label="Sumário"
                  title="Sumário (T)"
                >
                  <List className="w-4 h-4" />
                </button>
              )}
  
              {/* Configurações */}
              <button
                type="button"
                onClick={() =>
                  setShowSettings(
                    (value) => !value
                  )
                }
                className={`
                  icon-btn
                  w-8 h-8
                  ${
                    showSettings
                      ? 'text-[var(--gold)] bg-[var(--gold-glow)]'
                      : ''
                  }
                `}
                aria-label="Configurações de leitura"
                title="Configurações"
              >
                <BookOpen className="w-4 h-4" />
              </button>
  
              {/* Download */}
              <button
                type="button"
                onClick={downloadEpub}
                className="
                  icon-btn
                  w-8 h-8
                "
                aria-label="Baixar EPUB"
                title="Baixar EPUB"
              >
                <Download className="w-4 h-4" />
              </button>
  
              {/* Fullscreen */}
              <button
                type="button"
                onClick={() =>
                  void toggleFullscreen()
                }
                className="
                  icon-btn
                  w-8 h-8
                "
                aria-label={
                  isFullscreen
                    ? 'Sair da tela cheia'
                    : 'Tela cheia'
                }
                title={
                  isFullscreen
                    ? 'Sair da tela cheia'
                    : 'Tela cheia (F)'
                }
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            </div>
          </header>
        )}
  
        {/* ================================================================
            ÁREA PRINCIPAL
        ================================================================= */}
        <main
          className="
            relative
            flex-1
            min-h-0
            overflow-hidden
            bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.07),transparent_34%),var(--bg)]
          "
        >
          <div
            className="
              absolute inset-0
              pointer-events-none
              opacity-40
              bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.025),transparent)]
            "
          />

          <div
            ref={readerRef}
            className="
              relative z-[1]
              h-full
              w-full
              overflow-hidden
              select-none
            "
            aria-label="Conteúdo do livro — modo somente leitura"
          />

          {/*
            O EPUB é exibido dentro de um iframe. Esta camada transparente,
            ativa somente em telas de toque, garante que o gesto horizontal
            chegue ao leitor sem colocar botões sobre o texto.
          */}
          {!loading && !error && (
            <div
              className="
                absolute inset-0
                z-[5]
                md:hidden
                touch-pan-y
              "
              aria-hidden="true"
              onClick={wakeControls}
            />
          )}
  
          {/* ============================================================
              LOADING
          ============================================================= */}
          {loading && (
            <div
              className="
                absolute
                inset-0
                z-20
                flex flex-col
                items-center
                justify-center
                gap-4
                bg-[var(--bg)]
              "
            >
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt=""
                  className="
                    w-28
                    max-h-40
                    object-cover
                    rounded-lg
                    shadow-2xl
                    opacity-70
                  "
                />
              )}
  
              <Loader2
                className="
                  w-9 h-9
                  text-[var(--gold)]
                  animate-spin
                "
              />
  
              <div className="text-center">
                <p
                  className="
                    text-sm
                    text-[var(--text)]
                  "
                >
                  Abrindo livro…
                </p>
  
                <p
                  className="
                    text-xs
                    text-[var(--text-muted)]
                    mt-1
                  "
                >
                  Preparando o conteúdo
                </p>
              </div>
            </div>
          )}
  
          {/* ============================================================
              ERRO
          ============================================================= */}
          {!loading && error && (
            <div
              className="
                absolute inset-0
                z-20
                flex flex-col
                items-center
                justify-center
                gap-5
                p-8
                bg-[var(--bg)]
                text-center
              "
            >
              <div
                className="
                  w-16 h-16
                  rounded-2xl
                  bg-red-500/10
                  flex items-center
                  justify-center
                "
              >
                <BookOpen
                  className="
                    w-8 h-8
                    text-red-400
                  "
                />
              </div>
  
              <div>
                <h2
                  className="
                    text-base
                    font-semibold
                    text-[var(--text)]
                    mb-2
                  "
                >
                  Não foi possível abrir o livro
                </h2>
  
                <p
                  className="
                    max-w-md
                    text-sm
                    text-[var(--text-muted)]
                  "
                >
                  {error}
                </p>
              </div>
  
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void loadBook()
                  }
                  className="
                    flex items-center
                    gap-2
                    px-4 py-2
                    rounded-lg
                    bg-[var(--gold)]
                    text-[var(--bg)]
                    text-sm
                    font-medium
                    hover:brightness-110
                    transition
                  "
                >
                  <RotateCcw className="w-4 h-4" />
                  Tentar novamente
                </button>
  
                <button
                  type="button"
                  onClick={onClose}
                  className="
                    px-4 py-2
                    rounded-lg
                    bg-[var(--bg-3)]
                    border
                    border-[var(--border)]
                    text-[var(--text)]
                    text-sm
                    hover:bg-[var(--bg-4)]
                    transition
                  "
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
  
          {/* ============================================================
              NAVEGAÇÃO LATERAL
          ============================================================ */}
          {!loading && !error && (
            <>
              <button
                type="button"
                onClick={() =>
                  void previousPage()
                }
                className="
                  absolute
                  left-0 top-0 bottom-0
                  z-10
                  hidden md:block
                  w-[clamp(52px,7vw,92px)]
                  opacity-0
                  focus-visible:opacity-100
                  focus-visible:outline
                  focus-visible:outline-2
                  focus-visible:outline-[var(--gold)]
                  focus-visible:outline-offset-[-3px]
                  transition-opacity duration-200
                "
                aria-label="Página anterior"
                title="Página anterior"
              />
  
              <button
                type="button"
                onClick={() =>
                  void nextPage()
                }
                className="
                  absolute
                  right-0 top-0 bottom-0
                  z-10
                  hidden md:block
                  w-[clamp(52px,7vw,92px)]
                  opacity-0
                  focus-visible:opacity-100
                  focus-visible:outline
                  focus-visible:outline-2
                  focus-visible:outline-[var(--gold)]
                  focus-visible:outline-offset-[-3px]
                  transition-opacity duration-200
                "
                aria-label="Próxima página"
                title="Próxima página"
              />
            </>
          )}
  
          {/* ============================================================
              PAINEL DE CONFIGURAÇÕES
          ============================================================= */}
          {showSettings && (
            <div
              className="
                absolute
                top-3
                right-3
                z-30
                w-[280px]
                rounded-2xl
                border
                border-[var(--border)]
                bg-[var(--bg-2)]/95
                backdrop-blur-xl
                shadow-2xl
                p-4
              "
            >
              <div
                className="
                  flex items-center
                  justify-between
                  mb-4
                "
              >
                <h3
                  className="
                    text-sm
                    font-semibold
                    text-[var(--text)]
                  "
                >
                  Configurações
                </h3>
  
                <button
                  type="button"
                  onClick={() =>
                    setShowSettings(false)
                  }
                  className="
                    icon-btn
                    w-7 h-7
                  "
                  aria-label="Fechar configurações"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
  
              {/* Tamanho da fonte */}
              <div className="mb-5">
                <p
                  className="
                    text-xs
                    font-medium
                    text-[var(--text-muted)]
                    mb-2
                  "
                >
                  Tamanho do texto
                </p>
  
                <div
                  className="
                    flex items-center
                    gap-2
                    rounded-xl
                    bg-[var(--bg-3)]
                    p-1
                  "
                >
                  <button
                    type="button"
                    onClick={decreaseFont}
                    className="
                      icon-btn
                      w-9 h-9
                    "
                    aria-label="Diminuir fonte"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
  
                  <button
                    type="button"
                    onClick={resetFont}
                    className="
                      flex-1
                      text-xs
                      text-[var(--text)]
                    "
                  >
                    {fontSize}%
                  </button>
  
                  <button
                    type="button"
                    onClick={increaseFont}
                    className="
                      icon-btn
                      w-9 h-9
                    "
                    aria-label="Aumentar fonte"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
  
              {/* Tema */}
              <div>
                <p
                  className="
                    text-xs
                    font-medium
                    text-[var(--text-muted)]
                    mb-2
                  "
                >
                  Tema de leitura
                </p>
  
                <div
                  className="
                    grid grid-cols-3
                    gap-2
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      setTheme('light')
                    }
                    className={`
                      flex flex-col
                      items-center
                      gap-1
                      p-3
                      rounded-xl
                      border
                      transition
                      ${
                        theme === 'light'
                          ? 'border-[var(--gold)] bg-white text-black'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                      }
                    `}
                  >
                    <Sun className="w-4 h-4" />
                    <span className="text-[10px]">
                      Claro
                    </span>
                  </button>
  
                  <button
                    type="button"
                    onClick={() =>
                      setTheme('sepia')
                    }
                    className={`
                      flex flex-col
                      items-center
                      gap-1
                      p-3
                      rounded-xl
                      border
                      transition
                      ${
                        theme === 'sepia'
                          ? 'border-[var(--gold)] bg-[#f4ecd8] text-[#4b4032]'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                      }
                    `}
                  >
                    <Coffee className="w-4 h-4" />
                    <span className="text-[10px]">
                      Sépia
                    </span>
                  </button>
  
                  <button
                    type="button"
                    onClick={() =>
                      setTheme('dark')
                    }
                    className={`
                      flex flex-col
                      items-center
                      gap-1
                      p-3
                      rounded-xl
                      border
                      transition
                      ${
                        theme === 'dark'
                          ? 'border-[var(--gold)] bg-[#151515] text-white'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                      }
                    `}
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-[10px]">
                      Escuro
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
  
          {/* ============================================================
              SUMÁRIO
          ============================================================= */}
          {showToc && toc.length > 0 && (
            <aside
              className="
                absolute
                left-0
                top-0
                bottom-0
                z-40
                w-[300px]
                max-w-[85vw]
                bg-[var(--bg-2)]
                border-r
                border-[var(--border)]
                shadow-2xl
                overflow-y-auto
              "
            >
              <div
                className="
                  sticky
                  top-0
                  z-10
                  flex items-center
                  justify-between
                  px-4 py-3
                  bg-[var(--bg-2)]
                  border-b
                  border-[var(--border)]
                "
              >
                <h2
                  className="
                    text-sm
                    font-semibold
                    text-[var(--text)]
                  "
                >
                  Sumário
                </h2>
  
                <button
                  type="button"
                  onClick={() =>
                    setShowToc(false)
                  }
                  className="
                    icon-btn
                    w-8 h-8
                  "
                  aria-label="Fechar sumário"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
  
              <nav className="p-2">
                {toc.map(
                  (item, index) => (
                    <button
                      key={
                        item.id ??
                        item.href ??
                        index
                      }
                      type="button"
                      onClick={async () => {
                        try {
                          await renditionRef.current?.display(
                            item.href
                          );
  
                          setShowToc(false);
                        } catch (err) {
                          console.warn(
                            'Não foi possível abrir o capítulo.',
                            err
                          );
                        }
                      }}
                      className="
                        w-full
                        text-left
                        px-3 py-2.5
                        rounded-lg
                        text-sm
                        text-[var(--text-sub)]
                        hover:text-[var(--gold)]
                        hover:bg-[var(--gold-glow)]
                        transition-colors
                      "
                    >
                      {item.label}
                    </button>
                  )
                )}
              </nav>
            </aside>
          )}
        </main>
  
        {/* ================================================================
            FOOTER
        ================================================================= */}
        {!loading && !error && (
          <footer
            aria-hidden={!showControls}
            className={`
              flex items-center
              justify-center
              gap-4
              min-h-[42px]
              px-4
              bg-[var(--bg-2)]/92
              backdrop-blur-xl
              border-t border-[var(--border)]
              transition-[opacity,transform]
              duration-300 ease-out
              ${
                showControls
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-3 pointer-events-none'
              }
            `}
          >
            <button
              type="button"
              onClick={() =>
                void previousPage()
              }
              className="
                md:hidden
                icon-btn
                w-8 h-8
              "
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
  
            <div
              className="
                flex items-center
                gap-3
                min-w-[180px]
              "
            >
              <div
                className="
                  flex-1
                  h-1
                  rounded-full
                  bg-[var(--bg-4)]
                  overflow-hidden
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-[var(--gold)]
                    transition-all
                    duration-300
                  "
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
  
              <span
                className="
                  text-[10px]
                  text-[var(--text-muted)]
                  min-w-[32px]
                  text-right
                "
              >
                {progress}%
              </span>
            </div>
  
            <button
              type="button"
              onClick={() =>
                void nextPage()
              }
              className="
                md:hidden
                icon-btn
                w-8 h-8
              "
              aria-label="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        )}
      </div>
    );
  }
