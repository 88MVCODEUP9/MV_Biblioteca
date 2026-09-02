import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen, Library, Search, Plus, Trash2,
  FolderOpen, ChevronLeft, FileText, Bookmark,
  Grid3X3, List,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PDFReader } from '@/components/PDFReader';
import { EpubReader } from '@/components/EpubReader';

// ─── Types ────────────────────────────────────────────────────────────────────

type FileType = 'pdf' | 'epub';

interface Collection {
  id: string;
  name: string;
  parentId?: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  fileType: FileType;
  filePath: string;
  coverPath?: string;
  collectionId?: string;
  subCollectionId?: string;
  addedDate: string;
}

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: 'Marvel', name: 'Marvel' },
  { id: 'Trono de Vidro', name: 'Trono de Vidro' },
  { id: 'Bíblia em Quadrinho', name: 'Bíblia em Quadrinho' },
  { id: 'Harry Potter', name: 'Harry Potter' },
  { id: 'Crepúsculo', name: 'Crepúsculo' },
];

const LEGACY_AUTOMATIC_SUBCOLLECTIONS = new Set(['Invasão Secreta (2008)']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectFileType(url: string): FileType {
  const lower = url.toLowerCase().split('?')[0];
  if (lower.endsWith('.epub')) return 'epub';
  return 'pdf';
}

function sameCollectionId(first?: string, second?: string) {
  if (!first || !second) return false;
  return first.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() ===
    second.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function fileTypeIcon(ft: FileType) {
  if (ft === 'epub') return <BookOpen className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

function fileTypeBadgeColor(ft: FileType) {
  if (ft === 'epub') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  return 'text-[var(--gold-dim)] bg-[var(--gold-glow2)] border-[rgba(201,171,110,0.15)]';
}

// ─── Preloaded books ──────────────────────────────────────────────────────────
// To add new books: copy one of the objects below and fill in the fields.
// fileType: "pdf" | "epub"

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

// ── The Beginning After the End ───────────────────────────────────────────────────────────
{ id:"49", title:"Primeiros Anos", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Primeiros Anos.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Primeiros Anos.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"50", title:"Novas Alturas", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Novas Alturas.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Novas Alturas.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"51", title:"O Chamado dos Destinos", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/O Chamado dos Destinos.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/O Chamado dos Destinos.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"52", title:"À Beira do Horizonte", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/À Beira do Horizonte.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/À Beira do Horizonte.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"53", title:"Convergência", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Convergência.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Convergência.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"54", title:"Divergência", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Divergência.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Divergência.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"55", title:"Transcendência", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Transcendence.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Transcendência.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"56", title:"Ascensão", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Ascension.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Ascensão.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"57", title:"Entre os Caídos", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Entre os Caídos.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Entre os Caídos.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"58", title:"Acerto de Contas", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Acerto de Contas.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Acerto de Contas.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"59", title:"Retribuição", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Retribuição.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Retribuição.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"60", title:"Providência", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Providência.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Providência.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"61", title:"Apoteose", author:"TurtleMe", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/PDF/Apoteose.pdf", coverPath:"https://mvin2006.github.io/LIVROS/The%20Beginning%20After%20the%20End/CAPAS/Apoteose.jpg", collectionId:"The Beginning After the End", addedDate:"2026-06-09T00:00:00.000Z" },

  
// ── Diários do Vampiro ───────────────────────────────────────────────────────────
{ id:"62", title:"A Fúria", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/A FURIA DIARIOS DO VAMPIRO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/A FURIA DIARIOS DO VAMPIRO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"63", title:"Almas Sombrias - O Retorno", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/ALMAS SOMBRIAS - O RETORNO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/ALMAS SOMBRIAS - O RETORNO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"64", title:"Anoitecer - O Retorno", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/ANOITECER - O RETORNO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/ANOITECER - O RETORNO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"65", title:"Canção da Lua - O Caçador", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/CANCAO DA LUA - O CACADOR.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/CANCAO DA LUA - O CACADOR.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"66", title:"Depois do Expediente - Contos", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/DEPOIS DO EXPEDIENTE - CONTOS.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/DEPOIS DO EXPEDIENTE - CONTOS.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"67", title:"Desejo - Diário do Stefan", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/DESEJO DIARIO DO STEFAN.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/DESEJO DIARIO DO STEFAN.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"68", title:"Destino Nascente - O Caçador", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/DESTINO NASCENTE - O CACADOR.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/DESTINO NASCENTE - O CACADOR.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"69", title:"Espectro - O Caçador", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/ESPECTRO - O CACADOR.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L.%20J.%20Smith/Di%C3%A1rios%20do%20Vampiro/CAPA/ESPECTRO-%20O%20CACADOR.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"70", title:"Estripador - Diário do Stefan", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/ESTRIPADOR DIARIO DO STEFAN.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/ESTRIPADOR DIARIO DO STEFAN.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"71", title:"Matt e Elena - Contos", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/MATT E ELENA - CONTOS.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/MATT E ELENA - CONTOS.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"72", title:"Meia-Noite - O Retorno", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/MEIA NOITE - O RETORNO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/MEIA NOITE - O RETORNO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"73", title:"O Asilo - Diário do Stefan", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/O ASILO DIARIO DO STEFAN.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/O ASILO DIARIO DO STEFAN.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"74", title:"O Confronto", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/O CONFRONTO DIARIOS DO VAMPIRO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/O CONFRONTO DIARIOS DO VAMPIRO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"75", title:"O Despertar", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/O DESPERTAR DIARIOS DO VAMPIRO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/O DESPERTAR DIARIOS DO VAMPIRO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"76", title:"Origens - Diário do Stefan", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/ORIGENS DIARIO DO STEFAN.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/ORIGENS DIARIO DO STEFAN.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"77", title:"Reunião Sombria", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/REUNIAO SOMBRIA DIARIOS DO VAMPIRO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/REUNIAO SOMBRIA DIARIOS DO VAMPIRO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"78", title:"Sede de Sangue - Diário do Stefan", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/SEDE DE SANGUE DIARIO DO STEFAN.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/SEDE DE SANGUE DIARIO DO STEFAN.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"79", title:"The Originals - A Ascensão", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/THE-ORIGINALS A ASCENCAO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/THE-ORIGINALS A ASCENCAO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"80", title:"The Originals - A Perda", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/THE-ORIGINALS A PERDA.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/THE-ORIGINALS A PERDA.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"81", title:"The Originals - A Ressurreição", author:"L. J. Smith", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/PDF/THE-ORIGINALS A RESSURREICAO.pdf", coverPath:"https://mvin2006.github.io/LIVROS/L. J. Smith/Diários do Vampiro/CAPA/THE-ORIGINALS A RESSURREICAO.webp", collectionId:"Diários do Vampiro", addedDate:"2026-06-09T00:00:00.000Z" },

// ── As Crônicas de Nárnia ───────────────────────────────────────────────────────────
{ id:"82", title:"O Sobrinho do Mago", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/O Sobrinho do Mago.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/O Sobrinho do Mago.jpg", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"83", title:"O Leão, a Feiticeira e o Guarda-Roupa", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/O Leão, a Feiticeira e o Guarda-Roupa.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/O Leão, a Feiticeira e o Guarda-Roupa.webp", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"84", title:"O Cavalo e seu Menino", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/O Cavalo e seu Menino.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/O Cavalo e seu Menino.jpg", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"85", title:"Príncipe Caspian", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/Príncipe Caspian.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/Príncipe Caspian.jpg", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"86", title:"A Viagem do Peregrino da Alvorada", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/A Viagem do Peregrino da Alvorada.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/A Viagem do Peregrino da Alvorada.jpg", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"87", title:"A Cadeira de Prata", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/A Cadeira de Prata.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/A Cadeira de Prata.jpg", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"88", title:"A Última Batalha", author:"C. S. Lewis", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/PDF/A Última Batalha.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas de Nárnia/CAPA/A Última Batalha.jpg", collectionId:"As Crônicas de Nárnia", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Barbeiro ───────────────────────────────────────────────────────────
{ id:"89", title:"Degradê Limpo", author:"Barbeiro", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/PDF/cabelo (1).pdf", coverPath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/CAPA/cabelo (1).png", collectionId:"Cursos", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"90", title:"Conexão do Topo com o degrade", author:"Barbeiro", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/PDF/cabelo (2).pdf", coverPath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/CAPA/cabelo (2).png", collectionId:"Cursos", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"91", title:"15 Modelos Prontos", author:"Barbeiro", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/PDF/cabelo (3).pdf", coverPath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/CAPA/cabelo (3).png", collectionId:"Cursos", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"92", title:"Seu Degradê Limpo", author:"Barbeiro", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/PDF/cabelo (4).pdf", coverPath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/CAPA/cabelo (4).png", collectionId:"Cursos", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"93", title:"Demostração Guiada", author:"Barbeiro", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/PDF/cabelo (5).pdf", coverPath:"https://mvin2006.github.io/LIVROS/Cursos/Cabeleleiro 01/CAPA/cabelo (5).png", collectionId:"Cursos", addedDate:"2026-06-09T00:00:00.000Z" },

// ── O Senhor dos Anéis ────────────────────────────────────────────────────────
{ id:"94", title:"O Silmarillion", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/O Silmarillion.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/O Silmarillion.webp", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"95", title:"Beren e Lúthien", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/Beren e Lúthien.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/Beren e Lúthien.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"96", title:"Os Filhos de Húrin", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/Os Filhos de Húrin.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/Os Filhos de Húrin.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"97", title:"A Queda de Gondolin", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/A Queda de Gondolin.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/A Queda de Gondolin.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"98", title:"Contos Inacabados", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/Contos Inacabados.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/Contos Inacabados.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"99", title:"O Hobbit", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/O Hobbit.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/O Hobbit.webp", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"100", title:"A Sociedade do Anel", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/A Sociedade do Anel.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/A Sociedade do Anel.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"101", title:"As Duas Torres", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/As Duas Torres.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/As Duas Torres.png", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"102", title:"O Retorno do Rei", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/O Retorno do Rei.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/O Retorno do Rei.png", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"103", title:"A Queda de Númenor", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/A Queda de Númenor.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/A Queda de Númenor.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"104", title:"A Natureza da Terra-média", author:"J. R. R. Tolkien", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/PDF/A Natureza da Terra-média.pdf", coverPath:"https://mvin2006.github.io/LIVROS/O Senhor dos Anéis/CAPA/A Natureza da Terra-média.jpg", collectionId:"O Senhor dos Anéis", addedDate:"2026-06-09T00:00:00.000Z" },

// ── O Senhor dos Anéis ────────────────────────────────────────────────────────
{ id:"105", title:"Eragon", author:"Christopher Paolini", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/PDF/Eragon.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/CAPA/Eragon.webp", collectionId:"Ciclo da Herança", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"106", title:"Eldest", author:"Christopher Paolini", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/PDF/Eldest.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/CAPA/Eldest.jpg", collectionId:"Ciclo da Herança", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"107", title:"Brisingr", author:"Christopher Paolini", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/PDF/Brisingr.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/CAPA/Brisingr.jpg", collectionId:"Ciclo da Herança", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"108", title:"Herança", author:"Christopher Paolini", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/PDF/Herança.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/CAPA/Herança.jpg", collectionId:"Ciclo da Herança", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"109", title:"O Garfo, a Bruxa e o Dragão", author:"Christopher Paolini", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/PDF/O Garfo, a Bruxa e o Dragão.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/CAPA/O Garfo, a Bruxa e o Dragão.jpg", collectionId:"Ciclo da Herança", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"110", title:"Murtagh", author:"Christopher Paolini", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/PDF/Murtagh.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Ciclo da Herança/CAPA/Murtagh.jpg", collectionId:"Ciclo da Herança", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Crônicas de Duna ────────────────────────────────────────────────────────
{ id:"111", title:"Duna", author:"Frank Herbert", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"112", title:"Messias de Duna", author:"Frank Herbert", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Messias de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Messias de Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"113", title:"Filhos de Duna", author:"Frank Herbert", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Filhos de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Filhos de Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"114", title:"Imperador Deus de Duna", author:"Frank Herbert", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Imperador-Deus de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Imperador-Deus de Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"115", title:"Hereges de Duna", author:"Frank Herbert", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Hereges de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Hereges de Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"116", title:"Herdeiras de Duna", author:"Frank Herbert", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Herdeiras de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Herdeiras de Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Jogos Vorazes ────────────────────────────────────────────────────────
{ id:"117", title:"A Cantiga dos Pássaros e das Serpentes", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/PDF/A Cantiga dos Pássaros e das Serpentes.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/CAPA/A Cantiga dos Pássaros e das Serpentes.jpg", collectionId:"Jogos Vorazes", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"118", title:"Amanhecer na Colheita", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/PDF/Amanhecer na Colheita.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/CAPA/Amanhecer na Colheita.jpg", collectionId:"Jogos Vorazes", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"119", title:"Jogos Vorazes", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/PDF/Jogos Vorazes.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/CAPA/Jogos Vorazes.jpg", collectionId:"Jogos Vorazes", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"120", title:"Em Chamas", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/PDF/Em Chamas.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/CAPA/Em Chamas.jpg", collectionId:"Jogos Vorazes", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"121", title:"A Esperança", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/PDF/A Esperança.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Jogos Vorazes/CAPA/A Esperança.jpg", collectionId:"Jogos Vorazes", addedDate:"2026-06-09T00:00:00.000Z" },

// ── As Crônicas do Subterrâneo ────────────────────────────────────────────────────────
{ id:"122", title:"Gregor, o Guerreiro da Superfície", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/PDF/Gregor, o Guerreiro da Superfície.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/CAPA/Gregor, o Guerreiro da Superfície.avif", collectionId:"As Crônicas do Subterrâneo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"123", title:"Gregor e a Segunda Profecia", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/PDF/Gregor e a Segunda Profecia.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/CAPA/Gregor e a Segunda Profecia.jpg", collectionId:"As Crônicas do Subterrâneo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"124", title:"Gregor e a Profecia de Sangue", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/PDF/Gregor e a Profecia de Sangue.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/CAPA/Gregor e a Profecia de Sangue.jpg", collectionId:"As Crônicas do Subterrâneo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"125", title:"Gregor e as Marcas Secretas", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/PDF/Gregor e as Marcas Secretas.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/CAPA/Gregor e as Marcas Secretas.jpg", collectionId:"As Crônicas do Subterrâneo", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"126", title:"Gregor e o Código da Garra", author:"Suzanne Collins", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/PDF/Gregor e o Código da Garra.pdf", coverPath:"https://mvin2006.github.io/LIVROS/As Crônicas do Subterrâneo/CAPA/Gregor e o Código da Garra.jpg", collectionId:"As Crônicas do Subterrâneo", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Crônicas de Duna ────────────────────────────────────────────────────────
{ id:"127", title:"Caçadores de Duna", author:"Brian Herbert e Kevin J. Anderson", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Caçadores de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Caçadores de Duna.png", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"128", title:"Vermes da Areia de Duna", author:"Brian Herbert e Kevin J. Anderson", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/PDF/Vermes da Areia de Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Crônicas de Duna/CAPA/Vermes da Areia de Duna.png", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"129", title:"Prelúdio de Duna", author:"Brian Herbert e Kevin J. Anderson", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Cr%C3%B4nicas%20de%20Duna/PDF/Preludio%20de%20Duna.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Cr%C3%B4nicas%20de%20Duna/CAPA/Prel%C3%BAdio%20a%20Duna.jpg", collectionId:"Crônicas de Duna", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Marvel ────────────Guerra Secreta (1984)────────────────────────────────────────────
  { id:"130", title:"Guerras Secretas 01 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2001%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2001%20(1984).webp?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"131", title:"Guerras Secretas 02 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2002%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2002%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"132", title:"Guerras Secretas 03 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2003%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2003%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"133", title:"Guerras Secretas 04 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2004%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2004%20(1984).webp?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"134", title:"Guerras Secretas 05 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2005%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2005%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"135", title:"Guerras Secretas 06 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2006%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2006%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"136", title:"Guerras Secretas 07 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2007%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2007%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"137", title:"Guerras Secretas 08 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2008%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2008%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"138", title:"Guerras Secretas 09 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2009%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2009%20(1984).webp?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"139", title:"Guerras Secretas 10 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2010%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2010%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"140", title:"Guerras Secretas 11 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2011%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2011%20(1984).webp?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },
  { id:"141", title:"Guerras Secretas 12 (1984)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1984)/PDF/Guerras%20Secretas%2012%20(1984).pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(1984)/CAPA/Guerras%20Secretas%2012%20(1984).jpg?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (1984)", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Marvel ──────────Guerra Secreta (1985) ────────────────────────────────────────────
{ id:"142", title:"Guerras Secretas II 01 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"143", title:"Guerras Secretas II 02 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2002.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2002.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"144", title:"Guerras Secretas II 03 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2003.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2003.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"145", title:"Guerras Secretas II 04 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2004.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2004.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"146", title:"Guerras Secretas II 05 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2005.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2005.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"147", title:"Guerras Secretas II 06 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2006.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2006.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"148", title:"Guerras Secretas II 07 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2007.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2007.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"149", title:"Guerras Secretas II 08 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2008.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2008.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },
{ id:"150", title:"Guerras Secretas II 09 (1985)", author:"Jim Shooter", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/PDF/Guerras%20Secretas%20II%2009.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(1985)/CAPA/Guerras%20Secretas%20II%2009.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas II (1985)", addedDate:"2026-06-09T00:00:00.000Z" },

// ── Marvel ──────────Guerra Secreta (2015) ────────────────────────────────────────────
  { id:"151", title:"001 As Secretas Guerras Secretas de Deadpool 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/001 As Secretas Guerras Secretas de Deadpool 001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/001 As Secretas Guerras Secretas de Deadpool 001.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"152", title:"002 As Secretas Guerras Secretas de Deadpool 002", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/002 As Secretas Guerras Secretas de Deadpool 002.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/002 As Secretas Guerras Secretas de Deadpool 002.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"153", title:"003 As Secretas Guerras Secretas de Deadpool 003", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/003 As Secretas Guerras Secretas de Deadpool 003.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/003 As Secretas Guerras Secretas de Deadpool 003.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"154", title:"004 As Secretas Guerras Secretas de Deadpool 004", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/004 As Secretas Guerras Secretas de Deadpool 004.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/004 As Secretas Guerras Secretas de Deadpool 004.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"155", title:"005 Mulher Aranha v5 10", author:"Dennis Hopeless", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/005 Mulher Aranha v5 10.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/005 Mulher Aranha v5 10.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"156", title:"005.1 Viuva Negra 19 (2015)", author:"Nathan Edmondson", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/005.1 Viuva Negra 19 (2015).pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/005.1 Viuva Negra 19 (2015).webp", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"157", title:"005.2 Viuva Negra 20 (2015)", author:"Nathan Edmondson", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/005.2 Viuva Negra 20 (2015).pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/005.2 Viuva Negra 20 (2015).jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"158", title:"006 Guerras Secretas 00 de 09", author:"Jonathan Hickman", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/006 Guerras Secretas 00 de 09.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/006 Guerras Secretas 00 de 09.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"159", title:"007 Guerras Secretas 01 de 09", author:"Jonathan Hickman", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/007 Guerras Secretas 01 de 09.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/007 Guerras Secretas 01 de 09.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"160", title:"008 Loki - Agente de Asgard 014", author:"Al Ewing", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/008 Loki - Agente de Asgard 014.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/008 Loki - Agente de Asgard 014.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"161", title:"009 Loki - Agente de Asgard 015", author:"Al Ewing", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/009 Loki - Agente de Asgard 015.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/009 Loki - Agente de Asgard 015.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },    
  { id:"162", title:"010 Miss Marvel v3 016", author:"Willow Wilson", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/010%20Miss%20Marvel%20v3%20016.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/010%20Miss%20Marvel%20v3%20016.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"163", title:"011 Miss Marvel v3 017", author:"Willow Wilson", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/011 Miss Marvel v3 017.pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(2015)/CAPA/011%20Miss%20Marvel%20v3%20017.png?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"164", title:"012 Miss Marvel v3 018", author:"Willow Wilson", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/012%20Miss%20Marvel%20v3%20018.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/012 Miss Marvel v3 018.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"165", title:"013 Miss Marvel v3 019", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/013 Miss Marvel v3 019.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/013 Miss Marvel v3 019.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"166", title:"014 Magneto v3 018", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/014%20Magneto%20v3%20018.pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(2015)/CAPA/014%20Miss%20Marvel%20v3%20019.png?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"167", title:"015 Magneto v3 019", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/015%20Magneto%20v3%20019.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/CAPA/015%20Magneto%20v3%20019.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"168", title:"016 Magneto v3 020", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/016%20Magneto%20v3%20020.pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(2015)/CAPA/016%20Magneto%20v3%20019.png?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"169", title:"017 Magneto v3 021", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras Secretas (2015)/PDF/017%20Magneto%20v3%20021.pdf", coverPath:"https://github.com/Mvin2006/HQ/blob/main/Marvel/Guerras%20Secretas%20(2015)/CAPA/017%20Magneto%20v3%20019.png?raw=true", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"170", title:"018 O Justiceiro V9 019", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/018%20O%20Justiceiro%20V9%20019.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/018%20O%20Justiceiro%20V9%20019.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"171", title:"019 O Justiceiro V9 020", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/019%20O%20Justiceiro%20V9%20020.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/019%20O%20Justiceiro%20V9%20020.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"172", title:"020 Homem Formiga V2 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/020%20Homem%20Formiga%20V2%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/020%20Homem%20Formiga%20V2%20001.png", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  
  { id:"173", title:"021 Seda 07", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/021%20Seda%2007.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/021%20Seda%2007.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z"},
  { id:"174", title:"022 Loki - Agente de Asgard 016", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/022%20Loki%20-%20Agente%20de%20Asgard%20016.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/022%20Loki%20-%20Agente%20de%20Asgard%20016.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"175", title:"023 Loki - Agente de Asgard 017", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/023%20Loki%20-%20Agente%20de%20Asgard%20017.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/023%20Loki%20-%20Agente%20de%20Asgard%20017.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"176", title:"024 Guerras Secretas 02 de 09 ", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/024%20Guerras%20Secretas%2002%20de%2009%20.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/024%20Guerras%20Secretas%2002%20de%2009%20.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"177", title:"025 Ultimate - O Fim 01 de 05 (2015)", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/025%20Ultimate%20-%20O%20Fim%2001%20de%2005%20(2015).pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/025%20Ultimate%20-%20O%20Fim%2001%20de%2005%20(2015).jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"178", title:"026 Mundo de Batalha 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/026%20Mundo%20de%20Batalha%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/026%20Mundo%20de%20Batalha%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"179", title:"027 Mundo de Batalha 002", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/027%20Mundo%20de%20Batalha%20002.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/027%20Mundo%20de%20Batalha%20002.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
  { id:"180", title:"028 Mestre do Kung Fu V2 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/028%20Mestre%20do%20Kung%20Fu%20V2%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/028%20Mestre%20do%20Kung%20Fu%20V2%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"181", title:"029 V-Force V1 001 - Guerras Secretas", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/029%20V-Force%20V1%20001%20-%20Guerras%20Secretas.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/029%20V-Force%20V1%20001%20-%20Guerras%20Secretas.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"182", title:"030 Planeta Hulk V2 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/030%20Planeta%20Hulk%20V2%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/030%20Planeta%20Hulk%20V2%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"183", title:"031 Universo Aranha V2 001 - Guerras Secreta", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/031%20Universo%20Aranha%20V2%20001%20-%20Guerras%20Secreta.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/031%20Universo%20Aranha%20V2%20001%20-%20Guerras%20Secreta.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"184", title:"032 Inumanos - A Ascensão de Attilan 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/032%20Inumanos%20-%20A%20Ascensão%20de%20Attilan%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/032%20Inumanos%20-%20A%20Ascensão%20de%20Attilan%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"185", title:"033 MODOC Assassino 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/033%20MODOC%20Assassino%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/033%20MODOC%20Assassino%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"186", title:"034 Guerras Secretas - Desafio Infinito V2 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/034%20Guerras%20Secretas%20-%20Desafio%20Infinito%20V2%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/034%20Guerras%20Secretas%20-%20Desafio%20Infinito%20V2%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"187", title:"035 O Velho Logan V2 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/035%20O%20Velho%20Logan%20V2%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/035%20O%20Velho%20Logan%20V2%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"188", title:"036 Guerras Secretas - Inferno V1 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/036%20Guerras%20Secretas%20-%20Inferno%20V1%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/036%20Guerras%20Secretas%20-%20Inferno%20V1%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"189", title:"037 Guerras Secretas 2099 V1 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/037%20Guerras%20Secretas%202099%20V1%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/037%20Guerras%20Secretas%202099%20V1%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"190", title:"038 Diário das Guerras Secretas 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/038%20Diário%20das%20Guerras%20Secretas%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/038%20Diário%20das%20Guerras%20Secretas%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"191", title:"039 Onde os Monstros Habitam V2 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/039%20Onde%20os%20Monstros%20Habitam%20V2%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/039%20Onde%20os%20Monstros%20Habitam%20V2%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"192", title:"040 X-Men _92 V1 001 - Guerras Secretas", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/040%20X-Men%20_92%20V1%20001%20-%20Guerras%20Secretas.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/040%20X-Men%20_92%20V1%20001%20-%20Guerras%20Secretas.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"193", title:"041 Guerras Secretas 03 de 09 ", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/041%20Guerras%20Secretas%2003%20de%2009%20.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/041%20Guerras%20Secretas%2003%20de%2009%20.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"194", title:"042 Mestre do Kung Fu V2 002", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/042%20Mestre%20do%20Kung%20Fu%20V2%20002.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/042%20Mestre%20do%20Kung%20Fu%20V2%20002.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"195", title:"043 Anos de um Futuro Esquecido V1 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/043%20Anos%20de%20um%20Futuro%20Esquecido%20V1%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/043%20Anos%20de%20um%20Futuro%20Esquecido%20V1%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"196", title:"044 Programa de Extermínio 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/044%20Programa%20de%20Extermínio%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/044%20Programa%20de%20Extermínio%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"197", title:"045 Gigantesca Pequena Marvel Vingadores vs X-Men 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/045%20Gigantesca%20Pequena%20Marvel%20Vingadores%20vs%20X-Men%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/045%20Gigantesca%20Pequena%20Marvel%20Vingadores%20vs%20X-Men%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"198", title:"046 Guerras Secretas - Futuro Imperfeito 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/046%20Guerras%20Secretas%20-%20Futuro%20Imperfeito%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/046%20Guerras%20Secretas%20-%20Futuro%20Imperfeito%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"199", title:"047 O Espetacular Homem-Aranha - Renovando Seus Votos 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/047%20O%20Espetacular%20Homem-Aranha%20-%20Renovando%20Seus%20Votos%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/047%20O%20Espetacular%20Homem-Aranha%20-%20Renovando%20Seus%20Votos%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"200", title:"048 Guerras Secretas - Guerra das Armaduras 001", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/048%20Guerras%20Secretas%20-%20Guerra%20das%20Armaduras%20001.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/048%20Guerras%20Secretas%20-%20Guerra%20das%20Armaduras%20001.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"201", title:"049 Ultimate - O Fim 02 de 05 (2015)", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/049%20Ultimate%20-%20O%20Fim%2002%20de%2005%20(2015).pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/049%20Ultimate%20-%20O%20Fim%2002%20de%2005%20(2015).jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"202", title:"050 Inumanos - A Ascensão de Attilan 002", author:"Cullen Bunn", fileType:"pdf", filePath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/PDF/050%20Inumanos%20-%20A%20Ascensão%20de%20Attilan%20002.pdf", coverPath:"https://mvin2006.github.io/HQ/Marvel/Guerras%20Secretas%20(2015)/CAPA/050%20Inumanos%20-%20A%20Ascensão%20de%20Attilan%20002.jpg", collectionId:"Marvel", subCollectionId:"Guerras Secretas (2015)", addedDate:"2026-08-27T00:00:00.000Z" },
    { id:"203", title:"Trono de Vidro", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/PDF/Trono%20de%20Vidro.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/CAPA/Trono%20de%20Vidro.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"204", title:"Coroa da Meia-Noite", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Coroa%20da%20Meia-Noite.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Coroa%20da%20Meia-Noite.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"205", title:"Herdeira do Fogo", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Herdeira%20do%20Fogo.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Herdeira%20do%20Fogo.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"206", title:"Império de Tempestades - 5.2", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Imp%C3%A9rio%20de%20Tempestades%20-%205.2.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Imp%C3%A9rio%20de%20Tempestades%20-%205.2.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"207", title:"Império de Tempestades", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Imp%C3%A9rio%20de%20Tempestades.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Imp%C3%A9rio%20de%20Tempestades.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"208", title:"Rainha das Sombras", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Rainha%20das%20Sombras.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Rainha%20das%20Sombras.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"209", title:"Reino de Cinzas", author:"Sarah J. Maas", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Reino%20de%20Cinzas.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Trono%20de%20Vidro/Reino%20de%20Cinzas.webp", collectionId:"Trono de Vidro", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"210", title:"O Cão dos Baskervilles", author:"Arthur Conan Doyle", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/O%20C%C3%A3o%20dos%20Baskervilles.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/O%20C%C3%A3o%20dos%20Baskervilles.webp", collectionId:"Sherlock Holmes", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"211", title:"O Signo dos Quatro", author:"Arthur Conan Doyle", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/O%20Signo%20dos%20Quatro.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/O%20Signo%20dos%20Quatro.webp", collectionId:"Sherlock Holmes", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"212", title:"O Vale do Medo", author:"Arthur Conan Doyle", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/O%20Vale%20do%20Medo.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/O%20Vale%20do%20Medo.webp", collectionId:"Sherlock Holmes", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"213", title:"Um Estudo em Vermelho", author:"Um Estudo em Vermelho", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/Um%20Estudo%20em%20Vermelho.pdf", coverPath:"https://mvin2006.github.io/LIVROS/Sherlock%20Holmes/Um%20Estudo%20em%20Vermelho.webp", collectionId:"Sherlock Holmes", addedDate:"2026-09-01T00:00:00.000Z" },
  { id:"214", title:"A Seleção", author:"Kiera Cass", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/A%20Sele%C3%A7%C3%A3o/A%20Sele%C3%A7%C3%A3o.pdf", coverPath:"https://mvin2006.github.io/LIVROS/A%20Sele%C3%A7%C3%A3o/A%20Sele%C3%A7%C3%A3o.webp", collectionId:"A Seleção", addedDate:"2026-09-02T00:00:00.000Z" },
  { id:"215", title:"A Elite", author:"Kiera Cass", fileType:"pdf", filePath:"https://mvin2006.github.io/LIVROS/A%20Sele%C3%A7%C3%A3o/A%20Elite.pdf", coverPath:"https://mvin2006.github.io/LIVROS/A%20Sele%C3%A7%C3%A3o/A%20Elite.webp", collectionId:"A Seleção", addedDate:"2026-09-02T00:00:00.000Z" },
  
  
];


const STORAGE_KEY = 'estante_books_v2';
const COLLECTIONS_STORAGE_KEY = 'estante_collections_v1';

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, show }: { message: string; show: boolean }) => (
  <div className={`toast ${show ? 'show' : ''}`}>{message}</div>
);

// ─── Add Book Form ─────────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (book: Omit<Book, 'id' | 'addedDate'>) => void;
  collections: Collection[];
}

function AddBookForm({ onAdd, collections }: AddFormProps) {
  const [title,      setTitle]      = useState('');
  const [author,     setAuthor]     = useState('');
  const [fileUrl,    setFileUrl]    = useState('');
  const [cover,      setCover]      = useState('');
  const [collection, setCollection] = useState('');
  const [subCollection, setSubCollection] = useState('');
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
      collectionId: collection || undefined,
      subCollectionId: subCollection || undefined,
    });
    setTitle(''); setAuthor(''); setFileUrl('');
    setCover(''); setCollection(''); setSubCollection(''); setDetectedType('pdf');
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
          placeholder="https://.../arquivo.pdf ou .epub"
          className={inputClass}
          required
        />
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
          Suporta <strong className="text-[var(--text-sub)]">PDF</strong> e <strong className="text-[var(--text-sub)]">EPUB</strong>. O tipo é detectado automaticamente pela extensão.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Link da capa <span className="normal-case text-[var(--text-muted)] font-normal">(opcional)</span></label>
          <Input value={cover} onChange={e => setCover(e.target.value)} placeholder="https://.../capa.jpg" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Coleção / Série</label>
          <select value={collection} onChange={e => { setCollection(e.target.value); setSubCollection(''); }} className={`w-full h-9 rounded-md border px-3 text-sm ${inputClass}`}>
            <option value="">Sem Coleção</option>
            {collections.filter(item => !item.parentId).map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Subcoleção <span className="normal-case text-[var(--text-muted)] font-normal">(opcional)</span></label>
          <select value={subCollection} onChange={e => setSubCollection(e.target.value)} disabled={!collection} className={`w-full h-9 rounded-md border px-3 text-sm ${inputClass} disabled:opacity-50`}>
            <option value="">Sem Subcoleção</option>
            {collections.filter(item => item.parentId === collection).map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" className="w-full bg-[var(--gold)] text-[var(--bg)] hover:bg-[#d6bc80] font-semibold h-11 transition-colors">
        <Plus className="w-4 h-4 mr-2" />
        Adicionar à Biblioteca
      </Button>
    </form>
  );
}

interface AddCollectionFormProps {
  collections: Collection[];
  onAdd: (name: string, parentId?: string) => void;
}

function AddCollectionForm({ collections, onAdd }: AddCollectionFormProps) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd(name, parentId || undefined);
    setName('');
  };

  const inputClass = 'bg-[var(--bg-4)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--gold-dim)] transition-colors';

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 bg-[var(--bg-3)] border border-[var(--border)] rounded-xl">
      <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wider font-medium">Nova coleção</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="Nome da coleção" className={inputClass} required />
        <select value={parentId} onChange={event => setParentId(event.target.value)} className={`h-9 rounded-md border px-3 text-sm ${inputClass}`}>
          <option value="">Coleção principal</option>
          {collections.map(collection => <option key={collection.id} value={collection.id}>{collection.parentId ? `↳ ${collection.name}` : collection.name}</option>)}
        </select>
        <Button type="submit" className="bg-[var(--gold)] text-[var(--bg)] hover:bg-[#d6bc80] font-semibold">
          <Plus className="w-4 h-4 mr-2" />Adicionar
        </Button>
      </div>
    </form>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    if (typeof window === 'undefined') return PRELOADED_BOOKS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const userBooks: Book[] = (saved ? JSON.parse(saved) : []).filter(
        (book: Book) => book.fileType === 'pdf' || book.fileType === 'epub'
      );
      const preloadedIds = new Set(PRELOADED_BOOKS.map(b => b.id));
      const extras = userBooks.filter(b => !preloadedIds.has(b.id));
      return [...PRELOADED_BOOKS, ...extras];
    } catch {
      return PRELOADED_BOOKS;
    }
  });

  const [collectionDefinitions, setCollectionDefinitions] = useState<Collection[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_COLLECTIONS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const userBooks: Book[] = (saved ? JSON.parse(saved) : []).filter(
        (book: Book) => book.fileType === 'pdf' || book.fileType === 'epub'
      );
      const savedCollections: Collection[] = JSON.parse(localStorage.getItem(COLLECTIONS_STORAGE_KEY) || '[]');
      const bookCollections = [...PRELOADED_BOOKS, ...userBooks].flatMap(book => {
        const definitions: Collection[] = [];
        if (book.collectionId) definitions.push({ id: book.collectionId, name: book.collectionId });
        if (book.subCollectionId) {
          definitions.push({ id: book.subCollectionId, name: book.subCollectionId, parentId: book.collectionId });
        }
        return definitions;
      });
      const bookIds = new Set([...PRELOADED_BOOKS, ...userBooks].flatMap(book => [book.collectionId, book.subCollectionId].filter(Boolean)));
      return [...DEFAULT_COLLECTIONS, ...savedCollections.filter(collection =>
        !LEGACY_AUTOMATIC_SUBCOLLECTIONS.has(collection.id) || bookIds.has(collection.id)
      ), ...bookCollections].filter((collection, index, all) => all.findIndex(item => item.id === collection.id) === index);
    } catch {
      return DEFAULT_COLLECTIONS;
    }
  });

  const [activeTab,          setActiveTab]          = useState<'books' | 'collections' | 'config'>('books');
  const [searchQuery,        setSearchQuery]        = useState('');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [readingBook,        setReadingBook]        = useState<Book | null>(null);
  const [toast,              setToast]              = useState({ message: '', show: false });
  const [viewMode,           setViewMode]           = useState<'grid' | 'list'>('grid');

  // ── Persist user-added books ───────────────────────────────────────────────
  useEffect(() => {
    if (books.length === 0) return;
    const userBooks = books.filter(b => b.id.startsWith('u_'));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userBooks));
  }, [books]);

  useEffect(() => {
    localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(collectionDefinitions));
  }, [collectionDefinitions]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((message: string) => {
    setToast({ message, show: true });
    setTimeout(() => setToast({ message: '', show: false }), 2800);
  }, []);

  // ── Collections ────────────────────────────────────────────────────────────
  const collections = useMemo(() => {
    return collectionDefinitions.map(collection => {
      const childIds = collectionDefinitions.filter(item => sameCollectionId(item.parentId, collection.id)).map(item => item.id);
      const collectionBooks = books.filter(book =>
        sameCollectionId(book.collectionId, collection.id) ||
        sameCollectionId(book.subCollectionId, collection.id) ||
        childIds.some(childId => sameCollectionId(childId, book.subCollectionId) || sameCollectionId(childId, book.collectionId))
      );
      return {
        ...collection,
        count: collectionBooks.length,
        covers: collectionBooks.filter(book => book.coverPath).slice(0, 3).map(book => book.coverPath!),
        authors: [...new Set(collectionBooks.map(book => book.author))].slice(0, 2),
      };
    });
  }, [books, collectionDefinitions]);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filteredBooks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return books.filter(book => {
      const matchSearch = !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q);
      const childIds = collectionDefinitions.filter(item => sameCollectionId(item.parentId, selectedCollection || undefined)).map(item => item.id);
      const matchCol = !selectedCollection || sameCollectionId(book.collectionId, selectedCollection) || sameCollectionId(book.subCollectionId, selectedCollection) || childIds.some(childId => sameCollectionId(childId, book.collectionId) || sameCollectionId(childId, book.subCollectionId));
      return matchSearch && matchCol;
    });
  }, [books, collectionDefinitions, searchQuery, selectedCollection]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const addBook = useCallback((data: Omit<Book, 'id' | 'addedDate'>) => {
    setBooks(prev => [...prev, { ...data, id: 'u_' + Date.now(), addedDate: new Date().toISOString() }]);
    if (data.collectionId && !collectionDefinitions.some(collection => collection.id === data.collectionId)) {
      setCollectionDefinitions(prev => [...prev, { id: data.collectionId!, name: data.collectionId! }]);
    }
    showToast('✓ Livro adicionado com sucesso!');
  }, [collectionDefinitions, showToast]);

  const addCollection = useCallback((name: string, parentId?: string) => {
    const normalizedName = name.trim();
    if (!normalizedName || collectionDefinitions.some(collection => collection.id === normalizedName)) return;
    setCollectionDefinitions(prev => [...prev, { id: normalizedName, name: normalizedName, parentId }]);
    showToast('✓ Coleção adicionada com sucesso!');
  }, [collectionDefinitions, showToast]);

  const removeBook = useCallback((id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    showToast('✓ Livro removido');
  }, [showToast]);

  const selectCollection = useCallback((id: string) => {
    setSelectedCollection(id);
    setActiveTab(collectionDefinitions.some(collection => collection.parentId === id) ? 'collections' : 'books');
  }, [collectionDefinitions]);

  // ── Reader renderer ────────────────────────────────────────────────────────
  const renderReader = () => {
    if (!readingBook) return null;
    const close = () => setReadingBook(null);
    if (readingBook.fileType === 'epub') {
      return <EpubReader url={readingBook.filePath} title={readingBook.title} author={readingBook.author} coverUrl={readingBook.coverPath} onClose={close} />;
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
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index < 6 ? 'high' : 'low'}
            decoding="async"
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
        {(book.collectionId || book.subCollectionId) && (
          <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-[var(--gold-dim)] bg-[var(--gold-glow2)] border border-[rgba(201,171,110,0.15)] rounded">
            {book.subCollectionId || book.collectionId}
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
          ? <img src={book.coverPath} alt="" className="w-full h-full object-cover" loading={index < 6 ? 'eager' : 'lazy'} fetchPriority={index < 6 ? 'high' : 'low'} decoding="async" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="flex items-center justify-center w-full h-full text-[var(--text-muted)]">{fileTypeIcon(book.fileType)}</div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif font-semibold text-[var(--text)] text-sm truncate group-hover:text-[var(--gold)] transition-colors">{book.title}</p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{book.author}</p>
        {(book.collectionId || book.subCollectionId) && (
          <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--gold-dim)] bg-[var(--gold-glow2)] border border-[rgba(201,171,110,0.15)] rounded">
            {book.subCollectionId || book.collectionId}
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
      {(book.collectionId || book.subCollectionId) && (
        <span className="hidden md:inline text-[10px] text-[var(--gold-dim)] bg-[var(--gold-glow2)] px-2 py-0.5 rounded border border-[rgba(201,171,110,0.12)] whitespace-nowrap">
          {book.subCollectionId || book.collectionId}
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
            {(['pdf','epub'] as FileType[]).map(ft => {
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

            {/* Search */}
            <div className="px-4 lg:px-10 pb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar título ou autor…"
                  className="pl-10 bg-[var(--bg-3)] border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-muted)] h-10 focus:border-[var(--gold-dim)] transition-colors"
                  aria-label="Buscar livros"
                />
              </div>
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
              ) : selectedCollection && collectionDefinitions.some(collection => collection.parentId === selectedCollection) ? (
                <div>
                  <button onClick={() => setSelectedCollection(null)} className="icon-btn w-9 h-9 mb-4" aria-label="Voltar às coleções">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-serif text-xl text-[var(--text)] mb-4">
                    <em className="text-[var(--gold)] not-italic">{selectedCollection}</em>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.filter(collection => collection.parentId === selectedCollection).map((child, i) => (
                      <button key={child.id} onClick={() => selectCollection(child.id)} className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-5 text-left card-hover animate-cardIn" style={{ animationDelay: `${i * 0.06}s` }}>
                        <div className="w-12 h-16 mb-4 bg-[var(--bg-4)] rounded flex items-center justify-center overflow-hidden">
                          {child.covers[0] ? <img src={child.covers[0]} alt="" className="w-full h-full object-cover" /> : <FolderOpen className="w-6 h-6 text-[var(--text-muted)]" />}
                        </div>
                        <h4 className="font-serif text-lg font-semibold text-[var(--text)] mb-2">{child.name}</h4>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--bg-4)] border border-[var(--border)] rounded-full text-xs text-[var(--gold)] font-medium">
                          <BookOpen className="w-3 h-3" />{child.count} {child.count === 1 ? 'livro' : 'livros'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collections.filter(col => !col.parentId).map((col, i) => (
                    <div
                      key={col.id}
                      className="bg-[var(--bg-3)] border border-[var(--border)] rounded-xl p-5 cursor-pointer card-hover animate-cardIn text-left"
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => selectCollection(col.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') selectCollection(col.id); }}
                    >
                      <div className="flex gap-2 mb-4">
                        {col.covers.length > 0 ? col.covers.map((cover, idx) => (
                          <img key={idx} src={cover} alt="" loading="lazy"
                            fetchPriority="low" decoding="async"
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
                    </div>
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
              <AddCollectionForm collections={collections} onAdd={addCollection} />
              {/* Format info banner */}
              <div className="mb-6 p-4 bg-[var(--bg-3)] border border-[var(--border)] rounded-xl">
                <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider font-medium">Formatos suportados</p>
                <div className="flex flex-wrap gap-3">
                  {([
                    { ft: 'pdf' as FileType, label: 'PDF', desc: 'Livros e documentos' },
                    { ft: 'epub' as FileType, label: 'EPUB', desc: 'Livros digitais' },
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
                  <AddBookForm onAdd={addBook} collections={collections} />
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
