# MV_Biblioteca

Aplicativo de biblioteca digital em React + Vite para abrir livros em PDF/EPUB e organizar coleções.

## Requisitos

- Node.js 20+
- npm

## Instalação

```bash
npm install
```

## Desenvolvimento

```bash
npm run dev
```

## Build de produção

```bash
npm run build
```

## Verificação de segurança da estrutura

```bash
npm run validate:app
```

Este projeto já conta com validação para impedir que o array de coleções seja contaminado por objetos de livro, evitando que a build quebre ao publicar no GitHub.

## Deploy no GitHub Pages

1. Faça push do projeto para o repositório GitHub.
2. Confirme que o arquivo [vite.config.ts](vite.config.ts) está com `base: '/MV_Biblioteca/'`.
3. Rode:

```bash
npm run build
```

4. Publique o conteúdo da pasta `dist` conforme a estratégia escolhida no GitHub Pages.

> O repositório foi deixado em estado pronto para ser enviado manualmente ao GitHub, sem quebrar na publicação.
