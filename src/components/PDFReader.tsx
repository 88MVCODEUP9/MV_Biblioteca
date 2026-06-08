import { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  RotateCw, Download, Maximize, Minimize, BookOpen, Loader2,
} from 'lucide-react';

// Configure PDF.js worker — use CDN to avoid asset path issues on sub-path deploys
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFReaderProps {
  url: string;
  title: string;
  author: string;
  coverUrl?: string;
  onClose: () => void;
}

export function PDFReader({ url, title, author, coverUrl, onClose }: PDFReaderProps) {
  const [numPages,    setNumPages]    = useState(0);
  const [pageNumber,  setPageNumber]  = useState(1);
  const [scale,       setScale]       = useState(1.2);
  const [rotation,    setRotation]    = useState(0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [isFullscreen,setIsFullscreen]= useState(false);
  const [autoScale,   setAutoScale]   = useState(true);

  // Single ref for the scrollable content area
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Responsive device type ──────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      setIsTablet(w >= 768 && w < 1024);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ── Auto-scale ──────────────────────────────────────────────────────────────
  // Mobile/Tablet → largura total da tela, scroll vertical para ler
  // Desktop       → encaixa a página inteira na janela visível
  const calcScale = useCallback(() => {
    if (!autoScale) return;

    // usa window diretamente — mais confiável que clientWidth do ref
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const A4w = 595;
    const A4h = 842;

    // altura disponível = viewport menos header (52px) e footer mobile (56px)
    const headerH  = 52;
    const footerH  = isMobile ? 56 : 0;
    const available_h = vh - headerH - footerH - 16;

    let s: number;
    if (isMobile) {
      // ocupa 100% da largura — sem margem lateral
      s = vw / A4w;
    } else if (isTablet) {
      // 98% da largura
      s = (vw * 0.98) / A4w;
    } else {
      // desktop: encaixa sem scroll
      s = Math.min((vw - 224 - 48) / A4w, available_h / A4h);
      // 224 = sidebar width
    }

    setScale(Math.max(0.4, Math.min(s, 3)));
  }, [autoScale, isMobile, isTablet]);

  useEffect(() => {
    if (numPages === 0) return;
    const t = setTimeout(calcScale, 120);
    window.addEventListener('resize', calcScale);
    return () => { clearTimeout(t); window.removeEventListener('resize', calcScale); };
  }, [numPages, calcScale]);

  // ── Fullscreen API ──────────────────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      contentRef.current?.closest('.pdf-reader-root')
        ?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (isFullscreen) document.exitFullscreen(); else onClose(); }
      else if (e.key === 'ArrowRight' || e.key === ' ') setPageNumber(p => Math.min(p + 1, numPages));
      else if (e.key === 'ArrowLeft')  setPageNumber(p => Math.max(p - 1, 1));
      else if (e.key === '+' || e.key === '=') { setAutoScale(false); setScale(s => Math.min(s + 0.2, 3)); }
      else if (e.key === '-')           { setAutoScale(false); setScale(s => Math.max(s - 0.2, 0.4)); }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [isFullscreen, numPages, onClose]);

  // ── Touch swipe ─────────────────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx > 0) setPageNumber(p => Math.min(p + 1, numPages));
      else        setPageNumber(p => Math.max(p - 1, 1));
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const btnBase = 'flex items-center justify-center rounded-lg transition-all duration-200 text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)]';

  return (
    <div className="pdf-reader-root fixed inset-0 z-[1000] flex flex-col bg-[#0a0a0c]">

      {/* ── Header ── */}
      <header className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-2)] border-b border-[var(--border)] flex-shrink-0 min-h-[52px]">
        {/* Cover + title */}
        {!isMobile && coverUrl && (
          <img src={coverUrl} alt={title} className="w-8 h-11 object-cover rounded shadow" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{title}</p>
          {!isMobile && <p className="text-[11px] text-[var(--text-muted)]">{author} · PDF</p>}
        </div>

        {/* Zoom */}
        <div className="hidden sm:flex items-center gap-0.5 bg-[var(--bg-3)] rounded-lg p-1">
          <button
            className={`${btnBase} p-2 ${autoScale ? 'text-[var(--gold)] bg-[var(--gold-glow)]' : ''}`}
            onClick={() => setAutoScale(a => !a)} title="Zoom automático"
          ><Maximize className="w-4 h-4" /></button>
          <button
            className={`${btnBase} p-2`}
            onClick={() => { setAutoScale(false); setScale(s => Math.max(s - 0.2, 0.4)); }}
            title="Zoom -"
          ><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs text-[var(--text-muted)] w-11 text-center">{Math.round(scale * 100)}%</span>
          <button
            className={`${btnBase} p-2`}
            onClick={() => { setAutoScale(false); setScale(s => Math.min(s + 0.2, 3)); }}
            title="Zoom +"
          ><ZoomIn className="w-4 h-4" /></button>
        </div>

        {/* Page nav (desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-[var(--bg-3)] rounded-lg px-2 py-1">
          <button className={`${btnBase} p-1`} onClick={() => setPageNumber(p => Math.max(p-1,1))} disabled={pageNumber<=1}><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm text-[var(--text)] min-w-[72px] text-center">{pageNumber} / {numPages}</span>
          <button className={`${btnBase} p-1`} onClick={() => setPageNumber(p => Math.min(p+1,numPages))} disabled={pageNumber>=numPages}><ChevronRight className="w-5 h-5" /></button>
        </div>

        <button className={`${btnBase} p-2`} onClick={() => setRotation(r => (r + 90) % 360)} title="Rotacionar"><RotateCw className="w-4 h-4" /></button>
        {!isMobile && (
          <button className={`${btnBase} p-2`} onClick={() => window.open(url, '_blank')} title="Download"><Download className="w-4 h-4" /></button>
        )}
        <button className={`${btnBase} p-2`} onClick={toggleFullscreen} title={isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}>
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
        <button className={`${btnBase} p-2 hover:text-red-400 hover:bg-red-400/10`} onClick={onClose} title="Fechar (Esc)"><X className="w-5 h-5" /></button>
      </header>

      {/* ── Content ── */}
      <div
        ref={contentRef}
        className="flex-1 overflow-auto bg-[#1a1a1f] relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Loading overlay */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-[#1a1a1f]">
            <div className="loading-ring" />
            <p className="text-sm text-[var(--text-muted)]">Carregando PDF…</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-[var(--text)] text-center max-w-sm">{error}</p>
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => window.open(url, '_blank')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Abrir em nova aba
              </button>
              <button onClick={() => { const a = document.createElement('a'); a.href = url; a.download = title; a.click(); }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                Baixar PDF
              </button>
              <button onClick={onClose}
                className="px-4 py-2 bg-[var(--gold)] text-[var(--bg)] rounded-lg text-sm font-medium hover:bg-[#d6bc80] transition-colors">
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* PDF Document */}
        <div className={`w-full ${isMobile ? 'flex justify-center p-0' : isTablet ? 'flex justify-center py-2 px-1' : 'flex items-center justify-center min-h-full p-4'}`}>
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => { setNumPages(numPages); setIsLoading(false); setPageNumber(1); }}
            onLoadError={(e) => {
              const msg = e.message;
              if (msg.includes('CORS') || msg.includes('cross-origin'))
                setError('CORS: Este PDF não pode ser carregado diretamente. Tente baixar o arquivo.');
              else if (msg.includes('Invalid PDF') || msg.includes('startxref'))
                setError('Arquivo inválido: o link não aponta para um PDF válido.');
              else
                setError(`Erro ao carregar o PDF: ${msg}`);
              setIsLoading(false);
            }}
            loading={null}
            error={null}
          >
            {!isLoading && !error && (
              <div
                style={{ touchAction: 'pan-y' }}
                className="select-none"
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  canvasBackground="white"
                  className="shadow-2xl"
                  loading={
                    <div className="flex items-center justify-center bg-[var(--bg-3)]" style={{ width: Math.round(595 * scale), height: Math.round(842 * scale) }}>
                      <Loader2 className="w-8 h-8 text-[var(--gold)] animate-spin" />
                    </div>
                  }
                />
              </div>
            )}
          </Document>
        </div>
      </div>

      {/* ── Mobile/Tablet footer ── */}
      {(isMobile || isTablet) && !isLoading && !error && (
        <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-2)] border-t border-[var(--border)]">
          <button onClick={() => setPageNumber(p => Math.max(p-1,1))} disabled={pageNumber<=1}
            className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => { setAutoScale(false); setScale(s => Math.max(s - 0.2, 0.4)); }}
              className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] transition-colors">
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-[var(--text)] font-medium min-w-[70px] text-center">{pageNumber} / {numPages}</span>
            <button onClick={() => { setAutoScale(false); setScale(s => Math.min(s + 0.2, 3)); }}
              className="p-2 text-[var(--text-sub)] hover:text-[var(--gold)] transition-colors">
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>
          <button onClick={() => setPageNumber(p => Math.min(p+1,numPages))} disabled={pageNumber>=numPages}
            className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 transition-colors">
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
}
