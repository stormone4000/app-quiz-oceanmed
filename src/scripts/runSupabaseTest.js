// Script per eseguire il test di connessione a Supabase
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

async function runTest() {
  try {
    // Compila lo script TypeScript in JavaScript
    await build({
      entryPoints: [path.resolve(__dirname, 'testSupabaseConnection.ts')],
      bundle: true,
      platform: 'node',
      outfile: path.resolve(__dirname, 'testSupabaseConnection.js'),
      format: 'cjs',
      external: ['react', 'react-dom', '@supabase/supabase-js'],
    });

    console.log('Script compilato con successo, eseguo il test...\n');

    // Importa ed esegui lo script compilato
    const { testSupabaseConnection } = require('./testSupabaseConnection.js');
    await testSupabaseConnection();
  } catch (error) {
    console.error('Errore durante l\'esecuzione del test:', error);
    process.exit(1);
  }
}

runTest(); 