import { createClient } from '@supabase/supabase-js';

// Usa le stesse chiavi dal file supabase.ts
const supabaseUrl = 'https://uqutbomzymeklyowfewp.supabase.co';
const supabaseServiceRole = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdXRib216eW1la2x5b3dmZXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTI4NDY1OSwiZXhwIjoyMDU0ODYwNjU5fQ.ReeAgOge64_oVk3PxqdxV5OaWRa4q4QTLwQ2bYh2ZIc';

// Inizializzo client con service role
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);

// Simula la funzione loadQuizzes del componente QuizManager
async function testLoadQuizzes() {
  console.log('=== TEST CARICAMENTO QUIZ ===');
  
  try {
    const email = 'marcosrenatobruno@gmail.com'; // Simula email dell'utente
    const mode = 'all'; // Modalità 'all' o 'manage'
    const filterMode = 'public'; // Filtro 'all', 'my', 'public', 'private'
    const activeTab = 'learning'; // Tipo di quiz 'learning', 'exam', 'interactive'
    
    console.log('Email utente:', email);
    console.log('Modalità:', mode);
    console.log('Filtro:', filterMode);
    console.log('Tipo quiz:', activeTab);
    
    let query = supabaseAdmin
      .from('quiz_templates')
      .select('*')
      .eq('quiz_type', activeTab);
      
    // Filtriamo in base alla modalità e al filtro
    if (mode === 'manage') {
      // In modalità gestione, mostriamo solo i quiz dell'utente
      query = query.eq('created_by', email);
    } else if (mode === 'all') {
      // In modalità "Quiz Disponibili", applichiamo il filtro selezionato
      if (filterMode === 'my') {
        query = query.eq('created_by', email);
      } else if (filterMode === 'public') {
        query = query.eq('visibility', 'public');
      } else if (filterMode === 'private') {
        query = query.eq('created_by', email).eq('visibility', 'private');
      } else {
        // filterMode === 'all', mostriamo tutti i quiz dell'utente + quelli pubblici
        query = query.or(`created_by.eq.${email},visibility.eq.public`);
      }
    }
    
    // Ordiniamo i quiz
    query = query.order('created_at', { ascending: false });
    
    console.log('Esecuzione query...');
    
    // Eseguiamo la query
    const { data: quizData, error } = await query;
    
    if (error) {
      console.error('❌ Errore nell\'esecuzione della query:', error);
      return;
    }
    
    console.log('✅ Quiz trovati:', quizData?.length || 0);
    
    // Stampa i dettagli dei quiz trovati
    if (quizData && quizData.length > 0) {
      console.log('Dettagli quiz:');
      quizData.forEach(quiz => {
        console.log(`- ${quiz.title} (${quiz.id})`);
        console.log(`  Visibilità: ${quiz.visibility}`);
        console.log(`  Creato da: ${quiz.created_by}`);
        console.log(`  Tipo: ${quiz.quiz_type}`);
        console.log('  ---');
      });
    } else {
      console.log('Nessun quiz trovato.');
    }
    
  } catch (err) {
    console.error('❌ Errore generale:', err);
  }
}

// Esegui il test
testLoadQuizzes(); 