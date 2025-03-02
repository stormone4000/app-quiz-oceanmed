import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carica le variabili d'ambiente
dotenv.config();

// URL e chiavi per il database remoto
const REMOTE_SUPABASE_URL = 'https://uqutbomzymeklyowfewp.supabase.co';
const REMOTE_SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// URL e chiavi per il database locale
const LOCAL_SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const LOCAL_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// Verifica che le variabili d'ambiente siano configurate
if (!LOCAL_SUPABASE_URL || !LOCAL_SUPABASE_ANON_KEY) {
  console.error('Errore: variabili d\'ambiente Supabase locale non configurate');
  process.exit(1);
}

// Crea i client Supabase
const remoteSupabase = createClient(REMOTE_SUPABASE_URL, REMOTE_SUPABASE_SERVICE_KEY);
const localSupabase = createClient(LOCAL_SUPABASE_URL, LOCAL_SUPABASE_ANON_KEY);

// Elenco delle tabelle da importare
const TABLES = [
  'quiz_types',
  'quizzes',
  'questions',
  'answers',
  'quiz_templates',
  'quiz_questions',
  'user_quiz_results',
  'user_question_answers',
  'profiles',
  'subscriptions',
  'payments'
];

// Cartella per i backup
const BACKUP_DIR = path.resolve(process.cwd(), 'supabase_backup/data');

// Assicurati che la cartella di backup esista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Funzione per recuperare i dati da una tabella remota
 */
async function fetchRemoteTableData(tableName) {
  console.log(`Recupero dati dalla tabella remota: ${tableName}`);
  
  try {
    const { data, error } = await remoteSupabase
      .from(tableName)
      .select('*');
    
    if (error) {
      throw error;
    }
    
    console.log(`Recuperati ${data.length} record dalla tabella ${tableName}`);
    return data;
  } catch (error) {
    console.error(`Errore nel recupero dei dati dalla tabella ${tableName}:`, error.message);
    return null;
  }
}

/**
 * Funzione per salvare i dati in un file JSON di backup
 */
async function saveBackup(tableName, data) {
  if (!data || data.length === 0) return;
  
  const backupPath = path.join(BACKUP_DIR, `${tableName}.json`);
  
  try {
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`Backup salvato in: ${backupPath}`);
  } catch (error) {
    console.error(`Errore nel salvataggio del backup per ${tableName}:`, error.message);
  }
}

/**
 * Funzione per importare i dati in una tabella locale
 */
async function importToLocalTable(tableName, data) {
  if (!data || data.length === 0) return;
  
  console.log(`Importazione di ${data.length} record nella tabella locale: ${tableName}`);
  
  try {
    // Prima elimina tutti i dati esistenti nella tabella locale
    const { error: deleteError } = await localSupabase
      .from(tableName)
      .delete()
      .neq('id', -1); // Condizione sempre vera per eliminare tutto
    
    if (deleteError) {
      throw deleteError;
    }
    
    console.log(`Dati esistenti eliminati dalla tabella ${tableName}`);
    
    // Poi inserisci i nuovi dati
    const { error: insertError } = await localSupabase
      .from(tableName)
      .insert(data);
    
    if (insertError) {
      throw insertError;
    }
    
    console.log(`Dati importati con successo nella tabella ${tableName}`);
  } catch (error) {
    console.error(`Errore nell'importazione dei dati nella tabella ${tableName}:`, error.message);
  }
}

/**
 * Funzione principale per l'importazione di tutte le tabelle
 */
async function importAllTables() {
  console.log('Inizio importazione delle tabelle dal database remoto al database locale...');
  
  for (const tableName of TABLES) {
    try {
      // Recupera i dati dalla tabella remota
      const data = await fetchRemoteTableData(tableName);
      
      if (data && data.length > 0) {
        // Salva un backup dei dati
        await saveBackup(tableName, data);
        
        // Importa i dati nella tabella locale
        await importToLocalTable(tableName, data);
      } else {
        console.log(`Nessun dato trovato nella tabella ${tableName} o errore nel recupero`);
      }
    } catch (error) {
      console.error(`Errore durante l'elaborazione della tabella ${tableName}:`, error.message);
    }
  }
  
  console.log('Importazione completata!');
}

// Esegui la funzione principale
importAllTables().catch(error => {
  console.error('Errore durante l\'importazione:', error);
  process.exit(1);
}); 