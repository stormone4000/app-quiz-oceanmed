import fs from 'fs';
import path from 'path';

// Cartella dei backup
const BACKUP_DIR = path.resolve(process.cwd(), 'supabase_backup/data');
// File di output
const OUTPUT_FILE = path.resolve(process.cwd(), 'supabase_backup/insert_data.sql');

// Elenco delle tabelle
const TABLES = [
  'quiz_types',
  'questions',
  'quiz_templates',
  'quiz_questions',
  'subscriptions'
];

/**
 * Funzione per formattare un valore per SQL
 */
function formatValueForSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (typeof value === 'object') {
    // Converti gli oggetti in JSON
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  
  // Stringhe
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Funzione per generare le istruzioni INSERT per una tabella
 */
function generateInsertStatements(tableName, data) {
  if (!data || data.length === 0) {
    return `-- Nessun dato trovato per la tabella ${tableName}\n`;
  }
  
  let sql = `-- Inserimento dati nella tabella ${tableName}\n`;
  
  // Ottieni i nomi delle colonne dal primo record
  const columns = Object.keys(data[0]);
  
  // Genera un'istruzione INSERT per ogni record
  for (const record of data) {
    const values = columns.map(col => formatValueForSQL(record[col]));
    
    sql += `INSERT INTO "public"."${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
  }
  
  return sql + '\n';
}

/**
 * Funzione principale
 */
function main() {
  console.log('Generazione delle istruzioni SQL di inserimento dai file JSON di backup...');
  
  let sqlContent = '-- Script generato automaticamente per l\'inserimento dei dati\n\n';
  
  for (const tableName of TABLES) {
    const jsonPath = path.join(BACKUP_DIR, `${tableName}.json`);
    
    if (fs.existsSync(jsonPath)) {
      console.log(`Elaborazione del file ${jsonPath}...`);
      
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          console.log(`Trovati ${jsonData.length} record per la tabella ${tableName}`);
          
          const insertStatements = generateInsertStatements(tableName, jsonData);
          sqlContent += insertStatements;
        } else {
          console.log(`Nessun dato trovato nel file ${jsonPath}`);
          sqlContent += `-- Nessun dato trovato per la tabella ${tableName}\n\n`;
        }
      } catch (error) {
        console.error(`Errore nell'elaborazione del file ${jsonPath}:`, error.message);
        sqlContent += `-- Errore nell'elaborazione dei dati per la tabella ${tableName}: ${error.message}\n\n`;
      }
    } else {
      console.log(`File ${jsonPath} non trovato`);
      sqlContent += `-- File di backup non trovato per la tabella ${tableName}\n\n`;
    }
  }
  
  // Scrivi il file SQL
  fs.writeFileSync(OUTPUT_FILE, sqlContent);
  console.log(`File SQL generato: ${OUTPUT_FILE}`);
}

// Esegui la funzione principale
main(); 