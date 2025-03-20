// Script per associare tutti i video senza creator_id all'istruttore specificato
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// ID dell'istruttore a cui associare i video
const instructorId = '4d926f8c-c379-43a1-9fd2-3d66106c01cf';

async function updateVideosCreator() {
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
}

// Eseguiamo la funzione di aggiornamento
updateVideosCreator()
  .then(() => console.log('Operazione completata'))
  .catch(err => console.error('Errore durante l\'esecuzione:', err)); 