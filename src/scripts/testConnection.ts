import { supabase } from '../services/supabase';

const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('quiz').select('count').single();
    
    if (error) {
      console.error('Errore di connessione:', error.message);
      return;
    }
    
    console.log('Connessione riuscita!', data);
  } catch (err) {
    console.error('Errore durante il test:', err);
  }
};

testConnection(); 