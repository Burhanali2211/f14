import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const source = join(rootDir, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const dest = join(rootDir, 'public', 'pdf.worker.min.mjs');

try {
  // Ensure public directory exists
  const publicDir = join(rootDir, 'public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }
  
  copyFileSync(source, dest);
  console.log('✓ PDF.js worker file copied to public directory');
} catch (error) {
  console.warn('⚠ Could not copy PDF.js worker file:', error.message);
  console.warn('  You may need to manually copy node_modules/pdfjs-dist/build/pdf.worker.min.mjs to public/pdf.worker.min.mjs');
}

