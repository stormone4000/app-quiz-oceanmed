// Script per creare le tabelle mancanti nel nuovo database Supabase
const { createClient } = require('@supabase/supabase-js');

// Configurazione nuovo database
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.HtnIuP5YJRkzfHuHYqYyKbyIFoSHW67m2wqdVxdL8Wc';

// Crea il client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Funzione per creare la tabella auth_users
 */
async function createAuthUsersTable() {
  console.log('\n--- CREAZIONE TABELLA auth_users ---');
  
  try {
    // Esegui la query SQL per creare la tabella
    const { error } = await supabase.rpc('create_auth_users_table');
    
    if (error) {
      console.error('❌ Errore nella creazione della tabella auth_users:', error.message);
      return false;
    }
    
    console.log('✅ Tabella auth_users creata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella auth_users:', error);
    return false;
  }
}

/**
 * Funzione per creare la tabella subscriptions
 */
async function createSubscriptionsTable() {
  console.log('\n--- CREAZIONE TABELLA subscriptions ---');
  
  try {
    // Esegui la query SQL per creare la tabella
    const { error } = await supabase.rpc('create_subscriptions_table');
    
    if (error) {
      console.error('❌ Errore nella creazione della tabella subscriptions:', error.message);
      return false;
    }
    
    console.log('✅ Tabella subscriptions creata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella subscriptions:', error);
    return false;
  }
}

/**
 * Funzione per creare la tabella access_codes
 */
async function createAccessCodesTable() {
  console.log('\n--- CREAZIONE TABELLA access_codes ---');
  
  try {
    // Esegui la query SQL per creare la tabella
    const { error } = await supabase.rpc('create_access_codes_table');
    
    if (error) {
      console.error('❌ Errore nella creazione della tabella access_codes:', error.message);
      return false;
    }
    
    console.log('✅ Tabella access_codes creata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella access_codes:', error);
    return false;
  }
}

/**
 * Funzione per creare la tabella notifications
 */
async function createNotificationsTable() {
  console.log('\n--- CREAZIONE TABELLA notifications ---');
  
  try {
    // Esegui la query SQL per creare la tabella
    const { error } = await supabase.rpc('create_notifications_table');
    
    if (error) {
      console.error('❌ Errore nella creazione della tabella notifications:', error.message);
      return false;
    }
    
    console.log('✅ Tabella notifications creata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella notifications:', error);
    return false;
  }
}

/**
 * Funzione per creare la tabella questions
 */
async function createQuestionsTable() {
  console.log('\n--- CREAZIONE TABELLA questions ---');
  
  try {
    // Esegui la query SQL per creare la tabella
    const { error } = await supabase.rpc('create_questions_table');
    
    if (error) {
      console.error('❌ Errore nella creazione della tabella questions:', error.message);
      return false;
    }
    
    console.log('✅ Tabella questions creata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella questions:', error);
    return false;
  }
}

/**
 * Funzione per creare la tabella access_code_usage
 */
async function createAccessCodeUsageTable() {
  console.log('\n--- CREAZIONE TABELLA access_code_usage ---');
  
  try {
    // Esegui la query SQL per creare la tabella
    const { error } = await supabase.rpc('create_access_code_usage_table');
    
    if (error) {
      console.error('❌ Errore nella creazione della tabella access_code_usage:', error.message);
      return false;
    }
    
    console.log('✅ Tabella access_code_usage creata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore nella creazione della tabella access_code_usage:', error);
    return false;
  }
}

/**
 * Funzione principale per creare tutte le tabelle mancanti
 */
async function createMissingTables() {
  console.log('==========================================');
  console.log('Creazione tabelle mancanti nel database Supabase');
  console.log('==========================================');
  
  console.log('\n⚠️ ATTENZIONE: Questo script richiede che le funzioni SQL necessarie siano già state create nel database.');
  console.log('⚠️ È necessario creare manualmente le funzioni SQL nel pannello di amministrazione di Supabase.');
  console.log('⚠️ Consultare la documentazione per i dettagli sulle funzioni SQL necessarie.');
  
  console.log('\nPer creare le tabelle, è necessario:');
  console.log('1. Accedere al pannello di amministrazione di Supabase');
  console.log('2. Andare alla sezione "SQL Editor"');
  console.log('3. Creare una nuova query per ogni tabella');
  console.log('4. Eseguire le query SQL per creare le tabelle');
  
  console.log('\nEsempio di query SQL per creare la tabella auth_users:');
  console.log(`
CREATE TABLE IF NOT EXISTS public.auth_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE,
  is_instructor BOOLEAN DEFAULT false,
  account_status TEXT DEFAULT 'active',
  is_master BOOLEAN DEFAULT false
);

-- Aggiungi i permessi necessari
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consenti accesso pubblico a auth_users" ON public.auth_users FOR SELECT USING (true);
CREATE POLICY "Consenti inserimento a auth_users" ON public.auth_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Consenti aggiornamento a auth_users" ON public.auth_users FOR UPDATE USING (true);
  `);
  
  console.log('\nEsempio di query SQL per creare la tabella subscriptions:');
  console.log(`
CREATE TABLE IF NOT EXISTS public.subscriptions (
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
  `);
  
  console.log('\nEsempio di query SQL per creare la tabella access_codes:');
  console.log(`
CREATE TABLE IF NOT EXISTS public.access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  created_by UUID,
  expiration_date TIMESTAMP WITH TIME ZONE,
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
  `);
  
  console.log('\nEsempio di query SQL per creare la tabella notifications:');
  console.log(`
CREATE TABLE IF NOT EXISTS public.notifications (
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
  `);
  
  console.log('\nEsempio di query SQL per creare la tabella questions:');
  console.log(`
CREATE TABLE IF NOT EXISTS public.questions (
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
  `);
  
  console.log('\nEsempio di query SQL per creare la tabella access_code_usage:');
  console.log(`
CREATE TABLE IF NOT EXISTS public.access_code_usage (
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
  `);
  
  console.log('\n==========================================');
  console.log('⚠️ Questo script non può creare automaticamente le tabelle a causa delle limitazioni di sicurezza di Supabase.');
  console.log('⚠️ È necessario creare manualmente le tabelle utilizzando le query SQL fornite sopra.');
  console.log('==========================================');
}

// Esegui la creazione delle tabelle
createMissingTables()
  .then(() => {
    console.log('\nProcesso completato.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nErrore fatale:', error);
    process.exit(1);
  }); 