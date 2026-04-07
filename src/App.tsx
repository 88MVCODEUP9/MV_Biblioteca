import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Library,
  Settings,
  Search,
  Plus,
  Trash2,
  FolderOpen,
  ChevronLeft,
  FileText,
  Bookmark,
  Grid3X3,
  List
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PDFReader } from '@/components/PDFReader';

// Types
interface Book {
  id: string;
  title: string;
  author: string;
  fileType: string;
  filePath: string;
  coverPath?: string;
  collectionId?: string;
  addedDate: string;
}

// Preloaded books data
const PRELOADED_BOOKS: Book[] = [
  {
    id: "01",
    title: "A Breve Segunda Vida",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/A%20breve%20segunda%20vida.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/A%20Breve%20Segunda%20Vida.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "02",
    title: "Amanhecer",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Amanhecer.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Amanhecer.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "03",
    title: "Crepúsculo",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Crepúsculo.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Crepúsculo.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "04",
    title: "Eclipse",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Eclipse.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Eclipse.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "05",
    title: "Lua Nova",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Lua%20nova.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Lua%20Nova.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "06",
    title: "Sol da Meia-Noite",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Sol%20da%20meia%20noite.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Sol%20da%20Meia-Noite.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "07",
    title: "Vida e Morte Especial",
    author: "Stephenie Meyer",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Vida%20e%20morte%20especial.pdf",
    coverPath: "https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Vida%20e%20Morte%20Especial.png",
    collectionId: "Crepúsculo",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "08",
    title: "Invencivel 00 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/00.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51gbL2O0quL._AC_UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "09",
    title: "Invencivel 01 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/01.pdf",
    coverPath: "https://m.media-amazon.com/images/I/71oQV8M7sLS._AC_UF350,350_QL50_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "10",
    title: "Invencivel 02 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/02.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51viPsXRGbL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "11",
    title: "Invencivel 03 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/03.pdf",
    coverPath: "https://m.media-amazon.com/images/I/613M5KfQmFL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "12",
    title: "Invencivel 04 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/04.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51KI67Ff0JL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
    {
    id: "13",
    title: "Invencivel 05 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/05.pdf",
    coverPath: "https://m.media-amazon.com/images/I/618mNqdHzCL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "14",
    title: "Invencivel 06 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/06.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51Lwu2e1cRL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "15",
    title: "Invencivel 07 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/07.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51UWYq4+4XL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "16",
    title: "Invencivel 08 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/08.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51sracuvIUL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "17",
    title: "Invencivel 09 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/09.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51ItR1unaoL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "18",
    title: "Invencivel 10 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/10.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51V80F8pg8L._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "19",
    title: "Invencivel 11 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/11.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51z-wuzaUYL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "20",
    title: "Invencivel 12 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/12.pdf",
    coverPath: "https://m.media-amazon.com/images/I/618G4cPSKyL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "21",
    title: "Invencivel 13 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/13.pdf",
    coverPath: "https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcSW2XfckD0Oq5yug4jVfh9W5uZiGADD-pnrlx4eW6mMLpNQKhPo",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "22",
    title: "Invencivel 14 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/14.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51UAbe0ZgnL._UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "23",
    title: "Invencivel 15 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/15.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51a65a9h3yL._AC_UF1000,1000_QL80_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },

  {
    id: "24",
    title: "Invencivel 16 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/16.pdf",
    coverPath: "https://m.media-amazon.com/images/I/51VrelZgZNL._AC_UF350,350_QL50_.jpg",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "25",
    title: "Invencivel 17 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/17.pdf",
    coverPath: "https://encrypted-tbn3.gstatic.com/images?q=tbn:ANd9GcTIvEDA8U_A3rSGJq8VpeVtotmlcn7C-rlRvt2SlQjCw79jg_f5",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "26",
    title: "Invencivel 18 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/18.pdf",
    coverPath: "https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcTJMFU1fANLhypAepsBWZ8LkZG7k0o-rtK21S-TQq7F4QMOp5yZ",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  },
  {
    id: "27",
    title: "Invencivel 19 (2003)",
    author: "Robert Kirkman",
    fileType: "pdf",
    filePath: "https://mvin2006.github.io/hq/Invencivel/2003-2017/19.pdf",
    coverPath: "https://imgv2-2-f.scribdassets.com/img/document/780316146/original/3cfeb8ce1e/1?v=1",
    collectionId: "Invencivel",
    addedDate: "2026-03-25T00:00:00.000Z"
  }
];

// Utility functions

// Toast component
const Toast = ({ message, show }: { message: string; show: boolean }) => (
  <div className={`toast ${show ? 'show' : ''}`}>{message}</div>
);



// Add Book Form Component
const AddBookForm = ({ onAdd }: { onAdd: (book: Omit<Book, 'id' | 'addedDate'>) => void }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pdf, setPdf] = useState('');
  const [cover, setCover] = useState('');
  const [collection, setCollection] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !pdf) return;

    onAdd({
      title,
      author,
      fileType: 'pdf',
      filePath: pdf,
      coverPath: cover || undefined,
      collectionId: collection || 'Sem Coleção'
    });

    setTitle('');
    setAuthor('');
    setPdf('');
    setCover('');
    setCollection('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Título *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nome do livro"
          className="bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Autor *</label>
        <Input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Nome do autor"
          className="bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Link do PDF *</label>
        <Input
          value={pdf}
          onChange={(e) => setPdf(e.target.value)}
          placeholder="https://.../livro.pdf"
          className="bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Link da Capa</label>
        <Input
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          placeholder="https://.../capa.jpg (opcional)"
          className="bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Coleção</label>
        <Input
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
          placeholder="Ex.: Fantasia, Romance, HQ..."
          className="bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      </div>
      <Button
        type="submit"
        className="w-full bg-[var(--gold)] text-[var(--bg)] hover:bg-[#d6bc80] font-medium"
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar à Biblioteca
      </Button>
    </form>
  );
};

// Main App Component
function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'collections' | 'config'>('books');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [toast, setToast] = useState({ message: '', show: false });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load books on mount
  useEffect(() => {
    // Clear any existing data to ensure clean state
    localStorage.removeItem('estante_books');
    
    const saved = localStorage.getItem('estante_books');
    const savedBooks = saved ? JSON.parse(saved) : [];

    // Merge preloaded with saved
    const preloadedIds = new Set(PRELOADED_BOOKS.map(b => b.id));
    const extras = savedBooks.filter((b: Book) => !preloadedIds.has(b.id));
    const merged = [...PRELOADED_BOOKS, ...extras];

    setBooks(merged);
    localStorage.setItem('estante_books', JSON.stringify(merged));
  }, []);

  // Save books when changed
  useEffect(() => {
    if (books.length > 0) {
      localStorage.setItem('estante_books', JSON.stringify(books));
    }
  }, [books]);

  // Keyboard handler for reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && readingBook) {
        setReadingBook(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readingBook]);

  // Toast helper
  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 2800);
  }, []);

  // Get collections
  const collections = useMemo(() => {
    const map = new Map<string, Book[]>();
    books.forEach(book => {
      const key = book.collectionId || 'Sem Coleção';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(book);
    });

    return Array.from(map.entries()).map(([name, books]) => ({
      id: name,
      name,
      count: books.length,
      covers: books.filter(b => b.coverPath).slice(0, 3).map(b => b.coverPath!),
      authors: [...new Set(books.map(b => b.author))].slice(0, 2)
    }));
  }, [books]);

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = !searchQuery ||
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCollection = !selectedCollection || book.collectionId === selectedCollection;
      return matchesSearch && matchesCollection;
    });
  }, [books, searchQuery, selectedCollection]);

  // Add book
  const addBook = useCallback((bookData: Omit<Book, 'id' | 'addedDate'>) => {
    const newBook: Book = {
      ...bookData,
      id: 'u_' + Date.now(),
      addedDate: new Date().toISOString()
    };
    setBooks(prev => [...prev, newBook]);
    showToast('✓ Livro adicionado com sucesso!');
  }, [showToast]);

  // Remove book
  const removeBook = useCallback((id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    showToast('✓ Livro removido');
  }, [showToast]);

  // Select collection
  const selectCollection = useCallback((collectionId: string) => {
    setSelectedCollection(collectionId);
    setActiveTab('books');
  }, []);

  // Render book card
  const renderBookCard = (book: Book, index: number) => (
    <div
      key={book.id}
      className="book-card animate-cardIn"
      style={{ animationDelay: `${index * 0.035}s` }}
      onClick={() => setReadingBook(book)}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-[var(--bg-4)]">
        {book.coverPath ? (
          <img
            src={book.coverPath}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-400"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
            <FileText className="w-10 h-10" />
            <span className="text-[10px] uppercase tracking-widest">{book.fileType}</span>
          </div>
        )}
        <div className="cover-overlay">
          <span className="px-4 py-2 bg-[var(--gold)] text-[var(--bg)] text-[11px] font-medium uppercase tracking-wider rounded-full">
            Ler agora
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-serif font-semibold text-[15px] text-[var(--text)] line-clamp-2 leading-tight">
          {book.title}
        </h3>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">{book.author}</p>
        {book.collectionId && (
          <span className="inline-block mt-2 px-2 py-0.5 text-[9px] uppercase tracking-wider text-[var(--gold-dim)] bg-[var(--gold-glow2)] border border-[rgba(201,171,110,0.15)] rounded">
            {book.collectionId}
          </span>
        )}
      </div>
    </div>
  );

  // Render mini list item (for config)
  const renderMiniItem = (book: Book) => (
    <li
      key={book.id}
      className="flex items-center gap-3 p-3 bg-[var(--bg-4)] border border-[var(--border)] rounded-lg transition-colors hover:border-[var(--border-2)]"
    >
      {book.coverPath ? (
        <img
          src={book.coverPath}
          alt=""
          className="w-9 h-12 object-cover rounded flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-9 h-12 flex items-center justify-center bg-[var(--bg-3)] rounded flex-shrink-0">
          <FileText className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text)] truncate">{book.title}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{book.author}</p>
      </div>
      {book.collectionId && (
        <span className="text-[10px] text-[var(--gold-dim)] bg-[var(--gold-glow2)] px-2 py-0.5 rounded border border-[rgba(201,171,110,0.12)] whitespace-nowrap">
          {book.collectionId}
        </span>
      )}
      <button
        onClick={() => removeBook(book.id)}
        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 lg:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-[var(--bg-2)] border-r border-[var(--border)] flex-col z-50">
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold text-[var(--gold)]">Minha Estante</h1>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Biblioteca Digital</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => { setActiveTab('books'); setSelectedCollection(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] transition-all ${
              activeTab === 'books' && !selectedCollection
                ? 'bg-[var(--gold-glow)] text-[var(--gold)] border-l-2 border-[var(--gold)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-sub)] hover:bg-white/[0.02]'
            }`}
          >
            <BookOpen className="w-[18px] h-[18px]" />
            Livros
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] transition-all ${
              activeTab === 'collections'
                ? 'bg-[var(--gold-glow)] text-[var(--gold)] border-l-2 border-[var(--gold)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-sub)] hover:bg-white/[0.02]'
            }`}
          >
            <FolderOpen className="w-[18px] h-[18px]" />
            Coleções
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] transition-all ${
              activeTab === 'config'
                ? 'bg-[var(--gold-glow)] text-[var(--gold)] border-l-2 border-[var(--gold)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-sub)] hover:bg-white/[0.02]'
            }`}
          >
            <Settings className="w-[18px] h-[18px]" />
            Configuração
          </button>
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span><b className="text-[var(--gold-dim)]">{books.length}</b> livros</span>
            <span><b className="text-[var(--gold-dim)]">{collections.length}</b> coleções</span>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--bg-2)] border-b border-[var(--border)] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
            <Library className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <h1 className="font-serif text-lg font-semibold text-[var(--gold)]">Minha Estante</h1>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'books' && (
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="icon-btn w-9 h-9"
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:ml-56 pt-16 lg:pt-0 min-h-screen">
        {/* Books Section */}
        {activeTab === 'books' && (
          <section className="animate-fadeIn">
            {/* Page Header */}
            <div className="px-4 lg:px-10 pt-6 lg:pt-10 pb-4">
              {selectedCollection ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className="icon-btn w-9 h-9"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-serif text-2xl lg:text-4xl font-light text-[var(--text)]">
                      <em className="text-[var(--gold)] not-italic">{selectedCollection}</em>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wider">
                      {filteredBooks.length} {filteredBooks.length === 1 ? 'livro' : 'livros'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-serif text-2xl lg:text-4xl font-light text-[var(--text)]">
                    Todos os <em className="text-[var(--gold)] not-italic">Livros</em>
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                    Clique em qualquer livro para ler
                  </p>
                </>
              )}
              <div className="gold-line mt-4" />
            </div>

            {/* Search and Filter */}
            <div className="px-4 lg:px-10 py-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por título ou autor..."
                  className="pl-10 bg-[var(--bg-3)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-11"
                />
              </div>

              {/* Categories Grid - Mobile Style */}
              {!selectedCollection && (
                <div className="category-grid">
                  <button
                    onClick={() => setSelectedCollection(null)}
                    className={`category-card ${!selectedCollection ? 'active' : ''}`}
                  >
                    <div className="category-icon">
                      <Grid3X3 className="w-full h-full" />
                    </div>
                    <p className="category-name">Todos</p>
                    <p className="category-count">{books.length} livros</p>
                  </button>
                  {collections.map((col) => (
                    <button
                      key={col.id}
                      onClick={() => setSelectedCollection(col.id)}
                      className={`category-card ${selectedCollection === col.id ? 'active' : ''}`}
                    >
                      <div className="category-icon">
                        <FolderOpen className="w-full h-full" />
                      </div>
                      <p className="category-name">{col.name}</p>
                      <p className="category-count">{col.count} livros</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Books Grid */}
            <div className="px-4 lg:px-10 pb-8">
              {filteredBooks.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-3)] flex items-center justify-center">
                    <Search className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="font-serif text-xl text-[var(--text)] mb-2">Nenhum livro encontrado</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Tente outra busca ou adicione livros em Configuração.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 lg:gap-5">
                  {filteredBooks.map((book, i) => renderBookCard(book, i))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Collections Section */}
        {activeTab === 'collections' && (
          <section className="animate-fadeIn">
            <div className="px-4 lg:px-10 pt-6 lg:pt-10 pb-4">
              <h2 className="font-serif text-2xl lg:text-4xl font-light text-[var(--text)]">
                Suas <em className="text-[var(--gold)] not-italic">Coleções</em>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                Séries e universos literários
              </p>
              <div className="gold-line mt-4" />
            </div>

            <div className="px-4 lg:px-10 pb-8">
              {collections.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-3)] flex items-center justify-center">
                    <FolderOpen className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="font-serif text-xl text-[var(--text)] mb-2">Nenhuma coleção</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    Adicione livros com coleções para vê-las aqui.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((col, i) => (
                    <div
                      key={col.id}
                      className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-5 cursor-pointer card-hover animate-cardIn"
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => selectCollection(col.id)}
                    >
                      <div className="flex gap-2 mb-4">
                        {col.covers.length > 0 ? (
                          col.covers.map((cover, idx) => (
                            <img
                              key={idx}
                              src={cover}
                              alt=""
                              className="w-12 h-16 object-cover rounded-md border border-[var(--border)] shadow-lg"
                              style={{
                                transform: idx === 1 ? 'rotate(2deg) translateX(-4px)' : idx === 2 ? 'rotate(-2deg) translateX(-8px)' : 'none'
                              }}
                            />
                          ))
                        ) : (
                          <div className="w-12 h-16 bg-[var(--bg-4)] rounded-md flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-serif text-xl font-semibold text-[var(--text)] mb-1">{col.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mb-3">{col.authors.join(', ')}</p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-4)] border border-[var(--border)] rounded-full text-xs text-[var(--gold)] font-medium">
                        <BookOpen className="w-3 h-3" />
                        {col.count} {col.count === 1 ? 'livro' : 'livros'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Config Section */}
        {activeTab === 'config' && (
          <section className="animate-fadeIn">
            <div className="px-4 lg:px-10 pt-6 lg:pt-10 pb-4">
              <h2 className="font-serif text-2xl lg:text-4xl font-light text-[var(--text)]">
                <em className="text-[var(--gold)] not-italic">Configuração</em>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-2 uppercase tracking-wider">
                Gerencie o acervo da sua biblioteca
              </p>
              <div className="gold-line mt-4" />
            </div>

            <div className="px-4 lg:px-10 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add Book Card */}
                <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[var(--text)]">Adicionar Livro</h3>
                  </div>
                  <AddBookForm onAdd={addBook} />
                </div>

                {/* Book List Card */}
                <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[var(--text)]">Acervo Atual</h3>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">{books.length} livros</span>
                  </div>
                  <ScrollArea className="h-[400px] pr-2">
                    {books.length === 0 ? (
                      <div className="text-center py-10 text-[var(--text-muted)] text-sm">
                        Nenhum livro cadastrado.
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {books.map(book => renderMiniItem(book))}
                      </ul>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden bottom-nav">
        <button
          onClick={() => { setActiveTab('books'); setSelectedCollection(null); }}
          className={`bottom-nav-item ${activeTab === 'books' ? 'active' : ''}`}
        >
          <BookOpen />
          <span>Livros</span>
        </button>
        <button
          onClick={() => setActiveTab('collections')}
          className={`bottom-nav-item ${activeTab === 'collections' ? 'active' : ''}`}
        >
          <FolderOpen />
          <span>Coleções</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`bottom-nav-item ${activeTab === 'config' ? 'active' : ''}`}
        >
          <Settings />
          <span>Config</span>
        </button>
      </nav>

      {/* PDF Reader */}
      {readingBook && (
        <PDFReader
          url={readingBook.filePath}
          title={readingBook.title}
          author={readingBook.author}
          coverUrl={readingBook.coverPath}
          onClose={() => setReadingBook(null)}
        />
      )}

      {/* Toast */}
      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}

export default App;
