// Questo script controlla specificamente la tabella instructor_videos
// per trovare video associati all'istruttore
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// ID dell'istruttore da cercare
const instructorId = '4d926f8c-c379-43a1-9fd2-3d66106c01cf';

async function checkInstructorVideos() {
  console.log(`Verifica associazioni video per istruttore ID: ${instructorId}`);
  
  // 1. Controlla se l'istruttore esiste
  const { data: instructor, error: instructorError } = await supabase
    .from('instructor_profiles')
    .select('*')
    .eq('id', instructorId)
    .single();
  
  if (instructorError) {
    console.error('Errore nel verificare l\'istruttore:', instructorError);
  } else {
    console.log('Informazioni istruttore:');
    console.log(instructor);
  }
  
  // 2. Verifica relazioni nella tabella instructor_videos
  const { data: instructorVideos, error: ivError } = await supabase
    .from('instructor_videos')
    .select('*')
    .eq('instructor_id', instructorId);
  
  if (ivError) {
    console.error('Errore nel verificare le relazioni instructor_videos:', ivError);
  } else {
    console.log(`\nRelazioni instructor_videos trovate: ${instructorVideos?.length || 0}`);
    console.log(instructorVideos);
  }
  
  // 3. Ottieni tutti i video creati dall'istruttore (creator_id)
  const { data: createdVideos, error: cvError } = await supabase
    .from('videos')
    .select('*')
    .eq('creator_id', instructorId);
  
  if (cvError) {
    console.error('Errore nel verificare i video creati dall\'istruttore:', cvError);
  } else {
    console.log(`\nVideo con creator_id = ${instructorId}: ${createdVideos?.length || 0}`);
    console.log(createdVideos);
  }
  
  // 4. Ottieni le categorie create dall'istruttore
  const { data: createdCategories, error: ccError } = await supabase
    .from('video_categories')
    .select('*')
    .eq('creator_id', instructorId);
  
  if (ccError) {
    console.error('Errore nel verificare le categorie create dall\'istruttore:', ccError);
  } else {
    console.log(`\nCategorie con creator_id = ${instructorId}: ${createdCategories?.length || 0}`);
    console.log(createdCategories);
  }
}

// Esegui la verifica
checkInstructorVideos()
  .then(() => console.log('Verifica completata'))
  .catch(err => console.error('Errore durante la verifica:', err)); 