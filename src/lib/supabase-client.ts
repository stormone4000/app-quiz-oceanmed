import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, supabaseOptions);

// Gestione della connessione realtime con retry automatico
let realtimeChannel: RealtimeChannel;
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 secondi

export const initializeRealtimeConnection = () => {
  try {
    // Disconnetti eventuali canali esistenti
    if (realtimeChannel) {
      console.log('Chiusura canale realtime esistente...');
      supabase.removeChannel(realtimeChannel);
    }

    console.log('Inizializzazione connessione realtime...');
    
    // Crea un nuovo canale per le tabelle che richiedono aggiornamenti in tempo reale
    realtimeChannel = supabase
      .channel('db-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'videos'
      }, (payload) => {
        console.log('Cambiamento rilevato nella tabella videos:', payload);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'video_categories'
      }, (payload) => {
        console.log('Cambiamento rilevato nella tabella video_categories:', payload);
      })
      .subscribe(async (status) => {
        console.log('Status connessione realtime:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connessione realtime stabilita con successo');
          retryCount = 0; // Reset del contatore dei tentativi
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error(`❌ Errore connessione realtime: ${status}`);
          
          // Tentativo di riconnessione con backoff esponenziale
          if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`Tentativo di riconnessione tra ${delay/1000} secondi...`);
            
            setTimeout(() => {
              retryCount++;
              initializeRealtimeConnection();
            }, delay);
          } else {
            console.error('Numero massimo di tentativi di riconnessione raggiunto');
          }
        }
      });
  } catch (error) {
    console.error('Errore durante l\'inizializzazione della connessione realtime:', error);
    throw error;
  }
};

// Funzione per testare la connessione con retry
export const testConnection = async () => {
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('count(*)', { count: 'exact' });

      if (error) throw error;
      
      console.log('✅ Connessione a Supabase stabilita con successo');
      return { success: true, data };
    } catch (error: unknown) {
      attempts++;
      
      if (attempts === maxAttempts) {
        console.error('❌ Errore di connessione a Supabase dopo', maxAttempts, 'tentativi:', 
          error instanceof Error ? error.message : 'Errore sconosciuto');
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Errore sconosciuto'
        };
      }
      
      // Attendi prima del prossimo tentativo
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
    }
  }

  return { success: false, error: 'Numero massimo di tentativi raggiunto' };
};

// Inizializza la connessione realtime all'avvio
initializeRealtimeConnection();

export default supabase; 