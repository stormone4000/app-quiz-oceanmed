// Script per migrare i dati dal vecchio al nuovo database Supabase
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

// Lista delle tabelle da migrare
const tablesToMigrate = [
  'auth_users',
  'subscriptions',
  'access_codes',
  'notifications',
  'questions',
  'access_code_usage'
];

/**
 * Funzione per contare i record in una tabella
 */
async function countRecords(supabase, tableName) {
  try {
    // Utilizziamo una query semplice per contare i record
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`❌ Errore nel conteggio dei record per ${tableName}:`, error.message);
      return 0;
    }
    
    return count || 0;
  } catch (error) {
    console.error(`❌ Errore nel conteggio dei record per ${tableName}:`, error);
    return 0;
  }
}

/**
 * Funzione per recuperare tutti i record da una tabella
 */
async function getAllRecords(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Errore nel recupero dei record per ${tableName}:`, error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error(`❌ Errore nel recupero dei record per ${tableName}:`, error);
    return [];
  }
}

/**
 * Funzione per inserire i record in una tabella
 */
async function insertRecords(supabase, tableName, records) {
  if (!records || records.length === 0) {
    console.log(`ℹ️ Nessun record da inserire per ${tableName}`);
    return true;
  }
  
  try {
    // Inseriamo i record in batch di 100 per evitare problemi di dimensione della richiesta
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }
    
    console.log(`ℹ️ Inserimento di ${records.length} record in ${batches.length} batch per ${tableName}...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Batch ${i + 1}/${batches.length} (${batch.length} record)...`);
      
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Errore nell'inserimento dei record per ${tableName} (batch ${i + 1}):`, error.message);
        return false;
      }
    }
    
    console.log(`✅ Inserimento completato per ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Errore nell'inserimento dei record per ${tableName}:`, error);
    return false;
  }
}

/**
 * Funzione per migrare i dati di una tabella
 */
async function migrateTable(tableName) {
  console.log(`\n--- MIGRAZIONE TABELLA ${tableName} ---`);
  
  // Conta i record nel vecchio database
  const oldCount = await countRecords(oldSupabase, tableName);
  console.log(`ℹ️ Record nel vecchio database: ${oldCount}`);
  
  // Conta i record nel nuovo database
  const newCount = await countRecords(newSupabase, tableName);
  console.log(`ℹ️ Record nel nuovo database: ${newCount}`);
  
  if (oldCount === 0) {
    console.log(`⚠️ Nessun record da migrare per ${tableName}`);
    return true;
  }
  
  if (newCount >= oldCount) {
    console.log(`✅ Il nuovo database ha già tutti i record per ${tableName}`);
    return true;
  }
  
  // Recupera tutti i record dal vecchio database
  console.log(`ℹ️ Recupero dei record dal vecchio database per ${tableName}...`);
  const records = await getAllRecords(oldSupabase, tableName);
  
  if (records.length === 0) {
    console.log(`⚠️ Nessun record recuperato per ${tableName}`);
    return false;
  }
  
  console.log(`ℹ️ Recuperati ${records.length} record per ${tableName}`);
  
  // Inserisci i record nel nuovo database
  return await insertRecords(newSupabase, tableName, records);
}

/**
 * Funzione principale per migrare i dati
 */
async function migrateData() {
  console.log('==========================================');
  console.log('Migrazione dati tra database Supabase');
  console.log('==========================================');
  
  let success = true;
  
  for (const table of tablesToMigrate) {
    const tableSuccess = await migrateTable(table);
    success = success && tableSuccess;
  }
  
  console.log('\n==========================================');
  
  if (success) {
    console.log('✅ Migrazione completata con successo!');
  } else {
    console.log('⚠️ Migrazione completata con alcuni errori');
  }
  
  console.log('==========================================');
}

// Esegui la migrazione
migrateData()
  .then(() => {
    console.log('\nProcesso completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErrore fatale:', error);
    process.exit(1);
  }); 