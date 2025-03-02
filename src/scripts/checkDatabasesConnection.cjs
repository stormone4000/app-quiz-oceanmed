// Script per verificare la connessione ai database Supabase
const { createClient } = require('@supabase/supabase-js');

// Configurazione vecchio database
const oldSupabaseUrl = 'https://axfqxbthjalzzshdjedm.supabase.co';
const oldSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZnF4YnRoamFsenpzaGRqZWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMzc5OTcsImV4cCI6MjA1MjYxMzk5N30.bgbIEMvJaHDos6KUQJySgS3Pkv6XA412CVBKmnPo3Bc';

// Configurazione nuovo database
const newSupabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const newSupabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

// Crea i client Supabase
const oldSupabase = createClient(oldSupabaseUrl, oldSupabaseKey);
const newSupabase = createClient(newSupabaseUrl, newSupabaseKey);

// Lista delle tabelle che sappiamo esistere nel vecchio database
// Questa lista è basata sui risultati del test precedente e sui file di migrazione
const knownTables = [
  'auth_users',
  'subscriptions',
  'access_codes',
  'quiz_sessions',
  'notifications',
  'quizzes',
  'questions',
  'answers',
  'quiz_results',
  'quiz_participants',
  'user_profiles',
  'access_code_usage'
];

/**
 * Funzione per verificare la connessione a un database
 */
async function checkConnection(supabase, dbName) {
  console.log(`\nVerifica connessione a ${dbName}...`);
  
  try {
    // Tentiamo una semplice query per verificare la connessione
    const { data, error } = await supabase.from('auth_users').select('*').limit(1);
    
    if (error) {
      console.error(`❌ Errore di connessione a ${dbName}:`, error.message);
      return false;
    }
    
    console.log(`✅ Connessione a ${dbName} stabilita con successo!`);
    return true;
  } catch (error) {
    console.error(`❌ Errore di connessione a ${dbName}:`, error);
    return false;
  }
}

/**
 * Funzione per verificare l'esistenza di una tabella
 */
async function checkTableExists(supabase, tableName) {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    
    // Se c'è un errore specifico che indica che la tabella non esiste
    if (error && error.message.includes('does not exist')) {
      return false;
    }
    
    // Se c'è un altro tipo di errore, assumiamo che la tabella esista ma abbiamo problemi di permessi
    return true;
  } catch (error) {
    // In caso di errore generico, assumiamo che la tabella non esista
    return false;
  }
}

/**
 * Funzione principale per verificare i database
 */
async function checkDatabases() {
  console.log('==========================================');
  console.log('Verifica connessione ai database Supabase');
  console.log('==========================================');

  // Verifica connessione al vecchio database
  const oldDbConnected = await checkConnection(oldSupabase, 'Vecchio DB');
  
  // Verifica connessione al nuovo database
  const newDbConnected = await checkConnection(newSupabase, 'Nuovo DB');
  
  if (!oldDbConnected || !newDbConnected) {
    console.error('\n❌ Impossibile procedere a causa di problemi di connessione');
    return;
  }
  
  console.log('\n--- VERIFICA TABELLE ---');
  
  // Verifica quali tabelle esistono in entrambi i database
  const tableStatus = {};
  
  for (const table of knownTables) {
    console.log(`\nVerifica tabella '${table}'...`);
    
    const existsInOld = await checkTableExists(oldSupabase, table);
    const existsInNew = await checkTableExists(newSupabase, table);
    
    tableStatus[table] = {
      existsInOld,
      existsInNew
    };
    
    if (existsInOld && existsInNew) {
      console.log(`✅ La tabella '${table}' esiste in entrambi i database`);
    } else if (existsInOld && !existsInNew) {
      console.log(`⚠️ La tabella '${table}' esiste solo nel vecchio database`);
    } else if (!existsInOld && existsInNew) {
      console.log(`ℹ️ La tabella '${table}' esiste solo nel nuovo database`);
    } else {
      console.log(`❌ La tabella '${table}' non esiste in nessuno dei due database`);
    }
  }
  
  // Riassunto delle tabelle da migrare
  console.log('\n--- RIASSUNTO TABELLE DA MIGRARE ---');
  
  const tablesToMigrate = knownTables.filter(table => 
    tableStatus[table].existsInOld && !tableStatus[table].existsInNew
  );
  
  if (tablesToMigrate.length === 0) {
    console.log('✅ Tutte le tabelle note esistono già nel nuovo database');
  } else {
    console.log('⚠️ Le seguenti tabelle devono essere migrate:');
    tablesToMigrate.forEach(table => {
      console.log(`   - ${table}`);
    });
  }
  
  console.log('\n==========================================');
  console.log('Verifica completata!');
  console.log('==========================================');
}

// Esegui la verifica
checkDatabases()
  .then(() => {
    console.log('\nProcesso completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErrore fatale:', error);
    process.exit(1);
  }); 