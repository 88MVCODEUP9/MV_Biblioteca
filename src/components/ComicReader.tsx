import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Maximize,
  Minimize,
  BookOpen,
  Loader2,
  LayoutList,
  Columns2,
} from 'lucide-react';

// ─── CBZ (ZIP) extraction using native DecompressionStream ───────────────────

async function extractZip(buffer: ArrayBuffer): Promise<{ name: string; blob: Blob }[]> {
  const bytes = new Uint8Array(buffer);
  const files: { name: string; blob: Blob }[] = [];

  // Minimal ZIP central-directory parser
  const view = new DataView(buffer);
  const sig = 0x04034b50; // local file header signature

  let offset = 0;
  while (offset < bytes.length - 4) {
    if (view.getUint32(offset, true) !== sig) {
      offset++;
      continue;
    }
    const flags       = view.getUint16(offset + 6,  true);
    const compression = view.getUint16(offset + 8,  true);
    const compSize    = view.getUint32(offset + 18, true);
    const uncompSize  = view.getUint32(offset + 22, true);
    const fnLen       = view.getUint16(offset + 26, true);
    const extraLen    = view.getUint16(offset + 28, true);
    const nameBytes   = bytes.slice(offset + 30, offset + 30 + fnLen);
    const name        = new TextDecoder().decode(nameBytes);
    const dataOffset  = offset + 30 + fnLen + extraLen;

    if (!/\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(name)) {
      offset = dataOffset + compSize;
      continue;
    }

    const compData = bytes.slice(dataOffset, dataOffset + compSize);

    try {
      let rawData: Uint8Array;
      if (compression === 0) {
        // stored (no compression)
        rawData = compData;
      } else if (compression === 8) {
        // deflate
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();
        writer.write(compData);
        writer.close();
        const chunks: Uint8Array[] = [];
        let totalLen = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          totalLen += value.length;
        }
        rawData = new Uint8Array(totalLen);
        let pos = 0;
        for (const chunk of chunks) { rawData.set(chunk, pos); pos += chunk.length; }
        void uncompSize; // suppress unused warning
      } else {
        offset = dataOffset + compSize;
        continue;
      }

      const ext = name.split('.').pop()!.toLowerCase();
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                 : ext === 'png'  ? 'image/png'
                 : ext === 'gif'  ? 'image/gif'
                 : ext === 'webp' ? 'image/webp'
                 : 'image/jpeg';
      files.push({ name, blob: new Blob([rawData], { type: mime }) });
    } catch {
      // skip unreadable entries
    }

    if (flags & 0x8) {
      // data descriptor — skip 12 or 16 bytes
      offset = dataOffset + compSize + 16;
    } else {
      offset = dataOffset + compSize;
    }
  }

  return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// ─── CBR (RAR) minimal extractor ─────────────────────────────────────────────
// Supports RAR 1.5 / RAR 2.0 stored files (no compression).
// For compressed entries we fall back to downloading.

function isRar(bytes: Uint8Array): boolean {
  // RAR 1.5 / 2.0: 52 61 72 21 1A 07
  return bytes[0] === 0x52 && bytes[1] === 0x61 && bytes[2] === 0x72 &&
         bytes[3] === 0x21 && bytes[4] === 0x1A && bytes[5] === 0x07;
}

async function extractRar(buffer: ArrayBuffer): Promise<{ name: string; blob: Blob }[]> {
  // We attempt to parse RAR5 / RAR4 stored blocks.
  // RAR5 signature: 52 61 72 21 1A 07 01 00
  // RAR4 signature: 52 61 72 21 1A 07 00

  const bytes   = new Uint8Array(buffer);
  const view    = new DataView(buffer);
  const files: { name: string; blob: Blob }[] = [];
  const isRar5  = bytes[6] === 0x01 && bytes[7] === 0x00;

  if (isRar5) {
    return extractRar5(bytes, view);
  }

  // RAR4 — header-based scan
  let offset = 7; // skip signature

  while (offset < bytes.length - 7) {
    // Block header: CRC(2) + type(1) + flags(2) + size(2)
    const headCrc  = view.getUint16(offset,     true); void headCrc;
    const headType = view.getUint8 (offset + 2);
    const headFlags= view.getUint16(offset + 3, true);
    const headSize = view.getUint16(offset + 5, true);

    if (headSize === 0) break;

    const hasAddSize  = headFlags & 0x8000;
    const addSize     = hasAddSize
      ? view.getUint32(offset + 7, true)
      : 0;

    if (headType === 0x74) {
      // File header
      const packSize   = view.getUint32(offset + 7,  true);
      const unpackSize = view.getUint32(offset + 11, true); void unpackSize;
      const method     = view.getUint8 (offset + 18);
      const fnLen      = view.getUint16(offset + 26, true);
      const nameOffset = offset + 32;
      const name = new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.slice(nameOffset, nameOffset + fnLen))
        .replace(/\\/g, '/');

      const dataOffset = offset + headSize;
      const imgExt = /\.(jpe?g|png|gif|webp|bmp)$/i.test(name);

      if (imgExt && method === 0x30) {
        // method 0x30 = stored (no compression)
        const raw  = bytes.slice(dataOffset, dataOffset + packSize);
        const ext  = name.split('.').pop()!.toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                   : ext === 'png'  ? 'image/png'
                   : ext === 'gif'  ? 'image/gif'
                   : ext === 'webp' ? 'image/webp'
                   : 'image/jpeg';
        files.push({ name, blob: new Blob([raw], { type: mime }) });
      }
      offset = dataOffset + packSize;
    } else {
      offset += headSize + (hasAddSize ? addSize : 0);
    }

    if (offset >= bytes.length) break;
  }

  return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// RAR5 vint reader
function readVint(bytes: Uint8Array, offset: number): [number, number] {
  let value = 0, shift = 0, len = 0;
  while (offset + len < bytes.length) {
    const b = bytes[offset + len++];
    value |= (b & 0x7f) << shift;
    shift += 7;
    if (!(b & 0x80)) break;
  }
  return [value, len];
}

async function extractRar5(bytes: Uint8Array, view: DataView): Promise<{ name: string; blob: Blob }[]> {
  const files: { name: string; blob: Blob }[] = [];
  let offset = 8; // skip 8-byte signature

  while (offset < bytes.length - 6) {
    const headCrc32 = view.getUint32(offset, true); void headCrc32;
    offset += 4;

    const [headSize, hsLen] = readVint(bytes, offset);
    offset += hsLen;

    const [headType, htLen] = readVint(bytes, offset);
    offset += htLen;

    const [headFlags, hfLen] = readVint(bytes, offset);
    offset += hfLen;

    const hasExtra    = headFlags & 0x001;
    const hasData     = headFlags & 0x002;

    let dataSize = 0;
    if (hasData) {
      const [ds, dsl] = readVint(bytes, offset);
      dataSize = ds;
      offset  += dsl;
    }

    const blockEnd = offset - htLen - hfLen - (hasData ? 1 : 0) + headSize;

    if (headType === 2) {
      // File header (type 2 in RAR5)
      const [fileFlags, ffLen] = readVint(bytes, offset);  void fileFlags;
      const unpSize = readVint(bytes, offset + ffLen); void unpSize;
      const attrs   = readVint(bytes, offset + ffLen + unpSize[1]); void attrs;
      const method  = bytes[offset + ffLen + unpSize[1] + attrs[1]];

      // skip compression info
      let fnOffset = offset + ffLen + unpSize[1] + attrs[1] + 1 + 1;
      const [fnLen, fll] = readVint(bytes, fnOffset);
      fnOffset += fll;
      const name = new TextDecoder('utf-8', { fatal: false })
        .decode(bytes.slice(fnOffset, fnOffset + fnLen))
        .replace(/\\/g, '/');

      if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(name) && method === 0) {
        const raw  = bytes.slice(blockEnd, blockEnd + dataSize);
        const ext  = name.split('.').pop()!.toLowerCase();
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                   : ext === 'png'  ? 'image/png'
                   : ext === 'gif'  ? 'image/gif'
                   : 'image/jpeg';
        files.push({ name, blob: new Blob([raw], { type: mime }) });
      }
    }

    void hasExtra;
    offset = blockEnd + dataSize;
    if (offset <= 0 || offset >= bytes.length) break;
  }

  return files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ComicReaderProps {
  url: string;
  title: string;
  author: string;
  fileType: 'cbz' | 'cbr';
  coverUrl?: string;
  onClose: () => void;
}

type ViewMode = 'single' | 'double';

export function ComicReader({ url, title, author, fileType, onClose }: ComicReaderProps) {
  const [pages, setPages]               = useState<string[]>([]);
  const [pageIndex, setPageIndex]       = useState(0);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [scale, setScale]               = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode]         = useState<ViewMode>('single');
  const [isCompressed, setIsCompressed] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX  = useRef<number | null>(null);
  const touchStartY  = useRef<number | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => { pages.forEach(p => URL.revokeObjectURL(p)); };
  }, [pages]);

  // Load the archive
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    async function load() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buffer = await res.arrayBuffer();
        const bytes  = new Uint8Array(buffer.slice(0, 8));

        let entries: { name: string; blob: Blob }[] = [];

        if (fileType === 'cbz' || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
          entries = await extractZip(buffer);
        } else if (fileType === 'cbr' || isRar(bytes)) {
          entries = await extractRar(buffer);
          if (entries.length === 0) {
            setIsCompressed(true);
          }
        } else {
          throw new Error('Formato não reconhecido. Esperado ZIP ou RAR.');
        }

        if (cancelled) return;

        if (entries.length === 0 && !isCompressed) {
          setError('Nenhuma imagem encontrada no arquivo. O arquivo pode estar corrompido ou usar compressão não suportada.');
          setIsLoading(false);
          return;
        }

        const urls = entries.map(e => URL.createObjectURL(e.blob));
        setPages(urls);
        setPageIndex(0);
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Erro desconhecido';
          if (msg.includes('CORS') || msg.includes('cors')) {
            setError('CORS: O servidor não permite carregar este arquivo diretamente. Tente fazer o download.');
          } else if (msg.includes('HTTP')) {
            setError(`Arquivo não encontrado (${msg}). Verifique o link.`);
          } else {
            setError(`Erro ao carregar o arquivo: ${msg}`);
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [url, fileType]);

  const totalDisplayPages = viewMode === 'double'
    ? Math.ceil(pages.length / 2)
    : pages.length;

  const goNext = useCallback(() => {
    const step = viewMode === 'double' ? 2 : 1;
    setPageIndex(p => Math.min(p + step, pages.length - 1));
  }, [pages.length, viewMode]);

  const goPrev = useCallback(() => {
    const step = viewMode === 'double' ? 2 : 1;
    setPageIndex(p => Math.max(p - step, 0));
  }, [viewMode]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')        { if (isFullscreen) setIsFullscreen(false); else onClose(); }
      else if (e.key === 'ArrowRight' || e.key === ' ') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === '+' || e.key === '=') setScale(s => Math.min(s + 0.2, 3));
      else if (e.key === '-')        setScale(s => Math.max(s - 0.2, 0.5));
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [isFullscreen, goNext, goPrev, onClose]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY);
    if (Math.abs(dx) > 50 && dy < 80) {
      if (dx > 0) goNext(); else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Current display pages
  const currentPages = viewMode === 'double'
    ? pages.slice(pageIndex, pageIndex + 2)
    : [pages[pageIndex]].filter(Boolean);

  const displayPage = viewMode === 'double'
    ? Math.floor(pageIndex / 2) + 1
    : pageIndex + 1;

  const btnBase = 'flex items-center justify-center rounded-lg transition-all duration-200 text-[var(--text-sub)] hover:text-[var(--gold)] hover:bg-[var(--gold-glow)]';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[1000] flex flex-col bg-[#0d0d10]"
    >
      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-2 bg-[var(--bg-2)] border-b border-[var(--border)] flex-shrink-0 min-h-[52px]">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text)] truncate leading-tight">{title}</p>
          <p className="text-[11px] text-[var(--text-muted)]">{author} · <span className="uppercase">{fileType}</span></p>
        </div>

        {/* Zoom */}
        <div className="hidden sm:flex items-center gap-0.5 bg-[var(--bg-3)] rounded-lg p-1">
          <button className={`${btnBase} p-2`} onClick={() => setScale(s => Math.max(s - 0.2, 0.4))} title="Zoom -"><ZoomOut className="w-4 h-4" /></button>
          <span className="text-xs text-[var(--text-muted)] w-11 text-center">{Math.round(scale * 100)}%</span>
          <button className={`${btnBase} p-2`} onClick={() => setScale(s => Math.min(s + 0.2, 3))} title="Zoom +"><ZoomIn className="w-4 h-4" /></button>
        </div>

        {/* View mode */}
        <div className="hidden sm:flex items-center gap-0.5 bg-[var(--bg-3)] rounded-lg p-1">
          <button
            className={`${btnBase} p-2 ${viewMode === 'single' ? 'text-[var(--gold)] bg-[var(--gold-glow)]' : ''}`}
            onClick={() => setViewMode('single')} title="Página única"
          ><LayoutList className="w-4 h-4" /></button>
          <button
            className={`${btnBase} p-2 ${viewMode === 'double' ? 'text-[var(--gold)] bg-[var(--gold-glow)]' : ''}`}
            onClick={() => setViewMode('double')} title="Duas páginas"
          ><Columns2 className="w-4 h-4" /></button>
        </div>

        {/* Navigation (desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-[var(--bg-3)] rounded-lg px-2 py-1">
          <button className={`${btnBase} p-1`} onClick={goPrev} disabled={pageIndex === 0}><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm text-[var(--text)] min-w-[72px] text-center">
            {displayPage} / {totalDisplayPages}
          </span>
          <button className={`${btnBase} p-1`} onClick={goNext} disabled={pageIndex >= pages.length - 1}><ChevronRight className="w-5 h-5" /></button>
        </div>

        <button className={`${btnBase} p-2`} onClick={() => window.open(url, '_blank')} title="Download">
          <Download className="w-4 h-4" />
        </button>
        <button
          className={`${btnBase} p-2`}
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Sair tela cheia' : 'Tela cheia'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
        <button
          className={`${btnBase} p-2 hover:text-red-400 hover:bg-red-400/10`}
          onClick={onClose} title="Fechar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* ── Content ── */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center bg-[#111115] relative select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {isLoading && (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 text-[var(--gold)] animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">Carregando {fileType.toUpperCase()}…</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex flex-col items-center gap-4 p-8 max-w-md text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-[var(--text)]">{error}</p>
            {isCompressed && (
              <p className="text-[var(--text-muted)] text-sm">
                Arquivos CBR com compressão RAR precisam ser convertidos para CBZ para funcionar no navegador.
              </p>
            )}
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => window.open(url, '_blank')}
                className="px-4 py-2 bg-[var(--gold)] text-[var(--bg)] rounded-lg text-sm font-medium hover:bg-[#d6bc80] transition-colors">
                Baixar arquivo
              </button>
              <button onClick={onClose}
                className="px-4 py-2 bg-[var(--bg-4)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-[var(--bg-3)] border border-[var(--border)] transition-colors">
                Voltar
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && pages.length > 0 && (
          <div
            className="flex gap-1 items-center justify-center p-2"
            style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.2s ease' }}
          >
            {currentPages.map((src, i) => (
              <img
                key={`${pageIndex}-${i}`}
                src={src}
                alt={`Página ${pageIndex + i + 1}`}
                className="max-h-[calc(100vh-120px)] max-w-full object-contain shadow-2xl rounded"
                draggable={false}
                style={{ imageRendering: 'crisp-edges' }}
              />
            ))}
          </div>
        )}

        {/* Side nav arrows (desktop) */}
        {!isLoading && !error && pages.length > 0 && (
          <>
            <button
              onClick={goPrev}
              disabled={pageIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-20 bg-black/40 hover:bg-black/70 text-white rounded-xl transition-all disabled:opacity-0 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goNext}
              disabled={pageIndex >= pages.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-20 bg-black/40 hover:bg-black/70 text-white rounded-xl transition-all disabled:opacity-0 flex items-center justify-center"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* ── Mobile Footer ── */}
      {!isLoading && !error && pages.length > 0 && (
        <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-[var(--bg-2)] border-t border-[var(--border)]">
          <button onClick={goPrev} disabled={pageIndex === 0}
            className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-sm text-[var(--text)] font-medium">
            {displayPage} / {totalDisplayPages}
          </span>
          <button onClick={goNext} disabled={pageIndex >= pages.length - 1}
            className="p-3 text-[var(--text-sub)] hover:text-[var(--gold)] disabled:opacity-30 transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
