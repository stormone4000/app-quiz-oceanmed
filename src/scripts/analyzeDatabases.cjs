// Script per analizzare i database Supabase
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

/**
 * Funzione per ottenere la struttura delle tabelle da un database
 */
async function getTableStructure(supabase, dbName) {
  try {
    console.log(`\nAnalisi struttura database ${dbName}...`);

    // Query per ottenere tutte le tabelle pubbliche
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error(`❌ Errore nel recupero delle tabelle da ${dbName}:`, tablesError.message);
      return null;
    }

    const tableStructures = {};

    // Per ogni tabella, ottieni la struttura delle colonne
    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\nAnalisi tabella '${tableName}'...`);

      try {
        // Ottieni la struttura delle colonne
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', tableName);

        if (columnsError) {
          console.error(`❌ Errore nel recupero delle colonne per ${tableName}:`, columnsError.message);
          continue;
        }

        // Ottieni un esempio di dati dalla tabella
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        tableStructures[tableName] = {
          columns,
          hasData: !sampleError && sampleData && sampleData.length > 0,
          sampleData: !sampleError && sampleData && sampleData.length > 0 ? sampleData[0] : null
        };

        console.log(`✅ Struttura recuperata per '${tableName}'`);
        console.log(`   Colonne trovate: ${columns.length}`);
        console.log(`   Contiene dati: ${tableStructures[tableName].hasData ? 'Sì' : 'No'}`);
      } catch (err) {
        console.error(`❌ Errore nell'analisi della tabella ${tableName}:`, err);
      }
    }

    return tableStructures;
  } catch (error) {
    console.error(`❌ Errore nell'analisi del database ${dbName}:`, error);
    return null;
  }
}

/**
 * Funzione principale per analizzare entrambi i database
 */
async function analyzeDatabases() {
  console.log('==========================================');
  console.log('Analisi dei database Supabase');
  console.log('==========================================');

  try {
    // Analizza il vecchio database
    console.log('\n--- ANALISI VECCHIO DATABASE ---');
    const oldStructure = await getTableStructure(oldSupabase, 'Vecchio DB');

    // Analizza il nuovo database
    console.log('\n--- ANALISI NUOVO DATABASE ---');
    const newStructure = await getTableStructure(newSupabase, 'Nuovo DB');

    // Confronta le strutture
    console.log('\n--- CONFRONTO STRUTTURE ---');
    
    if (!oldStructure || !newStructure) {
      console.error('❌ Impossibile completare il confronto a causa di errori precedenti');
      return;
    }

    const oldTables = Object.keys(oldStructure);
    const newTables = Object.keys(newStructure);

    console.log('\nTabelle mancanti nel nuovo database:');
    oldTables.forEach(tableName => {
      if (!newTables.includes(tableName)) {
        console.log(`❌ ${tableName}`);
        console.log('   Struttura:', JSON.stringify(oldStructure[tableName].columns, null, 2));
      }
    });

    console.log('\nTabelle presenti in entrambi i database:');
    oldTables.forEach(tableName => {
      if (newTables.includes(tableName)) {
        console.log(`✅ ${tableName}`);
        
        // Confronta le colonne
        const oldColumns = oldStructure[tableName].columns;
        const newColumns = newStructure[tableName].columns;
        
        const missingColumns = oldColumns.filter(oldCol => 
          !newColumns.find(newCol => newCol.column_name === oldCol.column_name)
        );

        if (missingColumns.length > 0) {
          console.log('   Colonne mancanti nel nuovo database:');
          missingColumns.forEach(col => {
            console.log(`   - ${col.column_name} (${col.data_type})`);
          });
        }
      }
    });

    console.log('\n==========================================');
    console.log('Analisi completata!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Errore durante l\'analisi:', error);
  }
}

// Esegui l'analisi
analyzeDatabases()
  .then(() => {
    console.log('\nProcesso completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErrore fatale:', error);
    process.exit(1);
  }); 