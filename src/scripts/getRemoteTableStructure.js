import { createClient } from '@supabase/supabase-js';

// URL e chiavi per il database remoto
const REMOTE_SUPABASE_URL = 'https://uqutbomzymeklyowfewp.supabase.co';
const REMOTE_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Crea il client Supabase
const supabase = createClient(REMOTE_SUPABASE_URL, REMOTE_SUPABASE_SERVICE_KEY);

// Elenco delle tabelle da analizzare
const TABLES = [
  'quiz_types',
  'quizzes',
  'questions',
  'quiz_templates',
  'quiz_questions',
  'subscriptions'
];

/**
 * Funzione per ottenere la struttura di una tabella
 */
async function getTableStructure(tableName) {
  console.log(`\nAnalisi della struttura della tabella: ${tableName}`);
  
  try {
    // Ottieni un record di esempio per dedurre la struttura
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log(`Nessun dato trovato nella tabella ${tableName}`);
      return null;
    }
    
    // Estrai la struttura dal record di esempio
    const sampleRecord = data[0];
    const structure = Object.keys(sampleRecord).map(column => {
      const value = sampleRecord[column];
      let type = typeof value;
      
      if (value === null) {
        type = 'null';
      } else if (value instanceof Date) {
        type = 'date';
      } else if (Array.isArray(value)) {
        type = 'array';
      }
      
      return {
        column: column,
        type: type,
        example: value
      };
    });
    
    return structure;
  } catch (error) {
    console.error(`Errore nell'ottenere la struttura della tabella ${tableName}:`, error.message);
    return null;
  }
}

/**
 * Funzione per ottenere il conteggio dei record in una tabella
 */
async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    return count;
  } catch (error) {
    console.error(`Errore nel conteggio dei record nella tabella ${tableName}:`, error.message);
    return 'N/A';
  }
}

/**
 * Funzione principale
 */
async function main() {
  console.log('Analisi della struttura delle tabelle nel database remoto...');
  
  for (const tableName of TABLES) {
    try {
      // Ottieni il conteggio dei record
      const recordCount = await getTableCount(tableName);
      console.log(`\n=== Tabella: ${tableName} (${recordCount} record) ===`);
      
      // Ottieni la struttura della tabella
      const structure = await getTableStructure(tableName);
      
      if (structure) {
        console.log('Struttura della tabella:');
        console.table(structure);
      } else {
        console.log('Impossibile ottenere la struttura della tabella');
      }
    } catch (error) {
      console.error(`Errore durante l'analisi della tabella ${tableName}:`, error.message);
    }
  }
  
  console.log('\nAnalisi completata!');
}

// Esegui la funzione principale
main().catch(error => {
  console.error('Errore durante l\'esecuzione:', error);
  process.exit(1);
}); 