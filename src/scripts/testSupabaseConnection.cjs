// Script per testare la connessione a Supabase
const { createClient } = require('@supabase/supabase-js');

// Utilizza le stesse credenziali del file di configurazione
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

// Crea il client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Script per testare la connessione al database Supabase
 * Esegue alcune query di base per verificare che la connessione funzioni correttamente
 */
async function testSupabaseConnection() {
  console.log('==========================================');
  console.log('Test connessione a Supabase');
  console.log('==========================================');
  console.log(`URL: ${supabaseUrl}`);

  try {
    // Test 1: Verifica la connessione a Supabase
    console.log('\n1. Verifica connessione di base...');
    // Invece di usare funzioni aggregate, facciamo una semplice query limitata
    const { data: connectionTest, error: connectionError } = await supabase
      .from('auth_users')
      .select('*')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Errore di connessione:', connectionError.message);
      throw connectionError;
    }
    
    console.log('✅ Connessione a Supabase stabilita con successo!');
    
    // Test 2: Prova a leggere alcune tabelle comuni
    console.log('\n2. Tentativo di lettura da alcune tabelle comuni...');
    
    const tablesToTest = ['auth_users', 'subscriptions', 'access_codes', 'quiz_sessions', 'notifications'];
    
    for (const table of tablesToTest) {
      try {
        console.log(`Tentativo di lettura dalla tabella '${table}'...`);
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Errore nella lettura dalla tabella '${table}':`, error.message);
        } else {
          console.log(`✅ Lettura dalla tabella '${table}' riuscita!`);
          if (data && data.length > 0) {
            console.log(`   Esempio di record: ${JSON.stringify(data[0], null, 2).substring(0, 150)}...`);
          } else {
            console.log(`   Nessun record trovato nella tabella '${table}'`);
          }
        }
      } catch (err) {
        console.log(`❌ Errore nel tentativo di accesso alla tabella '${table}':`, err);
      }
    }
    
    console.log('\n==========================================');
    console.log('✅ Test di connessione completato!');
    console.log('==========================================');
    
    return true;
  } catch (error) {
    console.error('❌ Errore durante il test di connessione:', error);
    console.log('\n==========================================');
    console.log('❌ Test di connessione fallito!');
    console.log('==========================================');
    return false;
  }
}

// Esegui il test
testSupabaseConnection()
  .then(() => {
    console.log('Test completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test fallito con errore:', error);
    process.exit(1);
  }); 