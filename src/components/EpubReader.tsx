import {
    useCallback,
    useEffect,
    useRef,
    useState,
  } from 'react';
  
  import ePub from 'epubjs';
  
  import {
    BookOpen,
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    X,
    Maximize,
    Minimize,
    MonitorDown,
    RotateCw,
    ZoomIn,
    ZoomOut,
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
  
  const ZOOM_LEVELS = [
    50, 60, 75, 90, 100, 110, 125, 150, 165, 175, 200, 250, 300, 350, 400,
  ];
  
  export function EpubReader({
    url,
    title,
    author,
    coverUrl,
    onClose,
  }: EpubReaderProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLElement>(null);
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
      spread?: (value: 'none' | 'auto' | 'always') => void;
      flow?: (value: 'paginated' | 'scrolled') => void;
      on: (event: string, handler: (location?: EpubLocation) => void) => void;
      display: () => Promise<void>;
      next: () => Promise<void>;
      prev: () => Promise<void>;
    };
    const renditionRef = useRef<RenditionLike | null>(null);
  
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    const [fontSize, setFontSize] = useState(100);
    const fontSizeRef = useRef(100);
    const [zoomMode, setZoomMode] = useState<'fit' | 'manual'>('fit');
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const [rotation, setRotation] = useState(0);
  
    const [progress, setProgress] = useState(0);
  
    const [currentPage, setCurrentPage] =
      useState<number | null>(null);
  
    const [totalPages, setTotalPages] =
      useState<number | null>(null);
  
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

        fontSizeRef.current = size;
        rendition.themes.fontSize(`${size}%`);
        rendition.themes.default({
          body: {
            'font-size': `${size}% !important`,
          },
        });

        // Alguns EPUBs trazem regras próprias com !important. Reaplicamos o
        // tamanho diretamente nos documentos já renderizados para garantir
        // que o zoom também funcione nesses arquivos.
        readerRef.current?.querySelectorAll('iframe').forEach((frame) => {
          const doc = (frame as HTMLIFrameElement).contentDocument;
          if (!doc) return;
          let style = doc.getElementById('mv-epub-zoom') as HTMLStyleElement | null;
          if (!style) {
            style = doc.createElement('style');
            style.id = 'mv-epub-zoom';
            doc.head?.appendChild(style);
          }
          style.textContent = `html { font-size: ${size}% !important; } body { font-size: ${size}% !important; }`;
        });
      },
      []
    );
  
    const increaseFont = useCallback(() => {
      setFontSize((current) => {
        const index = ZOOM_LEVELS.indexOf(current);
  
        if (
          index === -1 ||
          index >= ZOOM_LEVELS.length - 1
        ) {
          return current;
        }
  
        const next = ZOOM_LEVELS[index + 1];
  
        applyFontSize(next);
        setZoomMode('manual');
  
        return next;
      });
    }, [applyFontSize]);
  
    const decreaseFont = useCallback(() => {
      setFontSize((current) => {
        const index = ZOOM_LEVELS.indexOf(current);
  
        if (index <= 0) {
          return current;
        }
  
        const next = ZOOM_LEVELS[index - 1];
  
        applyFontSize(next);
        setZoomMode('manual');
  
        return next;
      });
    }, [applyFontSize]);
  
    const resetFont = useCallback(() => {
      setFontSize(100);
      setZoomMode('fit');
      applyFontSize(100);
    }, [applyFontSize]);

    const setManualZoom = useCallback((value: number) => {
      const next = Math.max(50, Math.min(400, value));
      setZoomMode('manual');
      setFontSize(next);
      applyFontSize(next);
    }, [applyFontSize]);

    const zoomPercentage = `${fontSize}%`;

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
        if (!renditionRef.current) return;
        await renditionRef.current.next();
      } catch {
        // Ignore navigation errors.
      }
    }, []);
  
    const previousPage = useCallback(async () => {
      try {
        if (!renditionRef.current) return;
        await renditionRef.current.prev();
      } catch {
        // Ignore navigation errors.
      }
    }, []);
  
    const { isFullscreen, toggleFullscreen } = useFullscreen(rootRef);

    const fitToScreen = useCallback(() => {
      resetFont();
      contentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, [resetFont]);

    const zoomIn = useCallback(() => {
      const next = ZOOM_LEVELS.find(level => level > fontSize) ?? 400;
      setManualZoom(next);
    }, [fontSize, setManualZoom]);

    const zoomOut = useCallback(() => {
      const next = [...ZOOM_LEVELS].reverse().find(level => level < fontSize) ?? 50;
      setManualZoom(next);
    }, [fontSize, setManualZoom]);

    const rotateContent = useCallback(() => {
      setRotation(current => (current + 90) % 360);
    }, []);

    const downloadEpub = useCallback(() => {
      triggerDownload(url, `${title}.epub`);
    }, [url, title]);

    useEffect(() => {
      const element = contentRef.current;
      if (!element) return;

      const handleWheel = (event: WheelEvent) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        if (event.deltaY < 0) zoomIn();
        else zoomOut();
      };

      element.addEventListener('wheel', handleWheel, { passive: false });
      return () => element.removeEventListener('wheel', handleWheel);
    }, [zoomIn, zoomOut]);

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
  
        const response = await fetch(url, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`EPUB indisponível (${response.status})`);
        }

        const epubData = await response.arrayBuffer();
        const book = ePub(epubData);
  
        bookRef.current = book;
  
        const rendition = book.renderTo(
          readerRef.current,
          {
            width: '100%',
            height: '100%',
            spread: 'none',
            minSpreadWidth: 0,
            flow: 'paginated',
            manager: 'default',
            resizeOnOrientationChange: true,
          }
        );
  
        renditionRef.current = rendition;
        rendition.spread?.('none');
        rendition.flow?.('paginated');
  
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
            'width':
              '100% !important',
            'min-height':
              '100% !important',
            'overflow-x':
              'hidden !important',
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
  
        rendition.themes.fontSize('100%');
  
        applyTheme('light');
  
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
            applyFontSize(fontSizeRef.current);
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

        // A primeira página não deve depender da geração das localizações.
        // Em EPUBs grandes essa operação pode levar bastante tempo (ou falhar
        // em arquivos com estrutura incomum), deixando o leitor preso no loading.
        await rendition.display();
        rendition.spread?.('none');
        rendition.flow?.('paginated');
        rendition.themes.fontSize(`${fontSizeRef.current}%`);
        setLoading(false);

        // O progresso é auxiliar: calcule-o depois que o conteúdo já estiver
        // disponível para leitura.
        void book.locations.generate(1024).catch((locationError) => {
          console.warn(
            'Não foi possível gerar as localizações do EPUB.',
            locationError
          );
        });
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
      applyTheme,
      protectRenderedContent,
    ]);
  
    useEffect(() => {
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
      applyFontSize(fontSize);
    }, [fontSize, applyFontSize]);
  
    const { visible: showControls, wake: wakeControls } =
      useAutoHideControls({
        suspended: loading || Boolean(error) || showToc,
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
            if (showZoomMenu) {
              setShowZoomMenu(false);
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
            fitToScreen();
            break;

          case 'r':
          case 'R':
            event.preventDefault();
            rotateContent();
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
      fitToScreen,
      rotateContent,
      toggleFullscreen,
      onClose,
      showZoomMenu,
      showToc,
      zoomIn,
      zoomOut,
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

            <div
              className="
                hidden sm:flex items-center gap-1
                rounded-xl bg-[var(--bg-3)]
                border border-[var(--border)] p-1
              "
            >
              <button
                type="button"
                onClick={fitToScreen}
                className={`icon-btn w-8 h-8 ${zoomMode === 'fit' ? 'text-[var(--gold)] bg-[var(--gold-glow)]' : ''}`}
                aria-label="Ajustar à tela"
                title="Ajustar à tela (0)"
              >
                <MonitorDown className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={decreaseFont}
                disabled={fontSize <= ZOOM_LEVELS[0]}
                className="icon-btn w-8 h-8 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Diminuir zoom"
                title="Diminuir zoom (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowZoomMenu(value => !value)}
                className="min-w-[58px] h-8 px-2 rounded-lg text-xs font-semibold text-[var(--text)] hover:bg-[var(--gold-glow)] transition-colors"
                aria-label={`Zoom atual ${fontSize}%`}
                title="Selecionar zoom"
              >
                {fontSize}%
              </button>

              <button
                type="button"
                onClick={increaseFont}
                disabled={fontSize >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                className="icon-btn w-8 h-8 disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Aumentar zoom"
                title="Aumentar zoom (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {showZoomMenu && (
              <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-44 p-2 rounded-2xl bg-[var(--bg-2)] border border-[var(--border)] shadow-2xl">
                <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Nível de zoom</p>
                <div className="grid grid-cols-2 gap-1">
                  {ZOOM_LEVELS.map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        setManualZoom(level);
                        setShowZoomMenu(false);
                      }}
                      className={`px-2 py-2 rounded-lg text-xs transition-colors ${fontSize === level ? 'bg-[var(--gold-glow)] text-[var(--gold)]' : 'text-[var(--text-sub)] hover:bg-[var(--bg-3)]'}`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="hidden md:flex items-center gap-1 rounded-xl bg-[var(--bg-3)] border border-[var(--border)] p-1">
              <button
                type="button"
                onClick={() => void previousPage()}
                className="icon-btn w-8 h-8"
                aria-label="Página anterior"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[58px] text-center text-xs font-medium text-[var(--text)]">
                {currentPage && totalPages ? `${currentPage} / ${totalPages}` : '— / —'}
              </span>
              <button
                type="button"
                onClick={() => void nextPage()}
                className="icon-btn w-8 h-8"
                aria-label="Próxima página"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
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

              <button
                type="button"
                onClick={rotateContent}
                className="icon-btn w-8 h-8"
                aria-label="Rotacionar conteúdo"
                title="Rotacionar conteúdo (R)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={downloadEpub}
                className="icon-btn w-8 h-8"
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
          ref={contentRef}
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
              transition-transform duration-300
            "
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
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
                icon-btn
                w-9 h-9
              "
              aria-label="Página anterior"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex sm:hidden items-center gap-1 rounded-xl bg-[var(--bg-3)] border border-[var(--border)] p-1">
              <button
                type="button"
                onClick={zoomOut}
                className="icon-btn w-8 h-8"
                aria-label="Diminuir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={fitToScreen}
                className="min-w-[48px] h-8 px-1 rounded-lg text-[10px] font-semibold text-[var(--text)]"
                aria-label={`Zoom atual ${zoomPercentage}`}
              >
                {zoomPercentage}
              </button>
              <button
                type="button"
                onClick={zoomIn}
                className="icon-btn w-8 h-8"
                aria-label="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
  
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
                icon-btn
                w-9 h-9
              "
              aria-label="Próxima página"
              title="Próxima página"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        )}
      </div>
    );
  }
