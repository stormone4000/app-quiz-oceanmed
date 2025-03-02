// Script per confrontare la struttura delle tabelle tra i due database Supabase
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

// Lista delle tabelle da confrontare
const tablesToCompare = [
  'auth_users',
  'subscriptions',
  'access_codes',
  'notifications',
  'questions',
  'access_code_usage'
];

/**
 * Funzione per ottenere un campione di dati da una tabella
 */
async function getSampleData(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`❌ Errore nel recupero dei dati di esempio per ${tableName}:`, error.message);
      return null;
    }
    
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error(`❌ Errore nel recupero dei dati di esempio per ${tableName}:`, error);
    return null;
  }
}

/**
 * Funzione per confrontare la struttura di una tabella tra i due database
 */
async function compareTableStructure(tableName) {
  console.log(`\n--- CONFRONTO STRUTTURA TABELLA ${tableName} ---`);
  
  // Ottieni un campione di dati dal vecchio database
  console.log(`ℹ️ Recupero dati di esempio dal vecchio database per ${tableName}...`);
  const oldSample = await getSampleData(oldSupabase, tableName);
  
  if (!oldSample) {
    console.log(`⚠️ Nessun dato di esempio trovato nel vecchio database per ${tableName}`);
    return;
  }
  
  // Ottieni un campione di dati dal nuovo database
  console.log(`ℹ️ Recupero dati di esempio dal nuovo database per ${tableName}...`);
  const newSample = await getSampleData(newSupabase, tableName);
  
  // Estrai le colonne dai campioni
  const oldColumns = oldSample ? Object.keys(oldSample) : [];
  const newColumns = newSample ? Object.keys(newSample) : [];
  
  console.log(`\nColonne nel vecchio database (${oldColumns.length}):`, oldColumns.join(', '));
  
  if (newSample) {
    console.log(`Colonne nel nuovo database (${newColumns.length}):`, newColumns.join(', '));
    
    // Trova le colonne mancanti nel nuovo database
    const missingColumns = oldColumns.filter(col => !newColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log(`\n❌ Colonne presenti nel vecchio database ma mancanti nel nuovo (${missingColumns.length}):`, missingColumns.join(', '));
    } else {
      console.log(`\n✅ Tutte le colonne del vecchio database sono presenti nel nuovo`);
    }
    
    // Trova le colonne aggiuntive nel nuovo database
    const additionalColumns = newColumns.filter(col => !oldColumns.includes(col));
    if (additionalColumns.length > 0) {
      console.log(`\nℹ️ Colonne aggiuntive nel nuovo database (${additionalColumns.length}):`, additionalColumns.join(', '));
    }
  } else {
    console.log(`⚠️ Nessun dato di esempio trovato nel nuovo database per ${tableName}`);
    console.log(`❌ Impossibile confrontare le strutture`);
  }
  
  // Mostra un esempio di record dal vecchio database
  console.log(`\nEsempio di record dal vecchio database:`);
  console.log(JSON.stringify(oldSample, null, 2));
  
  if (newSample) {
    console.log(`\nEsempio di record dal nuovo database:`);
    console.log(JSON.stringify(newSample, null, 2));
  }
}

/**
 * Funzione principale per confrontare le strutture delle tabelle
 */
async function compareTableStructures() {
  console.log('==========================================');
  console.log('Confronto strutture tabelle tra database Supabase');
  console.log('==========================================');
  
  for (const table of tablesToCompare) {
    await compareTableStructure(table);
  }
  
  console.log('\n==========================================');
  console.log('Confronto completato!');
  console.log('==========================================');
}

// Esegui il confronto
compareTableStructures()
  .then(() => {
    console.log('\nProcesso completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErrore fatale:', error);
    process.exit(1);
  }); 