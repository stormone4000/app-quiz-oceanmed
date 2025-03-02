import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// URL e chiavi per il database remoto
const REMOTE_SUPABASE_URL = 'https://uqutbomzymeklyowfewp.supabase.co';
const REMOTE_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Crea il client Supabase
const supabase = createClient(REMOTE_SUPABASE_URL, REMOTE_SUPABASE_SERVICE_KEY);

// Cartella per i backup
const BACKUP_DIR = path.resolve(process.cwd(), 'supabase_backup/schema');

// Assicurati che la cartella di backup esista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Funzione per ottenere la struttura di una tabella
 */
async function getTableStructure(tableName) {
  console.log(`Ottengo la struttura della tabella: ${tableName}`);
  
  try {
    // Esegui una query SQL diretta per ottenere la struttura della tabella
    const { data, error } = await supabase.rpc('pgdescribe', { table_name: `public.${tableName}` });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error(`Errore nell'ottenere la struttura della tabella ${tableName} con pgdescribe:`, error.message);
    
    // Prova con una query SQL diretta
    try {
      const { data, error } = await supabase.from(tableName).select('*').limit(1);
      
      if (error) {
        throw error;
      }
      
      // Se abbiamo ottenuto un record, possiamo dedurre la struttura
      if (data && data.length > 0) {
        const structure = Object.keys(data[0]).map(column => ({
          column_name: column,
          data_type: typeof data[0][column]
        }));
        
        return structure;
      }
      
      return null;
    } catch (alternativeError) {
      console.error(`Anche l'approccio alternativo è fallito:`, alternativeError.message);
      return null;
    }
  }
}

/**
 * Funzione per ottenere l'elenco delle tabelle
 */
async function getTablesList() {
  console.log('Ottengo l\'elenco delle tabelle...');
  
  try {
    // Esegui una query SQL diretta per ottenere l'elenco delle tabelle
    const { data, error } = await supabase.rpc('list_tables');
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Errore nell\'ottenere l\'elenco delle tabelle con list_tables:', error.message);
    
    // Prova con una query SQL diretta
    try {
      const { data, error } = await supabase.from('_tables').select('name').eq('schema', 'public');
      
      if (error) {
        throw error;
      }
      
      return data.map(t => t.name);
    } catch (alternativeError) {
      console.error('Anche l\'approccio alternativo è fallito:', alternativeError.message);
      
      // Elenco predefinito di tabelle
      return [
        'quiz_types',
        'quizzes',
        'questions',
        'quiz_templates',
        'quiz_questions',
        'subscriptions'
      ];
    }
  }
}

/**
 * Funzione per eseguire una query SQL diretta
 */
async function executeSQL(query) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { query });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Errore nell\'esecuzione della query SQL:', error.message);
    return null;
  }
}

/**
 * Funzione principale
 */
async function main() {
  console.log('Inizio recupero della struttura delle tabelle...');
  
  // Prova a ottenere l'elenco delle tabelle con una query SQL diretta
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `;
  
  let tables = await executeSQL(tablesQuery);
  
  if (!tables || tables.length === 0) {
    // Se la query SQL diretta fallisce, usa l'approccio alternativo
    tables = await getTablesList();
  }
  
  if (!tables || tables.length === 0) {
    console.error('Nessuna tabella trovata o errore nel recupero dell\'elenco delle tabelle');
    return;
  }
  
  // Estrai i nomi delle tabelle
  const tableNames = Array.isArray(tables[0]) 
    ? tables.map(row => row[0]) 
    : (typeof tables[0] === 'object' ? tables.map(row => row.table_name) : tables);
  
  console.log(`Trovate ${tableNames.length} tabelle:`, tableNames);
  
  // Crea un file SQL per ogni tabella
  for (const tableName of tableNames) {
    // Ottieni la struttura della tabella con una query SQL diretta
    const structureQuery = `
      SELECT 
        column_name, 
        data_type,
        is_nullable,
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' 
        AND table_name = '${tableName}'
    `;
    
    const structure = await executeSQL(structureQuery);
    
    if (structure && structure.length > 0) {
      console.log(`Struttura della tabella ${tableName} ottenuta con successo`);
      
      // Salva la struttura in un file JSON
      const jsonPath = path.join(BACKUP_DIR, `${tableName}_structure.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(structure, null, 2));
      console.log(`Struttura salvata in: ${jsonPath}`);
      
      // Genera lo script SQL per creare la tabella
      const createTableSQL = generateCreateTableSQL(tableName, structure);
      const sqlPath = path.join(BACKUP_DIR, `${tableName}_create.sql`);
      fs.writeFileSync(sqlPath, createTableSQL);
      console.log(`Script SQL salvato in: ${sqlPath}`);
    } else {
      // Prova l'approccio alternativo
      const altStructure = await getTableStructure(tableName);
      
      if (altStructure) {
        console.log(`Struttura della tabella ${tableName} ottenuta con l'approccio alternativo`);
        
        // Salva la struttura in un file JSON
        const jsonPath = path.join(BACKUP_DIR, `${tableName}_structure.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(altStructure, null, 2));
        console.log(`Struttura salvata in: ${jsonPath}`);
      } else {
        console.log(`Impossibile ottenere la struttura della tabella ${tableName}`);
      }
    }
  }
  
  console.log('Recupero della struttura delle tabelle completato!');
}

/**
 * Funzione per generare lo script SQL per creare una tabella
 */
function generateCreateTableSQL(tableName, structure) {
  if (!structure || structure.length === 0) {
    return '';
  }
  
  const columns = structure.map(col => {
    // Estrai i valori dalla struttura
    const columnName = Array.isArray(col) ? col[0] : col.column_name;
    const dataType = Array.isArray(col) ? col[1] : col.data_type;
    const isNullable = Array.isArray(col) ? col[2] === 'YES' : col.is_nullable === 'YES';
    const defaultValue = Array.isArray(col) ? col[3] : col.column_default;
    
    // Costruisci la definizione della colonna
    let columnDef = `    "${columnName}" ${dataType}`;
    
    if (!isNullable) {
      columnDef += ' NOT NULL';
    }
    
    if (defaultValue) {
      columnDef += ` DEFAULT ${defaultValue}`;
    }
    
    return columnDef;
  }).join(',\n');
  
  return `CREATE TABLE IF NOT EXISTS "public"."${tableName}" (\n${columns}\n);\n`;
}

// Esegui la funzione principale
main().catch(error => {
  console.error('Errore durante l\'esecuzione:', error);
  process.exit(1);
}); 