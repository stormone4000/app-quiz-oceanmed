import { createClient } from '@supabase/supabase-js';

// URL e chiavi per il database remoto
const REMOTE_SUPABASE_URL = 'https://uqutbomzymeklyowfewp.supabase.co';
const REMOTE_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Crea il client Supabase
const supabase = createClient(REMOTE_SUPABASE_URL, REMOTE_SUPABASE_SERVICE_KEY);

/**
 * Funzione per eseguire una query SQL diretta
 */
async function executeSQL(query) {
  try {
    // Esegui una query SQL diretta utilizzando la funzione rpc
    const { data, error } = await supabase.rpc('execute_sql', { query });
    
    if (error) {
      // Se la funzione rpc non è disponibile, prova con un approccio alternativo
      console.error('Errore nell\'esecuzione della query SQL con rpc:', error.message);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Errore nell\'esecuzione della query SQL:', error.message);
    return null;
  }
}

/**
 * Funzione alternativa per ottenere l'elenco delle tabelle
 */
async function getTablesAlternative() {
  try {
    // Prova a ottenere l'elenco delle tabelle con una query diretta
    const tables = [];
    
    // Prova a interrogare alcune tabelle comuni
    const commonTables = [
      'quiz_types',
      'quizzes',
      'questions',
      'quiz_templates',
      'quiz_questions',
      'subscriptions',
      'profiles',
      'users'
    ];
    
    for (const tableName of commonTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (!error) {
        tables.push(tableName);
        console.log(`Tabella trovata: ${tableName}`);
      }
    }
    
    return tables;
  } catch (error) {
    console.error('Errore nell\'ottenere l\'elenco delle tabelle con approccio alternativo:', error.message);
    return [];
  }
}

/**
 * Funzione principale
 */
async function main() {
  console.log('Ottengo l\'elenco delle tabelle dal database remoto...');
  
  // Prova a ottenere l'elenco delle tabelle con una query SQL diretta
  const tablesQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  
  let tables = await executeSQL(tablesQuery);
  
  if (!tables || tables.length === 0) {
    console.log('Query SQL diretta fallita, provo con un approccio alternativo...');
    tables = await getTablesAlternative();
  }
  
  if (tables && tables.length > 0) {
    console.log('\nTabelle trovate nel database remoto:');
    
    // Formatta l'output in base al tipo di dati restituito
    if (Array.isArray(tables) && typeof tables[0] === 'string') {
      // Se è un array di stringhe
      tables.forEach(tableName => console.log(`- ${tableName}`));
    } else if (Array.isArray(tables) && Array.isArray(tables[0])) {
      // Se è un array di array
      tables.forEach(row => console.log(`- ${row[0]}`));
    } else if (Array.isArray(tables) && typeof tables[0] === 'object') {
      // Se è un array di oggetti
      tables.forEach(row => console.log(`- ${row.table_name || Object.values(row)[0]}`));
    } else {
      console.log('Formato dei dati non riconosciuto:', tables);
    }
  } else {
    console.log('Nessuna tabella trovata o errore nel recupero dell\'elenco delle tabelle');
  }
}

// Esegui la funzione principale
main().catch(error => {
  console.error('Errore durante l\'esecuzione:', error);
  process.exit(1);
}); 