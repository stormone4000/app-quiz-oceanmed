import { supabase } from '../services/supabase';

/**
 * Script per testare la connessione al database Supabase
 * Esegue alcune query di base per verificare che la connessione funzioni correttamente
 */
export const testSupabaseConnection = async () => {
  console.log('==========================================');
  console.log('Test connessione a Supabase');
  console.log('==========================================');

  try {
    // Test 1: Verifica la connessione a Supabase
    console.log('1. Verifica connessione di base...');
    const { data: connectionTest, error: connectionError } = await supabase.from('auth_users').select('count()', { count: 'exact' });
    
    if (connectionError) {
      console.error('❌ Errore di connessione:', connectionError.message);
      throw connectionError;
    }
    
    console.log('✅ Connessione a Supabase stabilita con successo!');
    
    // Test 2: Recupera informazioni sulle tabelle
    console.log('\n2. Recupero informazioni sulle tabelle...');
    // Questa è una query di sistema che potrebbe non funzionare, dipende dai permessi
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('⚠️ Non è possibile recuperare le tabelle:', tablesError.message);
      console.log('Proveremo un approccio diverso...');
    } else {
      console.log('Tabelle disponibili:', tables.map(t => t.table_name).join(', '));
    }
    
    // Test 3: Prova a leggere alcune tabelle comuni
    console.log('\n3. Tentativo di lettura da alcune tabelle comuni...');
    
    const tablesToTest = ['auth_users', 'subscriptions', 'access_codes', 'quiz_sessions', 'notifications'];
    
    for (const table of tablesToTest) {
      try {
        console.log(`Tentativo di lettura dalla tabella '${table}'...`);
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.log(`❌ Errore nella lettura dalla tabella '${table}':`, error.message);
        } else {
          console.log(`✅ Lettura dalla tabella '${table}' riuscita! Conteggio totale: ${count}, Esempio:`, data);
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
};

// Esegui il test se lo script viene eseguito direttamente
if (require.main === module) {
  testSupabaseConnection()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} 