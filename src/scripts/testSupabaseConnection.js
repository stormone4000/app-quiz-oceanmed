import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

// Recupera le credenziali da .env
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Errore: variabili d\'ambiente Supabase non configurate');
  process.exit(1);
}

// Crea il client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Test di connessione a Supabase in corso...');
  console.log(`URL: ${supabaseUrl}`);
  
  try {
    // Esegui una query semplice
    const { data, error } = await supabase
      .from('quiz_types')
      .select('*')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    console.log('Connessione a Supabase riuscita!');
    console.log('Quiz types recuperati:');
    console.table(data);
    
    // Controlla altre tabelle
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(3);
    
    if (questionsError) {
      throw questionsError;
    }
    
    console.log('Domande recuperate:');
    console.table(questions);
    
    return { success: true, data };
  } catch (error) {
    console.error('Errore durante la connessione a Supabase:', error.message);
    return { success: false, error };
  }
}

// Esegui il test
testConnection().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
