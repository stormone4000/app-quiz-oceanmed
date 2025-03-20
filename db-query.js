// Questo script esegue una query al database Supabase per ottenere
// i video e le categorie associati all'istruttore con ID specificato
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase (utilizziamo l'URL e la chiave già presenti nell'app)
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// ID dell'istruttore da cercare
const instructorId = '4d926f8c-c379-43a1-9fd2-3d66106c01cf';

// Funzione principale che esegue le query
async function queryDatabase() {
  console.log('Esecuzione query per istruttore ID:', instructorId);
  
  // 1. Query per le categorie di video create dall'istruttore
  console.log('\n--- CATEGORIE DELL\'ISTRUTTORE ---');
  const { data: categories, error: categoriesError } = await supabase
    .from('video_categories')
    .select('*')
    .eq('creator_id', instructorId);
  
  if (categoriesError) {
    console.error('Errore nel recupero delle categorie:', categoriesError);
  } else {
    console.log(`Categorie trovate: ${categories?.length || 0}`);
    console.log(categories);
  }
  
  // 2. Query per i video con creator_id = instructorId
  console.log('\n--- VIDEO CREATI DALL\'ISTRUTTORE (creator_id) ---');
  const { data: videos, error: videosError } = await supabase
    .from('videos')
    .select('*, video_categories(*)')
    .eq('creator_id', instructorId);
  
  if (videosError) {
    console.error('Errore nel recupero dei video:', videosError);
  } else {
    console.log(`Video trovati con creator_id=${instructorId}: ${videos?.length || 0}`);
    console.log(videos);
  }
  
  // 3. Query per i video associati all'istruttore tramite instructor_videos
  console.log('\n--- VIDEO ASSOCIATI ALL\'ISTRUTTORE (instructor_videos) ---');
  const { data: instructorVideos, error: instructorVideosError } = await supabase
    .from('instructor_videos')
    .select('video_id, videos(*, video_categories(*))')
    .eq('instructor_id', instructorId);
  
  if (instructorVideosError) {
    console.error('Errore nel recupero delle relazioni instructor_videos:', instructorVideosError);
  } else {
    console.log(`Relazioni instructor_videos trovate: ${instructorVideos?.length || 0}`);
    console.log(instructorVideos);
  }
  
  // 4. Query per trovare tutti i video pubblici nel sistema
  console.log('\n--- TUTTI I VIDEO PUBBLICI ---');
  const { data: publicVideos, error: publicVideosError } = await supabase
    .from('videos')
    .select('*, video_categories(*)')
    .eq('is_public', true);
  
  if (publicVideosError) {
    console.error('Errore nel recupero dei video pubblici:', publicVideosError);
  } else {
    console.log(`Video pubblici trovati: ${publicVideos?.length || 0}`);
    console.log(publicVideos);
  }
  
  // 5. Query per controllare tutte le categorie disponibili
  console.log('\n--- TUTTE LE CATEGORIE DISPONIBILI ---');
  const { data: allCategories, error: allCategoriesError } = await supabase
    .from('video_categories')
    .select('*')
    .order('title', { ascending: true });
  
  if (allCategoriesError) {
    console.error('Errore nel recupero di tutte le categorie:', allCategoriesError);
  } else {
    console.log(`Totale categorie disponibili: ${allCategories?.length || 0}`);
    console.log(allCategories);
  }
}

// Esegui le query
queryDatabase()
  .then(() => console.log('Query completate'))
  .catch(err => console.error('Errore durante l\'esecuzione delle query:', err)); 