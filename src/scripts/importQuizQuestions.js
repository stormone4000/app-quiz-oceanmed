import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config();

// Utilizza le variabili d'ambiente per la configurazione
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Verifica che le variabili d'ambiente siano configurate correttamente
if (!supabaseUrl || !supabaseServiceRole) {
  console.error('Errore: Variabili d\'ambiente Supabase non configurate correttamente.');
  console.error('Assicurati che VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY siano definite nel file .env');
  process.exit(1);
}

// Client con service role per operazioni amministrative
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Ottieni il percorso del file corrente
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Percorso del file SQL
const sqlFilePath = resolve(__dirname, '../../Database/quiz_questions_rows_fixed.sql');

async function importQuizQuestions() {
  try {
    console.log('Verifico la struttura delle tabelle...');
    
    // Verifica la struttura delle tabelle
    const { data: templates, error: templatesError } = await supabaseAdmin
      .from('quiz_templates')
      .select('id')
      .limit(1);
    
    if (templatesError) {
      console.error('Errore nella verifica della tabella quiz_templates:', templatesError);
      return;
    }
    
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      .limit(1);
    
    if (questionsError) {
      console.error('Errore nella verifica della tabella quiz_questions:', questionsError);
      return;
    }
    
    console.log('Struttura delle tabelle verificata con successo');
    console.log('Inizio importazione delle domande del quiz...');
    
    // Leggi il file SQL
    const sqlContent = readFileSync(sqlFilePath, 'utf8');
    
    // Estrai le righe di INSERT
    const insertStatements = sqlContent.match(/INSERT INTO "public"."quiz_questions"[^;]+;/g);
    
    if (!insertStatements || insertStatements.length === 0) {
      throw new Error('Nessuna istruzione INSERT trovata nel file SQL');
    }
    
    console.log(`Trovate ${insertStatements.length} istruzioni INSERT`);
    
    // Elabora ogni istruzione INSERT
    for (let i = 0; i < insertStatements.length; i++) {
      const insertStmt = insertStatements[i];
      
      // Estrai i valori dall'istruzione INSERT
      const valuesMatch = insertStmt.match(/VALUES \(([^)]+)\)/);
      if (!valuesMatch) continue;
      
      const valuesStr = valuesMatch[1];
      
      // Analizza i valori
      const values = parseValues(valuesStr);
      
      // Crea l'oggetto dati per l'inserimento
      const questionData = {
        id: values[0],
        quiz_id: values[1],
        question_text: values[2],
        options: JSON.parse(values[3]),
        correct_answer: values[4],
        explanation: values[5],
        image_url: values[6] === 'null' ? null : values[6],
        created_at: values[7]
      };
      
      // Inserisci i dati in Supabase usando il client amministrativo
      const { data, error } = await supabaseAdmin
        .from('quiz_questions')
        .upsert(questionData, { onConflict: 'id' });
      
      if (error) {
        console.error(`Errore nell'inserimento della domanda ${i + 1}:`, error);
      } else {
        console.log(`Domanda ${i + 1} inserita con successo`);
      }
    }
    
    console.log('Importazione completata!');
  } catch (error) {
    console.error('Errore durante l\'importazione:', error);
  }
}

// Funzione per analizzare i valori dall'istruzione INSERT
function parseValues(valuesStr) {
  const values = [];
  let currentValue = '';
  let inString = false;
  let inArray = false;
  
  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    
    if (char === '\'' && valuesStr[i - 1] !== '\\') {
      inString = !inString;
      currentValue += char;
    } else if (char === '[' && !inString) {
      inArray = true;
      currentValue += char;
    } else if (char === ']' && !inString) {
      inArray = false;
      currentValue += char;
    } else if (char === ',' && !inString && !inArray) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Aggiungi l'ultimo valore
  if (currentValue.trim()) {
    values.push(currentValue.trim());
  }
  
  return values.map(v => {
    if (v.startsWith('\'') && v.endsWith('\'')) {
      return v.substring(1, v.length - 1);
    }
    return v;
  });
}

// Esegui la funzione di importazione
importQuizQuestions(); 