// Script per verificare l'associazione dei contenuti all'istruttore
import { createClient } from '@supabase/supabase-js';

// Configurazione Supabase
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// ID dell'istruttore da verificare
const instructorId = '4d926f8c-c379-43a1-9fd2-3d66106c01cf';

async function verifyContentAssociation() {
  console.log(`\n=== VERIFICA ASSOCIAZIONE CONTENUTI ===`);
  console.log(`Istruttore target: ${instructorId}`);
  
  try {
    // Verifichiamo le informazioni dell'istruttore
    const { data: instructor, error: instructorError } = await supabase
      .from('instructor_profiles')
      .select('*')
      .eq('id', instructorId)
      .single();
    
    if (instructorError) {
      console.error('Errore nel recupero delle informazioni dell\'istruttore:', instructorError);
    } else {
      console.log(`\nInformazioni istruttore:`);
      console.log(`- ID: ${instructor.id}`);
      console.log(`- Email: ${instructor.email}`);
      console.log(`- Nome: ${instructor.business_name || 'Non specificato'}`);
    }
    
    // Verifichiamo le categorie associate all'istruttore
    const { data: categories, count: categoriesCount, error: categoriesError } = await supabase
      .from('video_categories')
      .select('*', { count: 'exact' })
      .eq('creator_id', instructorId)
      .order('title', { ascending: true });
    
    if (categoriesError) {
      console.error('Errore nel recupero delle categorie:', categoriesError);
    } else {
      console.log(`\nCategorie associate all'istruttore: ${categoriesCount}`);
      console.log('Elenco categorie:');
      categories.forEach((category, index) => {
        console.log(`${index + 1}. ${category.title} (ID: ${category.id})`);
      });
    }
    
    // Verifichiamo i video associati all'istruttore
    const { data: videos, count: videosCount, error: videosError } = await supabase
      .from('videos')
      .select('*, video_categories(title)', { count: 'exact' })
      .eq('creator_id', instructorId)
      .order('title', { ascending: true });
    
    if (videosError) {
      console.error('Errore nel recupero dei video:', videosError);
    } else {
      console.log(`\nVideo associati all'istruttore: ${videosCount}`);
      console.log('Elenco video (primi 10):');
      videos.slice(0, 10).forEach((video, index) => {
        console.log(`${index + 1}. ${video.title} (ID: ${video.id}, Categoria: ${video.video_categories?.title || 'N/A'})`);
      });
      
      if (videosCount > 10) {
        console.log(`... e altri ${videosCount - 10} video`);
      }
    }
    
    // Verifichiamo se ci sono ancora contenuti senza creator_id
    const { count: categoriesWithoutCreator, error: catNullError } = await supabase
      .from('video_categories')
      .select('*', { count: 'exact', head: true })
      .is('creator_id', null);
      
    const { count: videosWithoutCreator, error: vidNullError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .is('creator_id', null);
    
    if (!catNullError && !vidNullError) {
      console.log(`\nContenuti senza creator_id:`);
      console.log(`- Categorie: ${categoriesWithoutCreator}`);
      console.log(`- Video: ${videosWithoutCreator}`);
      
      if (categoriesWithoutCreator === 0 && videosWithoutCreator === 0) {
        console.log('✅ Tutti i contenuti sono stati associati correttamente!');
      } else {
        console.log('⚠️ Ci sono ancora alcuni contenuti senza creator_id.');
      }
    }
    
  } catch (error) {
    console.error('Errore durante la verifica:', error);
  }
}

// Avviamo la verifica
verifyContentAssociation()
  .then(() => console.log('\n=== VERIFICA COMPLETATA ==='))
  .catch(err => console.error('Errore durante l\'esecuzione:', err)); 