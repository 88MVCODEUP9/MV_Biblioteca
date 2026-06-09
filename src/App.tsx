import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Library, Settings, Search, Plus, Trash2,
  FolderOpen, ChevronLeft, FileText, Bookmark,
  Grid3X3, List, ImageIcon, FileImage,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PDFReader } from '@/components/PDFReader';
import { ComicReader } from '@/components/ComicReader';

// ─── Types ────────────────────────────────────────────────────────────────────

type FileType = 'pdf' | 'cbz' | 'cbr';

interface Book {
  id: string;
  title: string;
  author: string;
  fileType: FileType;
  filePath: string;
  coverPath?: string;
  collectionId?: string;
  addedDate: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectFileType(url: string): FileType {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.cbz')) return 'cbz';
  if (lower.endsWith('.cbr')) return 'cbr';
  return 'pdf';
}

function fileTypeIcon(ft: FileType) {
  if (ft === 'cbz') return <ImageIcon className="w-4 h-4" />;
  if (ft === 'cbr') return <FileImage className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

function fileTypeBadgeColor(ft: FileType) {
  if (ft === 'cbz') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  if (ft === 'cbr') return 'text-purple-400 bg-purple-400/10 border-purple-400/20';
  return 'text-[var(--gold-dim)] bg-[var(--gold-glow2)] border-[rgba(201,171,110,0.15)]';
}

// ─── Preloaded books ──────────────────────────────────────────────────────────
// To add new books: copy one of the objects below and fill in the fields.
// fileType: "pdf" | "cbz" | "cbr"

const PRELOADED_BOOKS: Book[] = [
  // ── Crepúsculo ──────────────────────────────────────────────────────────────
  // ── Crepúsculo ──────────────────────────────────────────────────────────────
  { id:"01", title:"A Breve Segunda Vida",  author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/A%20breve%20segunda%20vida.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/A%20Breve%20Segunda%20Vida.png", collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"02", title:"Amanhecer",             author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Amanhecer.pdf",                  coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Amanhecer.png",               collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"03", title:"Crepúsculo",            author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Crepúsculo.pdf",                 coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Crepúsculo.png",              collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"04", title:"Eclipse",               author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Eclipse.pdf",                    coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Eclipse.png",                 collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"05", title:"Lua Nova",              author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Lua%20nova.pdf",                  coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Lua%20Nova.png",              collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"06", title:"Sol da Meia-Noite",     author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Sol%20da%20meia%20noite.pdf",    coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Sol%20da%20Meia-Noite.png",  collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"07", title:"Vida e Morte Especial", author:"Stephenie Meyer", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/PDF/Vida%20e%20morte%20especial.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Stephenie%20Meyer/CAPA/Vida%20e%20Morte%20Especial.png", collectionId:"Crepúsculo", addedDate:"2026-03-25T00:00:00.000Z" },
  // ── Harry Potter ───────────────────────────────────────────────────────────
  { id:"08", title:"A Pedra Filosofal",                              author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20A%20PEDRA%20FILOSOFA%20.pdf",                     coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/E%20A%20PEDRA%20FILOSOFAL.webp?raw=true",                           collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"09", title:"A Câmara Secreta",                               author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20A%20CAMARA%20SECRETA%20.pdf",                     coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/E%20A%20CAMARA%20SECRETA.WEBP?raw=true",                             collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"10", title:"O Prisioneiro de Azkaban",                       author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20O%20PRISIONEIRO%20DE%20AZKABAN.pdf",              coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/O%20PRISIONEIRO%20DE%20AZKABAN.webp?raw=true",                      collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"11", title:"O Cálice de Fogo",                               author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20O%20CALICE%20DE%20FOGO%20.pdf",                  coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/O%20CALICE%20DE%20FOGO.webp?raw=true",                               collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"12", title:"A Ordem da Fênix",                               author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20A%20ORDEM%20DA%20FENIX.pdf",                     coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/E%20A%20ORDEM%20DA%20FENIX.WEBP?raw=true",                           collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"13", title:"O Enigma do Príncipe",                           author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20O%20ENIGMA%20DO%20PRINCIPE.pdf",                 coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/O%20ENIGMA%20DO%20PRINCIPE.WEBP?raw=true",                           collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"14", title:"As Relíquias da Morte",                          author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/E%20AS%20RELIQUIAS%20DA%20MORTE.pdf",                coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/AS%20RELIQUIAS%20DA%20MORTE.WEBP?raw=true",                         collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"15", title:"A Criança Amaldiçoada",                          author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/A%20CRIANCA%20AMALDICOADA.PDF",                      coverPath:"https://raw.githubusercontent.com/Mvin2006/LIVROS/refs/heads/main/J.%20K.%20Rowling/CAPA/A%20CRIANCA%20AMALDICOADA.WEBP",               collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"16", title:"Animais Fantásticos: Os Crimes de Grindelwald",  author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/ANIMAIS%20FANTASTICOS%20E%20OS%20CRIMES%20DE%20GRINDELWALD.PDF", coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/ANIMAIS%20FANTASTICOS%20E%20OS%20CRIMES%20DE%20GRINDELWALD.WEBP?raw=true", collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },
  { id:"17", title:"Os Contos de Beedle, O Bardo",                   author:"J. K. Rowling", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/J.%20K.%20Rowling/PDF/O%20BARDO%20OS%20CONTOS.pdf",                        coverPath:"https://github.com/Mvin2006/LIVROS/blob/main/J.%20K.%20Rowling/CAPA/O%20BARDO%20OS%20CONTOS.webp?raw=true",                             collectionId:"Harry Potter", addedDate:"2026-03-25T00:00:00.000Z" },

    // ── Biblia ───────────────────────────────────────────────────────────
{ id:"18", title:"O bem e o mal - O PRINCÍPIO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/O%20PRINC%C3%8DPIO.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/O%20PRINC%C3%8DPIO.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"19", title:"O bem e o mal - ABRAÃO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/ABRA%C3%83O.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/ABRA%C3%83O.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"20", title:"O bem e o mal - MOISÉS", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/MOIS%C3%89S.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/MOIS%C3%89S.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"21", title:"O bem e o mal - ÊXODO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/%C3%8AXODO.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/%C3%8AXODO.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"22", title:"O bem e o mal - PROFETAS", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/PROFETAS.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/PROFETAS.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"23", title:"O bem e o mal - ELIAS", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/ELIAS.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/ELIAS.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"24", title:"O bem e o mal - AS PROFECIAS DE CRISTO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/AS%20PROFECIAS%20DE%20CRISTO.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/AS%20PROFECIAS%20DE%20CRISTO.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"25", title:"O bem e o mal - NASCIMENTO DE CRISTO E TENTAÇÃO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/NOVO%20TESTAMENTO%2C%20NASCIMENTO%20DE%20CRISTO%20E%20TENTA%C3%87%C3%83O.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/NOVO%20TESTAMENTO%2C%20NASCIMENTO%20DE%20CRISTO%20E%20TENTA%C3%87%C3%83O.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"26", title:"O bem e o mal - INÍCIO DO MINISTÉRIO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/EIN%C3%8DCIO%20DO%20MINIST%C3%89RIO.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/EIN%C3%8DCIO%20DO%20MINIST%C3%89RIO.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"27", title:"O bem e o mal - MILAGRES E PARÁBOLAS", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/MILAGRES%20E%20PAR%C3%81BOLAS.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/MILAGRES%20E%20PAR%C3%81BOLAS.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"28", title:"O bem e o mal - PÁSCOA E SOFRIMENTO DE CRISTO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/P%C3%81SCOA%20E%20SOFRIMEINTO%20DE%20CRISTO.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/P%C3%81SCOA%20E%20SOFRIMEINTO%20DE%20CRISTO.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"29", title:"O bem e o mal - RESSURREIÇÃO, PENTECOSTE E A IGREJA PRIMITIVA", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/RESSURREI%C3%87%C3%83O%2C%20PENTECOSTE%20E%20A%20IGREJA%20PRIMITIVA.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/RESSURREI%C3%87%C3%83O%2C%20PENTECOSTE%20E%20A%20IGREJA%20PRIMITIVA.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"30", title:"O bem e o mal - PARA TODO O MUNDO", author:"Michael & Debi Pearl", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/PDF/PARA%20TODO%20O%20MUNDO.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/bem-e-o-mal/CAPA/PARA%20TODO%20O%20MUNDO.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },

{ id:"31", title:"A Bíblia em Manga - Velho Testamento", author:"Siku/Akinsiku", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/testamento/PDF/velho-testamento.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/testamento/CAPA/velho-testamento.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"32", title:"A Bíblia em Manga - Novo Testamento", author:"Siku/Akinsiku", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/BIBLICO/testamento/PDF/novo-testamento.pdf", coverPath:"https://mvin2006.github.io/HQ/BIBLICO/testamento/CAPA/novo-testamento.png", collectionId:"Bíblia em Quadrinho", addedDate:"2026-03-25T00:00:00.000Z" },

    // ── Filosofia ───────────────────────────────────────────────────────────
{ id:"33", title:"100 MINUTOS para entender ARISTÓTELES", author:"Astral Cultural", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/PDF/100%20MINUTOS%20PARA%20ENTENDER%20ARIST%C3%93TELES.PDF", coverPath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/CAPA/100%20MINUTOS%20PARA%20ENTENDER%20ARIST%C3%93TELES.webp", collectionId:"100 Minutos", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"34", title:"100 MINUTOS para entender FREUD", author:"Astral Cultural", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/PDF/100 MINUTOS PARA ENTENDER FREUD.PDF", coverPath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/CAPA/100 MINUTOS PARA ENTENDER FREUD.webp", collectionId:"100 Minutos", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"35", title:"100 MINUTOS para entender NIETZSCHE", author:"Astral Cultural", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/PDF/100 MINUTOS PARA ENTENDER NIETZSCHE.PDF", coverPath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/CAPA/100 MINUTOS PARA ENTENDER NIETZSCHE.webp", collectionId:"100 Minutos", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"36", title:"100 MINUTOS para entender JUNG", author:"Astral Cultural", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/PDF/100 MINUTOS PARA ENTENDER JUNG.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/CAPA/100 MINUTOS PARA ENTENDER JUNG.png", collectionId:"100 Minutos", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"37", title:"100 MINUTOS para entender PLATÃO", author:"Astral Cultural", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/PDF/100 MINUTOS PARA ENTENDER PLATÃO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/CAPA/100 MINUTOS PARA ENTENDER PLATÃO.png", collectionId:"100 Minutos", addedDate:"2026-03-25T00:00:00.000Z" },
{ id:"38", title:"100 MINUTOS para entender LACAN", author:"Astral Cultural", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/PDF/100 MINUTOS PARA ENTENDER LACAN.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Astral%20Cultural/CAPA/100 MINUTOS PARA ENTENDER LACAN.png", collectionId:"100 Minutos", addedDate:"2026-03-25T00:00:00.000Z" },

    // ── Gelo e Fogo ───────────────────────────────────────────────────────────
{ id:"39", title:"A DANÇA DOS DRAGÕES", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/A DANÇA DOS DRAGÕES.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/A DANÇA DOS DRAGÕES.JPG", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"40", title:"A GUERRA DOS TRONOS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/A GUERRA DOS TRONOS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/A GUERRA DOS TRONOS.JPG", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"41", title:"A TORMENTA DE ESPADAS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/A TORMENTA DE ESPADAS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/A TORMENTA DE ESPADAS.JPG", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"42", title:"CAVALEIRO DOS SETES REINOS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/CAVALEIRO DOS SETES REINOS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/CAVALEIRO DOS SETES REINOS.JPG", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"43", title:"FOGO E SANGUE", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/FOGO E SANGUE.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/FOGO E SANGUE.JPG", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"44", title:"FÚRIA DOS REIS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/FÚRIA DOS REIS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/FÚRIA DOS REIS.jpg", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"45", title:"MULHERES PERIGOSAS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/MULHERES PERIGOSAS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/MULHERES PERIGOSAS.JPG", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"46", title:"O FESTIM DOS CORVOS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/O FESTIM DOS CORVOS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/O FESTIM DOS CORVOS.jpg", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"47", title:"O MUNDO DE GELO E FOGO", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/O MUNDO DE GELO E FOGO.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/O MUNDO DE GELO E FOGO.jpg", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"48", title:"O PRÍNCIPE DE WESTEROS E OUTRAS HISTÓRIAS", author:"George R. R. Martin", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/PDF/O PRÍNCIPE DE WESTEROS E OUTRAS HISTÓRIAS.PDF", coverPath:"https://mvin2006.github.io/LIVROS/George%20R.R.%20Martin/CAPAS/O PRÍNCIPE DE WESTEROS E OUTRAS HISTÓRIAS.jpg", collectionId:"As Crônicas de Gelo e Fogo", addedDate:"2026-06-09T00:00:00.000Z" },

];

const STORAGE_KEY = 'estante_books_v2';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, show }: { message: string; show: boolean }) => (
  <div className={`toast ${show ? 'show' : ''}`}>{message}</div>
);

// ─── Add Book Form ─────────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (book: Omit<Book, 'id' | 'addedDate'>) => void;
}

function AddBookForm({ onAdd }: AddFormProps) {
  const [title,      setTitle]      = useState('');
  const [author,     setAuthor]     = useState('');
  const [fileUrl,    setFileUrl]    = useState('');
  const [cover,      setCover]      = useState('');
  const [collection, setCollection] = useState('');
  const [detectedType, setDetectedType] = useState<FileType>('pdf');

  const onUrlChange = (v: string) => {
    setFileUrl(v);
    setDetectedType(detectFileType(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !fileUrl.trim()) return;
    onAdd({
      title:        title.trim(),
      author:       author.trim(),
      fileType:     detectedType,
      filePath:     fileUrl.trim(),
      coverPath:    cover.trim() || undefined,
      collectionId: collection.trim() || 'Sem Coleção',
    });
    setTitle(''); setAuthor(''); setFileUrl('');
    setCover(''); setCollection(''); setDetectedType('pdf');
  };

  const inputClass = 'bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold-dim)] transition-colors';
  const labelClass = 'block text-[11px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 font-medium';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Título *</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Nome do livro" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Autor *</label>
          <Input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Nome do autor" className={inputClass} required />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Link do arquivo *
          <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${fileTypeBadgeColor(detectedType)}`}>
            {fileTypeIcon(detectedType)}
            {detectedType.toUpperCase()} detectado
          </span>
        </label>
        <Input
          value={fileUrl}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="https://.../arquivo.pdf  ou  .cbz  ou  .cbr"
          className={inputClass}
          required
        />
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Suporta <strong className="text-[var(--text-sub)]">PDF</strong>, <strong className="text-[var(--text-sub)]">CBZ</strong> e <strong className="text-[var(--text-sub)]">CBR</strong>. O tipo é detectado automaticamente pela extensão.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Link da capa <span className="normal-case text-[var(--text-muted)] font-normal">(opcional)</span></label>
          <Input value={cover} onChange={e => setCover(e.target.value)} placeholder="https://.../capa.jpg" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Coleção / Série</label>
          <Input value={collection} onChange={e => setCollection(e.target.value)} placeholder="Ex.: Harry Potter, HQ..." className={inputClass} />
        </div>
      </div>

      <Button type="submit" className="w-full bg-[var(--gold)] text-[var(--bg)] hover:bg-[#d6bc80] font-semibold h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" />
        Adicionar à Biblioteca
      </Button>
    </form>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [books,              setBooks]             = useState<Book[]>([]);
  const [activeTab,          setActiveTab]          = useState<'books' | 'collections' | 'config'>('books');
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [readingBook,        setReadingBook]        = useState<Book | null>(null);
  const [toast,              setToast]              = useState({ message: '', show: false });
  const [viewMode,           setViewMode]           = useState<'grid' | 'list'>('grid');

  // ── Load books (FIXED: no longer wipes localStorage on mount) ──────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const userBooks: Book[] = saved ? JSON.parse(saved) : [];
    const preloadedIds = new Set(PRELOADED_BOOKS.map(b => b.id));
    const extras = userBooks.filter(b => !preloadedIds.has(b.id));
    setBooks([...PRELOADED_BOOKS, ...extras]);
  }, []);

  // ── Persist user-added books ───────────────────────────────────────────────
  useEffect(() => {
    if (books.length === 0) return;
    const userBooks = books.filter(b => b.id.startsWith('u_'));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userBooks));
  }, [books]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 2800);
  }, []);

  // ── Collections ────────────────────────────────────────────────────────────
  const collections = useMemo(() => {
    const map = new Map<string, Book[]>();
    books.forEach(book => {
      const key = book.collectionId || 'Sem Coleção';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(book);
    });
    return Array.from(map.entries()).map(([name, bks]) => ({
      id: name, name,
      count: bks.length,
      covers: bks.filter(b => b.coverPath).slice(0, 3).map(b => b.coverPath!),
      authors: [...new Set(bks.map(b => b.author))].slice(0, 2),
    }));
  }, [books]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return books.filter(book => {
      const matchSearch = !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        (book.collectionId || '').toLowerCase().includes(q);
      const matchCol = !selectedCollection || book.collectionId === selectedCollection;
      return matchSearch && matchCol;
    });
  }, [books, searchQuery, selectedCollection]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const addBook = useCallback((data: Omit<Book, 'id' | 'addedDate'>) => {
    setBooks(prev => [...prev, { ...data, id: 'u_' + Date.now(), addedDate: new Date().toISOString() }]);
    showToast('✓ Livro adicionado com sucesso!');
  }, [showToast]);

  const removeBook = useCallback((id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    showToast('✓ Livro removido');
  }, [showToast]);

  const selectCollection = useCallback((id: string) => {
    setSelectedCollection(id);
    setActiveTab('books');
  }, []);

  // ── Reader renderer ────────────────────────────────────────────────────────
  const renderReader = () => {
    if (!readingBook) return null;
    const close = () => setReadingBook(null);
    if (readingBook.fileType === 'cbz' || readingBook.fileType === 'cbr') {
      return (
        <ComicReader
          url={readingBook.filePath}
          title={readingBook.title}
          author={readingBook.author}
          fileType={readingBook.fileType}
          coverUrl={readingBook.coverPath}
          onClose={close}
        />
      );
    }
    return (
      <PDFReader
        url={readingBook.filePath}
        title={readingBook.title}
        author={readingBook.author}
        coverUrl={readingBook.coverPath}
        onClose={close}
      />
    );
  };

  // ── Book card (grid) ───────────────────────────────────────────────────────
  const renderBookCard = (book: Book, index: number) => (
    <button
      key={book.id}
      className="book-card animate-cardIn text-left"
      style={{ animationDelay: `${Math.min(index * 0.03, 0.5)}s` }}
      onClick={() => setReadingBook(book)}
      aria-label={`Ler ${book.title}`}
    >
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-[var(--bg-4)]">
        {book.coverPath ? (
          <img
            src={book.coverPath}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
            {fileTypeIcon(book.fileType)}
            <span className="text-[10px] uppercase tracking-widest">{book.fileType}</span>
          </div>
        )}
        <div className="cover-overlay">
          <span className="px-3 py-1.5 bg-[var(--gold)] text-[var(--bg)] text-[10px] font-semibold uppercase tracking-wider rounded-full">
            Ler agora
          </span>
        </div>
        {/* Format badge */}
        <span className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${fileTypeBadgeColor(book.fileType)}`}>
          {book.fileType}
        </span>
      </div>
      <div className="p-2.5">
        <h3 className="font-serif font-semibold text-[13px] text-[var(--text)] line-clamp-2 leading-tight">{book.title}</h3>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate">{book.author}</p>
        {book.collectionId && (
          <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[var(--gold-dim)] bg-[var(--gold-glow2)] border border-[rgba(201,171,110,0.15)] rounded">
            {book.collectionId}
          </span>
        )}
      </div>
    </button>
  );

  // ── Book row (list view) ───────────────────────────────────────────────────
  const renderBookRow = (book: Book, index: number) => (
    <button
      key={book.id}
      className="w-full flex items-center gap-4 p-3 bg-[var(--bg-3)] border border-[var(--border)] rounded-xl hover:border-[var(--border-2)] transition-all animate-cardIn text-left group"
      style={{ animationDelay: `${Math.min(index * 0.02, 0.4)}s` }}
      onClick={() => setReadingBook(book)}
      aria-label={`Ler ${book.title}`}
    >
      <div className="relative flex-shrink-0 w-12 h-16 rounded overflow-hidden bg-[var(--bg-4)]">
        {book.coverPath
          ? <img src={book.coverPath} alt="" className="w-full h-full object-cover" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="flex items-center justify-center w-full h-full text-[var(--text-muted)]">{fileTypeIcon(book.fileType)}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif font-semibold text-[var(--text)] text-sm truncate group-hover:text-[var(--gold)] transition-colors">{book.title}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{book.author}</p>
        {book.collectionId && (
          <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--gold-dim)] bg-[var(--gold-glow2)] border border-[rgba(201,171,110,0.15)] rounded">
            {book.collectionId}
          </span>
        )}
      </div>
      <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase rounded border ${fileTypeBadgeColor(book.fileType)}`}>
        {fileTypeIcon(book.fileType)}{book.fileType}
      </span>
      <span className="text-[11px] text-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity pr-1 flex-shrink-0">
        Ler →
      </span>
    </button>
  );

  // ── Mini item (config list) ────────────────────────────────────────────────
  const renderMiniItem = (book: Book) => (
    <li
      key={book.id}
      className="flex items-center gap-3 p-3 bg-[var(--bg-4)] border border-[var(--border)] rounded-lg hover:border-[var(--border-2)] transition-colors"
    >
      <div className="flex-shrink-0 w-9 h-12 rounded overflow-hidden bg-[var(--bg-3)]">
        {book.coverPath
          ? <img src={book.coverPath} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <div className="flex items-center justify-center w-full h-full text-[var(--text-muted)]">{fileTypeIcon(book.fileType)}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text)] truncate">{book.title}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{book.author}</p>
      </div>
      <span className={`hidden sm:inline-flex text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${fileTypeBadgeColor(book.fileType)}`}>
        {book.fileType}
      </span>
      {book.collectionId && (
        <span className="hidden md:inline text-[10px] text-[var(--gold-dim)] bg-[var(--gold-glow2)] px-2 py-0.5 rounded border border-[rgba(201,171,110,0.12)] whitespace-nowrap">
          {book.collectionId}
        </span>
      )}
      <button
        onClick={() => removeBook(book.id)}
        className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 rounded transition-colors flex-shrink-0"
        aria-label="Remover livro"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 lg:pb-0">

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-[var(--bg-2)] border-r border-[var(--border)] flex-col z-50">
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
              <Library className="w-5 h-5 text-[var(--gold)]" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-[var(--gold)]">Minha Estante</h1>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Biblioteca Digital</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {([
            { id: 'books',       label: 'Livros',       Icon: BookOpen  },
            { id: 'collections', label: 'Coleções',     Icon: FolderOpen },
            { id: 'config',      label: 'Configuração', Icon: Settings  },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); if (id === 'books') setSelectedCollection(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all ${
                activeTab === id
                  ? 'bg-[var(--gold-glow)] text-[var(--gold)] border-l-2 border-[var(--gold)] pl-[10px]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-sub)] hover:bg-white/[0.025]'
              }`}
            >
              <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[var(--border)] space-y-1">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span><b className="text-[var(--gold-dim)]">{books.length}</b> livros</span>
            <span><b className="text-[var(--gold-dim)]">{collections.length}</b> coleções</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['pdf','cbz','cbr'] as FileType[]).map(ft => {
              const count = books.filter(b => b.fileType === ft).length;
              if (count === 0) return null;
              return (
                <span key={ft} className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border ${fileTypeBadgeColor(ft)}`}>
                  {ft} {count}
                </span>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--bg-2)] border-b border-[var(--border)] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
            <Library className="w-4 h-4 text-[var(--gold)]" />
          </div>
          <h1 className="font-serif text-base font-semibold text-[var(--gold)]">Minha Estante</h1>
        </div>
        {activeTab === 'books' && (
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="icon-btn w-9 h-9"
            aria-label="Mudar visualização"
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="lg:ml-56 pt-14 lg:pt-0 min-h-screen">

        {/* ── Books ── */}
        {activeTab === 'books' && (
          <section className="animate-fadeIn">
            <div className="px-4 lg:px-10 pt-6 lg:pt-10 pb-4">
              {selectedCollection ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedCollection(null)} className="icon-btn w-9 h-9" aria-label="Voltar">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-serif text-2xl lg:text-3xl font-light text-[var(--text)]">
                      <em className="text-[var(--gold)] not-italic">{selectedCollection}</em>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
                      {filteredBooks.length} {filteredBooks.length === 1 ? 'livro' : 'livros'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="font-serif text-2xl lg:text-3xl font-light text-[var(--text)]">
                      Todos os <em className="text-[var(--gold)] not-italic">Livros</em>
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">
                      {filteredBooks.length} títulos disponíveis
                    </p>
                  </div>
                  {/* Desktop view toggle */}
                  <div className="hidden lg:flex items-center gap-1 bg-[var(--bg-3)] rounded-lg p-1 border border-[var(--border)]">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-[var(--gold-glow)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--text-sub)]'}`} aria-label="Grade"><Grid3X3 className="w-4 h-4" /></button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-[var(--gold-glow)] text-[var(--gold)]' : 'text-[var(--text-muted)] hover:text-[var(--text-sub)]'}`} aria-label="Lista"><List className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              <div className="gold-line mt-3" />
            </div>

            {/* Search + Category filter */}
            <div className="px-4 lg:px-10 pb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar título, autor ou coleção…"
                  className="pl-10 bg-[var(--bg-3)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-10 focus:border-[var(--gold-dim)] transition-colors"
                  aria-label="Buscar livros"
                />
              </div>

              {!selectedCollection && (
                <div className="category-grid">
                  <button onClick={() => setSelectedCollection(null)} className={`category-card ${!selectedCollection ? 'active' : ''}`}>
                    <div className="category-icon"><Grid3X3 className="w-full h-full" /></div>
                    <p className="category-name">Todos</p>
                    <p className="category-count">{books.length} livros</p>
                  </button>
                  {collections.map(col => (
                    <button key={col.id} onClick={() => setSelectedCollection(col.id)} className={`category-card ${selectedCollection === col.id ? 'active' : ''}`}>
                      <div className="category-icon"><FolderOpen className="w-full h-full" /></div>
                      <p className="category-name">{col.name}</p>
                      <p className="category-count">{col.count} livros</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Books grid or list */}
            <div className="px-4 lg:px-10 pb-10">
              {filteredBooks.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-3)] flex items-center justify-center">
                    <Search className="w-8 h-8 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="font-serif text-xl text-[var(--text)] mb-2">Nenhum livro encontrado</h3>
                  <p className="text-sm text-[var(--text-muted)]">Tente outra busca ou adicione livros em Configuração.</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 lg:gap-4">
                  {filteredBooks.map(renderBookCard)}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBooks.map(renderBookRow)}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Collections ── */}
        {activeTab === 'collections' && (
          <section className="animate-fadeIn">
            <div className="px-4 lg:px-10 pt-6 lg:pt-10 pb-4">
              <h2 className="font-serif text-2xl lg:text-3xl font-light text-[var(--text)]">
                Suas <em className="text-[var(--gold)] not-italic">Coleções</em>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">Séries e universos literários</p>
              <div className="gold-line mt-3" />
            </div>
            <div className="px-4 lg:px-10 pb-8">
              {collections.length === 0 ? (
                <div className="text-center py-20">
                  <FolderOpen className="w-10 h-10 mx-auto mb-4 text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">Adicione livros com coleções para vê-las aqui.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.map((col, i) => (
                    <button
                      key={col.id}
                      className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-5 cursor-pointer card-hover animate-cardIn text-left"
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => selectCollection(col.id)}
                    >
                      <div className="flex gap-2 mb-4">
                        {col.covers.length > 0 ? col.covers.map((cover, idx) => (
                          <img key={idx} src={cover} alt="" loading="lazy"
                            className="w-12 h-16 object-cover rounded border border-[var(--border)] shadow-lg"
                            style={{ transform: idx === 1 ? 'rotate(2deg) translateX(-4px)' : idx === 2 ? 'rotate(-2deg) translateX(-8px)' : 'none' }}
                          />
                        )) : (
                          <div className="w-12 h-16 bg-[var(--bg-4)] rounded flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-serif text-lg font-semibold text-[var(--text)] mb-1">{col.name}</h3>
                      <p className="text-xs text-[var(--text-muted)] mb-3">{col.authors.join(', ')}</p>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-4)] border border-[var(--border)] rounded-full text-xs text-[var(--gold)] font-medium">
                        <BookOpen className="w-3 h-3" />
                        {col.count} {col.count === 1 ? 'livro' : 'livros'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Config ── */}
        {activeTab === 'config' && (
          <section className="animate-fadeIn">
            <div className="px-4 lg:px-10 pt-6 lg:pt-10 pb-4">
              <h2 className="font-serif text-2xl lg:text-3xl font-light text-[var(--text)]">
                <em className="text-[var(--gold)] not-italic">Configuração</em>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 uppercase tracking-wider">Gerencie o acervo da biblioteca</p>
              <div className="gold-line mt-3" />
            </div>
            <div className="px-4 lg:px-10 pb-8">
              {/* Format info banner */}
              <div className="mb-6 p-4 bg-[var(--bg-3)] border border-[var(--border)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider font-medium">Formatos suportados</p>
                <div className="flex flex-wrap gap-3">
                  {([
                    { ft: 'pdf' as FileType, label: 'PDF', desc: 'Livros e documentos' },
                    { ft: 'cbz' as FileType, label: 'CBZ', desc: 'Quadrinhos (ZIP)' },
                    { ft: 'cbr' as FileType, label: 'CBR', desc: 'Quadrinhos (RAR) — stored' },
                  ]).map(({ ft, label, desc }) => (
                    <div key={ft} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${fileTypeBadgeColor(ft)}`}>
                      {fileTypeIcon(ft)}
                      <div>
                        <p className="text-[11px] font-bold">{label}</p>
                        <p className="text-[10px] opacity-70">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add book */}
                <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                      <Plus className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--text)]">Adicionar Livro</h3>
                  </div>
                  <AddBookForm onAdd={addBook} />
                </div>

                {/* Book list */}
                <div className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                      <Bookmark className="w-5 h-5 text-[var(--gold)]" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[var(--text)]">Acervo Atual</h3>
                    <span className="ml-auto text-xs text-[var(--text-muted)]">{books.length} livros</span>
                  </div>
                  <ScrollArea className="h-[420px] pr-2">
                    {books.length === 0 ? (
                      <p className="text-center py-10 text-[var(--text-muted)] text-sm">Nenhum livro cadastrado.</p>
                    ) : (
                      <ul className="space-y-2">{books.map(renderMiniItem)}</ul>
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
        {([
          { id: 'books',       label: 'Livros',   Icon: BookOpen  },
          { id: 'collections', label: 'Coleções', Icon: FolderOpen },
          { id: 'config',      label: 'Config',   Icon: Settings  },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id === 'books') setSelectedCollection(null); }}
            className={`bottom-nav-item ${activeTab === id ? 'active' : ''}`}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Reader */}
      {renderReader()}

      {/* Toast */}
      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}

export default App;
