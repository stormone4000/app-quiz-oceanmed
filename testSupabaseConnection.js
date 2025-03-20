import { createClient } from '@supabase/supabase-js';

// Utilizzo le stesse chiavi dal file supabase.ts
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkyODQ2NTksImV4cCI6MjA1NDg2MDY1OX0.Wy-_3xBqJPPm87LMsMNJ_tQj_r3aLaXdQm_LN-dGYPM';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Inizializzo due client: uno con chiave anonima e uno con service role
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

async function testConnection() {
  console.log('=== TEST CONNESSIONE SUPABASE ===');
  
  try {
    // Test 1: Client anonimo - query semplice senza RLS
    console.log('\n1. Test client anonimo - query semplice:');
    const { data: data1, error: error1 } = await supabase
      .from('quiz_templates')
      .select('count(*)', { count: 'exact' });
    
    if (error1) {
      console.error('❌ Errore con client anonimo:', error1);
    } else {
      console.log('✅ Successo con client anonimo:', data1);
    }
    
    // Test 2: Client service role - query semplice
    console.log('\n2. Test client service role - query semplice:');
    const { data: data2, error: error2 } = await supabaseAdmin
      .from('quiz_templates')
      .select('count(*)', { count: 'exact' });
    
    if (error2) {
      console.error('❌ Errore con client service role:', error2);
    } else {
      console.log('✅ Successo con client service role:', data2);
    }
    
    // Test 3: Query più complessa con service role
    console.log('\n3. Test client service role - query complessa:');
    const { data: data3, error: error3 } = await supabaseAdmin
      .from('quiz_templates')
      .select('id, title, visibility, created_by')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error3) {
      console.error('❌ Errore con query complessa:', error3);
    } else {
      console.log('✅ Successo con query complessa:');
      console.log(JSON.stringify(data3, null, 2));
    }
    
    // Test 4: Verifica RLS specificamente
    console.log('\n4. Test verifica RLS:');
    try {
      const { data: rlsData, error: rlsError } = await supabaseAdmin.rpc('get_rls_status');
      if (rlsError) {
        console.error('❌ Errore nella verifica RLS:', rlsError);
        console.log('Tentativo di verifica alternativa...');
        
        // Query alternativa per verificare se RLS è attivo
        const { data: altData, error: altError } = await supabaseAdmin
          .from('pg_policies')
          .select('*');
        
        if (altError) {
          console.error('❌ Errore nella verifica alternativa:', altError);
        } else {
          console.log('✅ Risultati della verifica alternativa:', altData || 'Nessuna policy trovata');
        }
      } else {
        console.log('✅ Stato RLS:', rlsData);
      }
    } catch (err) {
      console.error('❌ Eccezione nella verifica RLS:', err);
    }
    
  } catch (err) {
    console.error('❌ Errore generale nei test:', err);
  }
}

// Esegui il test
testConnection(); 