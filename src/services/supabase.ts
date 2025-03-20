import { createClient } from '@supabase/supabase-js';

// Usa le variabili d'ambiente per la configurazione
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';
const supabaseServiceRole = import.meta.env.VITE_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Verifica che le variabili d'ambiente siano configurate correttamente
if (!supabaseUrl) {
  console.error('Errore: VITE_SUPABASE_URL non è configurato correttamente.');
}

if (!supabaseAnonKey) {
  console.error('Errore: VITE_SUPABASE_ANON_KEY non è configurato correttamente.');
}

// Log per debug
console.log('Inizializzazione client Supabase con URL:', supabaseUrl);

// Opzioni di configurazione per migliorare la gestione degli errori
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      // Aumenta il timeout per le richieste a 30 secondi
      const timeout = 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const fetchPromise = fetch(input, {
        ...init,
        signal: controller.signal
      });
      
      return fetchPromise.finally(() => clearTimeout(timeoutId));
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 1 // Limita la frequenza degli eventi per evitare sovraccarichi
    }
  }
};

// Client per operazioni pubbliche (attenzione: non utilizzare nelle query come count(*))
export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Client con service role per operazioni amministrative
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, supabaseOptions);

// Funzione per testare la connessione (NON usare count(*) direttamente nella query)
export const testConnection = async () => {
  try {
    // Usiamo una query più semplice che sappiamo funziona
    const { data, error } = await supabaseAdmin
      .from('quiz_templates')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('Errore nella connessione a Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Connessione a Supabase riuscita');
    return { success: true, data };
  } catch (err) {
    console.error('Eccezione nella connessione a Supabase:', err);
    return { success: false, error: err };
  }
};

// Funzione per riconnettere in caso di errore
export const reconnect = async () => {
  try {
    console.log('Tentativo di riconnessione a Supabase...');
    await supabase.auth.refreshSession();
    const result = await testConnection();
    return result.success;
  } catch (err) {
    console.error('Errore durante il tentativo di riconnessione:', err);
    return false;
  }
};

// Esegui test di connessione all'avvio
testConnection()
  .then(result => {
    if (result.success) {
      console.log('✅ Connessione a Supabase stabilita con successo');
    } else {
      console.error('❌ Impossibile connettersi a Supabase');
      // Tentativo di riconnessione dopo 2 secondi
      setTimeout(() => {
        reconnect().then(success => {
          if (success) {
            console.log('✅ Riconnessione a Supabase riuscita');
          } else {
            console.error('❌ Impossibile riconnettersi a Supabase');
          }
        });
      }, 2000);
    }
  })
  .catch(err => {
    console.error('❌ Errore durante il test di connessione:', err);
  });

export default supabase;