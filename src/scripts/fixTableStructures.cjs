// Script per correggere la struttura delle tabelle nel nuovo database Supabase
const { createClient } = require('@supabase/supabase-js');

// Configurazione nuovo database
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

// Crea il client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Funzione per eseguire una query SQL
 */
async function executeQuery(query, description) {
  console.log(`\n--- ESECUZIONE QUERY: ${description} ---`);
  
  try {
    const { data, error } = await supabase.rpc('execute_sql', { sql_query: query });
    
    if (error) {
      console.error(`❌ Errore nell'esecuzione della query: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Query eseguita con successo!`);
    return true;
  } catch (error) {
    console.error(`❌ Errore nell'esecuzione della query: ${error}`);
    return false;
  }
}

/**
 * Funzione principale per correggere la struttura delle tabelle
 */
async function fixTableStructures() {
  console.log('==========================================');
  console.log('Correzione struttura tabelle nel database Supabase');
  console.log('==========================================');
  
  console.log('\n⚠️ ATTENZIONE: Questo script correggerà la struttura delle tabelle nel database.');
  console.log('⚠️ Assicurati di avere un backup dei dati prima di procedere.');
  
  // Query SQL per correggere la tabella subscriptions
  const fixSubscriptionsQuery = `
  -- Elimina la tabella se esiste
  DROP TABLE IF EXISTS public.subscriptions;
  
  -- Ricrea la tabella con la struttura corretta
  CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_email TEXT NOT NULL,
    subscription_id TEXT UNIQUE,
    plan_id TEXT,
    status TEXT DEFAULT 'active',
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    billing_interval TEXT DEFAULT 'month',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID,
    payment_method TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_reason TEXT,
    last_payment_status TEXT,
    next_payment_attempt TIMESTAMP WITH TIME ZONE,
    renewal_attempts INTEGER DEFAULT 0,
    last_renewal_attempt TIMESTAMP WITH TIME ZONE,
    renewal_error TEXT,
    suspension_end_date TIMESTAMP WITH TIME ZONE,
    plan_change_scheduled_at TIMESTAMP WITH TIME ZONE,
    plan_change_to TEXT,
    payment_method_id TEXT,
    payment_method_last4 TEXT,
    payment_method_brand TEXT,
    payment_method_exp_month INTEGER,
    payment_method_exp_year INTEGER,
    notes TEXT,
    access_code_id UUID
  );
  
  -- Aggiungi i permessi necessari
  ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Consenti accesso pubblico a subscriptions" ON public.subscriptions FOR SELECT USING (true);
  CREATE POLICY "Consenti inserimento a subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (true);
  CREATE POLICY "Consenti aggiornamento a subscriptions" ON public.subscriptions FOR UPDATE USING (true);
  `;
  
  // Query SQL per correggere la tabella access_codes
  const fixAccessCodesQuery = `
  -- Elimina la tabella se esiste
  DROP TABLE IF EXISTS public.access_codes;
  
  -- Ricrea la tabella con la struttura corretta
  CREATE TABLE public.access_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    created_by UUID,
    expiration_date TIMESTAMP WITH TIME ZONE,  -- Rimosso NOT NULL
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    duration_months INTEGER,
    duration_type TEXT DEFAULT 'limited'
  );
  
  -- Aggiungi i permessi necessari
  ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Consenti accesso pubblico a access_codes" ON public.access_codes FOR SELECT USING (true);
  CREATE POLICY "Consenti inserimento a access_codes" ON public.access_codes FOR INSERT WITH CHECK (true);
  CREATE POLICY "Consenti aggiornamento a access_codes" ON public.access_codes FOR UPDATE USING (true);
  `;
  
  // Query SQL per correggere la tabella notifications
  const fixNotificationsQuery = `
  -- Elimina la tabella se esiste
  DROP TABLE IF EXISTS public.notifications;
  
  -- Ricrea la tabella con la struttura corretta
  CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
  );
  
  -- Aggiungi i permessi necessari
  ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Consenti accesso pubblico a notifications" ON public.notifications FOR SELECT USING (true);
  CREATE POLICY "Consenti inserimento a notifications" ON public.notifications FOR INSERT WITH CHECK (true);
  CREATE POLICY "Consenti aggiornamento a notifications" ON public.notifications FOR UPDATE USING (true);
  `;
  
  // Query SQL per correggere la tabella questions
  const fixQuestionsQuery = `
  -- Elimina la tabella se esiste
  DROP TABLE IF EXISTS public.questions;
  
  -- Ricrea la tabella con la struttura corretta
  CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL,
    text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer INTEGER NOT NULL,
    time_limit INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
  );
  
  -- Aggiungi i permessi necessari
  ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Consenti accesso pubblico a questions" ON public.questions FOR SELECT USING (true);
  CREATE POLICY "Consenti inserimento a questions" ON public.questions FOR INSERT WITH CHECK (true);
  CREATE POLICY "Consenti aggiornamento a questions" ON public.questions FOR UPDATE USING (true);
  `;
  
  // Query SQL per correggere la tabella access_code_usage
  const fixAccessCodeUsageQuery = `
  -- Elimina la tabella se esiste
  DROP TABLE IF EXISTS public.access_code_usage;
  
  -- Ricrea la tabella con la struttura corretta
  CREATE TABLE public.access_code_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code_id UUID NOT NULL,
    student_email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    user_id UUID
  );
  
  -- Aggiungi i permessi necessari
  ALTER TABLE public.access_code_usage ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Consenti accesso pubblico a access_code_usage" ON public.access_code_usage FOR SELECT USING (true);
  CREATE POLICY "Consenti inserimento a access_code_usage" ON public.access_code_usage FOR INSERT WITH CHECK (true);
  CREATE POLICY "Consenti aggiornamento a access_code_usage" ON public.access_code_usage FOR UPDATE USING (true);
  `;
  
  // Query SQL per creare la tabella quiz_sessions
  const createQuizSessionsQuery = `
  -- Crea la tabella quiz_sessions
  CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_by UUID,
    max_participants INTEGER,
    session_code TEXT UNIQUE,
    is_public BOOLEAN DEFAULT false
  );
  
  -- Aggiungi i permessi necessari
  ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Consenti accesso pubblico a quiz_sessions" ON public.quiz_sessions FOR SELECT USING (true);
  CREATE POLICY "Consenti inserimento a quiz_sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (true);
  CREATE POLICY "Consenti aggiornamento a quiz_sessions" ON public.quiz_sessions FOR UPDATE USING (true);
  `;
  
  // Esegui le query per correggere le tabelle
  await executeQuery(fixSubscriptionsQuery, "Correzione tabella subscriptions");
  await executeQuery(fixAccessCodesQuery, "Correzione tabella access_codes");
  await executeQuery(fixNotificationsQuery, "Correzione tabella notifications");
  await executeQuery(fixQuestionsQuery, "Correzione tabella questions");
  await executeQuery(fixAccessCodeUsageQuery, "Correzione tabella access_code_usage");
  await executeQuery(createQuizSessionsQuery, "Creazione tabella quiz_sessions");
  
  console.log('\n==========================================');
  console.log('⚠️ Questo script non può eseguire automaticamente le query a causa delle limitazioni di sicurezza di Supabase.');
  console.log('⚠️ È necessario eseguire manualmente le query SQL nel pannello di amministrazione di Supabase.');
  console.log('==========================================');
  
  console.log('\nPer correggere le tabelle, è necessario:');
  console.log('1. Accedere al pannello di amministrazione di Supabase');
  console.log('2. Andare alla sezione "SQL Editor"');
  console.log('3. Creare una nuova query per ogni tabella');
  console.log('4. Copiare e incollare le query SQL fornite sopra');
  console.log('5. Eseguire le query SQL per correggere le tabelle');
  
  console.log('\nDopo aver corretto le tabelle, eseguire nuovamente lo script di migrazione dei dati:');
  console.log('npm run migrate:db');
}

// Esegui la correzione delle tabelle
fixTableStructures()
  .then(() => {
    console.log('\nProcesso completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErrore fatale:', error);
    process.exit(1);
  }); 