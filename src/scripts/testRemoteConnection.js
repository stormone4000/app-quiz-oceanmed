import { createClient } from '@supabase/supabase-js';

// URL e chiavi per il database remoto
const REMOTE_SUPABASE_URL = 'https://uqutbomzymeklyowfewp.supabase.co';
const REMOTE_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Crea il client Supabase
const supabase = createClient(REMOTE_SUPABASE_URL, REMOTE_SUPABASE_SERVICE_KEY);

/**
 * Funzione per testare la connessione al database remoto
 */
async function testConnection() {
  console.log('Test di connessione al database Supabase remoto...');
  console.log(`URL: ${REMOTE_SUPABASE_URL}`);
  
  try {
    // Esegui una query di test sulla tabella quiz_types
    const { data: quizTypes, error: quizTypesError } = await supabase
      .from('quiz_types')
      .select('*');
    
    if (quizTypesError) {
      throw quizTypesError;
    }
    
    console.log('\n✅ Connessione al database remoto riuscita!');
    console.log(`\nTrovati ${quizTypes.length} tipi di quiz:`);
    console.table(quizTypes);
    
    // Ottieni il conteggio dei record nelle tabelle principali
    console.log('\nConteggio dei record nelle tabelle principali:');
    
    const tables = [
      'quiz_types',
      'quiz_templates',
      'questions',
      'quiz_questions',
      'subscriptions'
    ];
    
    for (const tableName of tables) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`Errore nel conteggio dei record nella tabella ${tableName}:`, error.message);
      } else {
        console.log(`- ${tableName}: ${count} record`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Errore durante la connessione al database remoto:', error.message);
    return false;
  }
}

// Esegui il test di connessione
testConnection()
  .then(success => {
    if (success) {
      console.log('\n✅ Test completato con successo. L\'applicazione è configurata per utilizzare il database remoto.');
    } else {
      console.error('\n❌ Test fallito. Verifica le credenziali e la connessione al database remoto.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Errore imprevisto durante il test:', error);
    process.exit(1);
  }); 