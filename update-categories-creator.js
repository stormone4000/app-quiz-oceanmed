// Script per associare tutte le categorie senza creator_id all'istruttore specificato
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// ID dell'istruttore a cui associare le categorie
const instructorId = '4d926f8c-c379-43a1-9fd2-3d66106c01cf';

async function updateCategoriesCreator() {
  console.log(`Associazione di tutte le categorie all'istruttore ID: ${instructorId}`);
  
  // 1. Prima otteniamo il conteggio delle categorie senza creator_id
  const { count: categoriesWithoutCreatorCount, error: countError } = await supabase
    .from('video_categories')
    .select('*', { count: 'exact', head: true })
    .is('creator_id', null);
  
  if (countError) {
    console.error('Errore nel conteggio delle categorie:', countError);
    return;
  }
  
  console.log(`Trovate ${categoriesWithoutCreatorCount} categorie senza creator_id`);
  
  // 2. Aggiorniamo tutte le categorie senza creator_id
  const { data: updatedCategories, error: updateError } = await supabase
    .from('video_categories')
    .update({ creator_id: instructorId })
    .is('creator_id', null)
    .select();
  
  if (updateError) {
    console.error('Errore nell\'aggiornamento delle categorie:', updateError);
    return;
  }
  
  console.log(`Aggiornate con successo ${updatedCategories?.length || 0} categorie`);
  
  // 3. Verifichiamo che tutte le categorie siano state aggiornate
  const { count: remainingCategoriesCount, error: verifyError } = await supabase
    .from('video_categories')
    .select('*', { count: 'exact', head: true })
    .is('creator_id', null);
  
  if (verifyError) {
    console.error('Errore nella verifica finale:', verifyError);
    return;
  }
  
  if (remainingCategoriesCount === 0) {
    console.log('Tutte le categorie sono state associate con successo all\'istruttore');
  } else {
    console.log(`Attenzione: ci sono ancora ${remainingCategoriesCount} categorie senza creator_id`);
  }
}

// Eseguiamo la funzione di aggiornamento
updateCategoriesCreator()
  .then(() => console.log('Operazione completata'))
  .catch(err => console.error('Errore durante l\'esecuzione:', err)); 