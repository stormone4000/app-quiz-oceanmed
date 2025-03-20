// Script per associare tutti i contenuti (video e categorie) all'istruttore specificato
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// ID dell'istruttore a cui associare i contenuti
const instructorId = '4d926f8c-c379-43a1-9fd2-3d66106c01cf';

async function updateCategoriesCreator() {
  console.log(`\n=== AGGIORNAMENTO CATEGORIE ===`);
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
  
  return updatedCategories?.length || 0;
}

async function updateVideosCreator() {
  console.log(`\n=== AGGIORNAMENTO VIDEO ===`);
  console.log(`Associazione di tutti i video all'istruttore ID: ${instructorId}`);
  
  // 1. Prima otteniamo il conteggio dei video senza creator_id
  const { count: videosWithoutCreatorCount, error: countError } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .is('creator_id', null);
  
  if (countError) {
    console.error('Errore nel conteggio dei video:', countError);
    return;
  }
  
  console.log(`Trovati ${videosWithoutCreatorCount} video senza creator_id`);
  
  // 2. Aggiorniamo tutti i video senza creator_id
  const { data: updatedVideos, error: updateError } = await supabase
    .from('videos')
    .update({ creator_id: instructorId })
    .is('creator_id', null)
    .select();
  
  if (updateError) {
    console.error('Errore nell\'aggiornamento dei video:', updateError);
    return;
  }
  
  console.log(`Aggiornati con successo ${updatedVideos?.length || 0} video`);
  
  // 3. Verifichiamo che tutti i video siano stati aggiornati
  const { count: remainingVideosCount, error: verifyError } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .is('creator_id', null);
  
  if (verifyError) {
    console.error('Errore nella verifica finale:', verifyError);
    return;
  }
  
  if (remainingVideosCount === 0) {
    console.log('Tutti i video sono stati associati con successo all\'istruttore');
  } else {
    console.log(`Attenzione: ci sono ancora ${remainingVideosCount} video senza creator_id`);
  }
  
  return updatedVideos?.length || 0;
}

// Eseguiamo entrambe le funzioni in sequenza
async function updateAllContent() {
  console.log(`\n=== INIZIO AGGIORNAMENTO CONTENUTI ===`);
  console.log(`Istruttore target: ${instructorId}`);
  
  try {
    // Prima aggiorniamo le categorie
    const updatedCategoriesCount = await updateCategoriesCreator();
    
    // Poi aggiorniamo i video
    const updatedVideosCount = await updateVideosCreator();
    
    console.log(`\n=== RIEPILOGO OPERAZIONI ===`);
    console.log(`Categorie aggiornate: ${updatedCategoriesCount}`);
    console.log(`Video aggiornati: ${updatedVideosCount}`);
    console.log(`Totale contenuti aggiornati: ${updatedCategoriesCount + updatedVideosCount}`);
    
    // Verifichiamo quanti contenuti sono ora associati all'istruttore
    const { count: totalCategories, error: catError } = await supabase
      .from('video_categories')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', instructorId);
      
    const { count: totalVideos, error: vidError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', instructorId);
    
    if (!catError && !vidError) {
      console.log(`\nL'istruttore ha ora un totale di ${totalCategories} categorie e ${totalVideos} video`);
    }
    
  } catch (error) {
    console.error('Errore durante l\'aggiornamento dei contenuti:', error);
  }
}

// Avviamo il processo di aggiornamento
updateAllContent()
  .then(() => console.log('\n=== OPERAZIONE COMPLETATA ==='))
  .catch(err => console.error('Errore durante l\'esecuzione:', err)); 