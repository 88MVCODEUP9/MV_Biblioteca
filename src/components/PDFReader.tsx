import { useState, useEffect, useRef } from 'react';
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
  Settings
} from 'lucide-react';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
}

interface PDFReaderProps {
  url: string;
  title: string;
  author: string;
  coverUrl?: string;
  onClose: () => void;
}

export function PDFReader({ url, title, author, coverUrl, onClose }: PDFReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [highQuality, setHighQuality] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [mouseStart, setMouseStart] = useState<number | null>(null);

  // Device detection and responsive setup
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [pageNumber, numPages, isFullscreen]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    
    // Verificar se é erro de CORS
    if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
      setError('Erro de CORS: O PDF não pode ser carregado de outra origem. Tente fazer o download do arquivo.');
    } 
    // Verificar se é erro de rede
    else if (error.message.includes('network') || error.message.includes('fetch')) {
      setError('Erro de rede: Verifique sua conexão ou se o link do PDF está acessível.');
    }
    // Verificar se o arquivo não é um PDF válido
    else if (error.message.includes('Invalid PDF')) {
      setError('Arquivo inválido: O link não aponta para um PDF válido.');
    }
    // Erro genérico
    else {
      setError('Erro ao carregar o PDF. Verifique se o arquivo é acessível.');
    }
    
    setIsLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.pdf`;
    link.target = '_blank';
    link.click();
  };

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextPage();
    }
    if (isRightSwipe) {
      goToPrevPage();
    }
  };

  // Auto-scale calculation
  useEffect(() => {
    if (!autoScale || !containerRef.current || numPages === 0) return;

    const calculateOptimalScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth - 16; // Minimal padding
      const containerHeight = container.clientHeight - 16; // Minimal padding
      
      // Base dimensions for PDF pages (A4 ratio)
      const pageWidth = 595; // Standard PDF width in points
      const pageHeight = 842; // Standard PDF height in points
      
      let scaleX = containerWidth / pageWidth;
      let scaleY = containerHeight / pageHeight;
      
      // Adjust scale based on detected device type
      if (deviceType === 'mobile') {
        // For mobile, prioritize width and add some padding
        scaleX = (containerWidth / pageWidth) * 1.8;
        scaleY = (containerHeight / pageHeight) * 1.2;
      } else if (deviceType === 'tablet') {
        // For tablet, balanced approach
        scaleX = (containerWidth / pageWidth) * 1.6;
        scaleY = (containerHeight / pageHeight) * 1.4;
      } else {
        // For desktop, use full available space
        scaleX = containerWidth / pageWidth;
        scaleY = containerHeight / pageHeight;
      }
      
      const optimalScale = Math.min(scaleX, scaleY);
      const finalScale = Math.max(0.6, Math.min(optimalScale, 2.5)); // Clamp between 0.6 and 2.5
      
      setScale(finalScale);
    };

    // Initial calculation
    const timer = setTimeout(calculateOptimalScale, 100);
    
    // Add resize listener with debounce
    const handleResize = () => {
      clearTimeout(timer);
      setTimeout(calculateOptimalScale, 150);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [autoScale, numPages, deviceType]);

  // Mouse drag handlers for desktop
  const onMouseDown = (e: React.MouseEvent) => {
    setMouseStart(e.clientX);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!mouseStart) return;
    
    const distance = mouseStart - e.clientX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNextPage();
    }
    if (isRightSwipe) {
      goToPrevPage();
    }
    
    setMouseStart(null);
  };

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 z-[1000] flex flex-col bg-[#0a0a0c] ${isFullscreen ? '' : ''}`}
      style={{
        imageRendering: highQuality ? 'crisp-edges' : 'auto'
      }}
    >
      {/* Header - Responsive Layout */}
      <header className={`flex items-center px-4 py-3 bg-[var(--bg-2)] border-b border-[var(--border)] flex-shrink-0 ${
        deviceType === 'mobile' ? 'gap-2' : deviceType === 'tablet' ? 'gap-3' : 'gap-4'
      }`}>
        {/* Cover and Title - Responsive */}
        {deviceType !== 'mobile' && coverUrl && (
          <img
            src={coverUrl}
            alt={title}
            className={`${deviceType === 'tablet' ? 'w-8 h-11' : 'w-10 h-14'} object-cover rounded shadow-lg`}
          />
        )}
        <div className={`min-w-0 ${deviceType === 'mobile' ? 'flex-1' : ''}`}>
          <h1 className={`font-semibold text-[var(--text)] truncate ${
            deviceType === 'mobile' ? 'text-sm' : deviceType === 'tablet' ? 'text-base' : 'text-lg'
          }`}>
            {deviceType === 'mobile' ? title.split(' ').slice(0, 3).join(' ') + (title.split(' ').length > 3 ? '...' : '') : title}
          </h1>
          {deviceType !== 'mobile' && (
            <p className="text-xs text-[var(--text-muted)]">{author}</p>
          )}
        </div>

        {/* Controls - Responsive */}
        <div className={`flex items-center ${
          deviceType === 'mobile' ? 'gap-1' : deviceType === 'tablet' ? 'gap-2' : 'gap-2'
        }`}>
          {/* Zoom controls - Show based on device */}
          {(deviceType === 'desktop' || deviceType === 'tablet') && (
            <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-3)] rounded-lg p-1">
              <button
                onClick={() => setHighQuality(!highQuality)}
                className={`p-2 transition-all ${
                  highQuality 
                    ? 'text-[var(--gold)] bg-[var(--gold-glow)]' 
                    : 'text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)]'
                }`}
                title={highQuality ? "Alta qualidade ativada" : "Ativar alta qualidade"}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAutoScale(!autoScale)}
                className={`p-2 transition-all ${
                  autoScale 
                    ? 'text-[var(--gold)] bg-[var(--gold-glow)]' 
                    : 'text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)]'
                }`}
                title={autoScale ? "Zoom automático ativado" : "Ativar zoom automático"}
              >
                <Maximize className="w-4 h-4" />
              </button>
              <button
                onClick={zoomOut}
                disabled={autoScale}
                className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)] rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Diminuir zoom (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-[var(--text-muted)] w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={zoomIn}
                disabled={autoScale}
                className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)] rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Aumentar zoom (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Page navigation - Responsive */}
          {(deviceType === 'desktop' || (deviceType === 'tablet' && window.innerWidth > 900)) && (
            <div className="hidden md:flex items-center gap-2 bg-[var(--bg-3)] rounded-lg px-3 py-1.5">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="p-1 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-[var(--text)] min-w-[80px] text-center">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="p-1 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Action buttons - Responsive */}
          <button
            onClick={rotate}
            className={`text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)] rounded-lg transition-all ${
              deviceType === 'mobile' ? 'p-1.5' : 'p-2.5'
            }`}
            title="Rotacionar"
          >
            <RotateCw className={`${deviceType === 'mobile' ? 'w-3 h-3' : 'w-4 h-4'}`} />
          </button>

          {deviceType !== 'mobile' && (
            <button
              onClick={downloadPDF}
              className="p-2.5 text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)] rounded-lg transition-all"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className={`text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)] rounded-lg transition-all ${
              deviceType === 'mobile' ? 'p-1.5' : 'p-2.5'
            }`}
            title={isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}
          >
            {isFullscreen ? <Minimize className={`${deviceType === 'mobile' ? 'w-3 h-3' : 'w-4 h-4'}`} /> : <Maximize className={`${deviceType === 'mobile' ? 'w-3 h-3' : 'w-4 h-4'}`} />}
          </button>

          {deviceType !== 'mobile' && <div className="w-px h-6 bg-[var(--border)] mx-1" />}

          <button
            onClick={onClose}
            className={`text-[var(--text-sub)] hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all ${
              deviceType === 'mobile' ? 'p-1.5' : 'p-2.5'
            }`}
            title="Fechar (Esc)"
          >
            <X className={`${deviceType === 'mobile' ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
        </div>
      </header>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-[#1a1a1f] relative" ref={containerRef}>
        {/* Gesture hint */}
        {!isLoading && !error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
            <div className="bg-[var(--bg-2)]/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-[var(--text-muted)] border border-[var(--border)]">
              <span className="hidden sm:inline">Deslize para os lados ou use as setas para navegar</span>
              <span className="sm:hidden">Deslize para navegar</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="loading-ring" />
            <p className="text-sm text-[var(--text-muted)]">Carregando PDF...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-[var(--text)] text-center">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => window.open(url, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Abrir em nova aba
              </button>
              <button
                onClick={downloadPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Baixar PDF
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[var(--gold)] text-[var(--bg)] rounded-lg text-sm font-medium hover:bg-[#d6bc80] transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        <div className={`min-h-full ${autoScale ? 'flex items-center justify-center p-2' : 'flex items-start justify-center p-2'}`}>
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className="shadow-2xl"
            error={<div className="text-red-400 p-8">Falha ao carregar o documento</div>}
          >
            {!isLoading && !error && (
              <div
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                className="select-none cursor-grab active:cursor-grabbing"
                style={{ 
                  touchAction: 'pan-y',
                  backgroundColor: 'transparent',
                  transform: highQuality ? 'translateZ(0)' : 'none',
                  backfaceVisibility: 'hidden',
                  perspective: '1000px',
                  filter: highQuality ? 'contrast(1.1) brightness(1.05)' : 'none'
                }}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  canvasBackground="white"
                  imageResourcesPath=""
                  className={`shadow-2xl max-w-full transition-all duration-200 ${
                    highQuality ? 'pdf-high-quality' : ''
                  }`}
                  loading={
                    <div className="flex items-center justify-center w-[400px] h-[600px] bg-[var(--bg-3)] rounded-lg">
                      <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
                    </div>
                  }
                />
              </div>
            )}
          </Document>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Device Specific */}
      {deviceType === 'mobile' && (
        <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-2)] border-t border-[var(--border)]">
          <button
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
            className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <span className="text-sm text-[var(--text)] font-medium">
            {pageNumber} / {numPages}
          </span>

          <button
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Tablet Bottom Navigation */}
      {deviceType === 'tablet' && (
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--bg-2)] border-t border-[var(--border)]">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <span className="text-base text-[var(--text)] font-medium min-w-[100px] text-center">
              {pageNumber} / {numPages}
            </span>

            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoScale(!autoScale)}
              className={`p-2 rounded-lg transition-all ${
                autoScale 
                  ? 'text-[var(--gold)] bg-[var(--gold-glow)]' 
                  : 'text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)]'
              }`}
              title={autoScale ? "Zoom automático ativado" : "Ativar zoom automático"}
            >
              <Maximize className="w-5 h-5" />
            </button>
            
            <button
              onClick={zoomOut}
              disabled={autoScale}
              className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-[var(--text-muted)] w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={autoScale}
              className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Zoom Controls (only for mobile) */}
      {deviceType === 'mobile' && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-2)] border-t border-[var(--border)]">
          <button
            onClick={() => setAutoScale(!autoScale)}
            className={`p-2 rounded-lg transition-all ${
              autoScale 
                ? 'text-[var(--gold)] bg-[var(--gold-glow)]' 
                : 'text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)]'
            }`}
            title={autoScale ? "Zoom automático ativado" : "Ativar zoom automático"}
          >
            <Maximize className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={zoomOut}
              disabled={autoScale}
              className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-[var(--text-muted)] w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={autoScale}
              className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
