import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

// Crea il client Supabase con la chiave di servizio
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRlsPolicies() {
  try {
    console.log('Verifica delle politiche RLS per video_categories...');
    
    // Esegui la query per ottenere le politiche RLS
    const { data, error } = await supabase.rpc('get_policies_for_table', {
      table_name: 'video_categories'
    });
    
    if (error) {
      console.error('Errore durante la verifica delle politiche RLS:', error);
      return;
    }
    
    console.log('Politiche RLS per video_categories:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verifica se esiste una politica che permette agli istruttori di vedere le proprie categorie
    const hasInstructorViewPolicy = data.some(policy => 
      policy.cmd === 'SELECT' && 
      policy.qual.includes('creator_id') && 
      policy.qual.includes('auth.uid()')
    );
    
    if (hasInstructorViewPolicy) {
      console.log('✅ Esiste una politica che permette agli istruttori di vedere le proprie categorie.');
    } else {
      console.log('❌ Non esiste una politica che permette agli istruttori di vedere le proprie categorie.');
      console.log('Dovresti aggiungere la seguente politica:');
      console.log(`
CREATE POLICY "Instructors can view their own categories"
  ON video_categories
  FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid());
      `);
    }
  } catch (err) {
    console.error('Errore imprevisto:', err);
  }
}

// Esegui la funzione
checkRlsPolicies(); 