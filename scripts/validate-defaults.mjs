import fs from 'fs';
import path from 'path';

const appPath = path.resolve(process.cwd(), 'src/App.tsx');
const source = fs.readFileSync(appPath, 'utf8');

const startMarker = 'const DEFAULT_COLLECTIONS: Collection[] = [';
const startIndex = source.indexOf(startMarker);

if (startIndex === -1) {
  console.error('❌ DEFAULT_COLLECTIONS não foi encontrado em src/App.tsx');
  process.exit(1);
}

const arrayStart = startIndex + startMarker.length;
const endIndex = source.indexOf('];', arrayStart);

if (endIndex === -1) {
  console.error('❌ Bloco DEFAULT_COLLECTIONS finalizado incorretamente em src/App.tsx');
  process.exit(1);
}

const arrayChunk = source.slice(arrayStart, endIndex);

if (arrayChunk.includes('title:') || arrayChunk.includes('author:') || arrayChunk.includes('fileType:')) {
  console.error('❌ Estrutura inválida detectada em src/App.tsx: o array de coleções foi contaminado com objetos de livro.');
  console.error('Corrija DEFAULT_COLLECTIONS para conter apenas objetos { id, name } e não itens de livros.');
  process.exit(1);
}

const hasValidShape = /\{\s*id:\s*['"][^'"\n]+['"]\s*,\s*name:\s*['"][^'"\n]+['"]\s*\}/.test(arrayChunk);

if (!hasValidShape) {
  console.error('❌ DEFAULT_COLLECTIONS não está no formato correto. Use apenas { id, name }.');
  process.exit(1);
}

console.log('✅ Validação de DEFAULT_COLLECTIONS concluída com sucesso.');
