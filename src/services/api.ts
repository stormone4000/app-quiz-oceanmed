import { supabase } from './supabase';
import type { Question, QuizResult } from '../types';

export async function getQuestions(): Promise<Question[]> {
  try {
    // Semplifichiamo la query per evitare problemi di tipo
    const { data: questions, error } = await supabase
      .from('questions')
      .select(`
        id,
        text,
        options,
        correct_answer,
        time_limit,
        quiz_id
      `);

    if (error) throw error;

    // Otteniamo le categorie in una query separata se necessario
    const { data: quizCategories } = await supabase
      .from('quizzes')
      .select('id, category');
    
    // Creiamo una mappa di id -> categoria
    const categoryMap = new Map();
    if (quizCategories) {
      quizCategories.forEach((quiz: any) => {
        categoryMap.set(quiz.id, quiz.category || '');
      });
    }

    return (questions || []).map(q => ({
      id: q.id,
      question: q.text,
      options: q.options,
      correctAnswer: q.correct_answer,
      category: categoryMap.get(q.quiz_id) || '',
      timeLimit: q.time_limit
    }));
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

export async function saveQuizResult(result: QuizResult): Promise<void> {
  try {
    console.log("=== INIZIO SALVATAGGIO RISULTATO QUIZ ===");
    
    if (!result.email) {
      console.error("Errore: Email studente mancante");
      throw new Error('Student email is required');
    }
    console.log("Email studente verificata:", result.email);

    if (!result.quizId) {
      console.error("Errore: ID quiz mancante");
      throw new Error('Quiz ID is required');
    }
    console.log("ID quiz verificato:", result.quizId, "Tipo:", typeof result.quizId);

    // Validate and normalize the score
    const score = Math.max(0, Math.min(1, result.score));
    if (isNaN(score)) {
      console.error("Errore: Punteggio non valido:", result.score);
      throw new Error('Invalid score value');
    }
    console.log("Punteggio normalizzato:", score);

    // Validate other required fields
    if (!Array.isArray(result.answers)) {
      console.error("Errore: Array risposte non valido:", result.answers);
      throw new Error('Invalid answers array');
    }
    console.log("Array risposte verificato, lunghezza:", result.answers.length);

    if (!Array.isArray(result.questionTimes)) {
      console.error("Errore: Array tempi domande non valido:", result.questionTimes);
      throw new Error('Invalid question times array');
    }
    console.log("Array tempi domande verificato, lunghezza:", result.questionTimes.length);

    // Recupera l'ID utente dall'email
    console.log("Recupero ID utente da auth_users per email:", result.email);
    const { data: userIdData, error: userIdError } = await supabase
      .from('auth_users')
      .select('id, first_name, last_name')
      .eq('email', result.email)
      .single();

    if (userIdError) {
      console.error('Errore nel recupero ID utente:', userIdError);
      // Non blocchiamo il processo se non troviamo l'utente, potrebbe essere un utente guest
      console.warn(`Impossibile trovare l'utente con email ${result.email}: ${userIdError.message}`);
    }

    // Verifichiamo se il quiz esiste nella tabella quizzes
    console.log("Verifica esistenza quiz con ID:", result.quizId);
    const { data: quizExists, error: quizError } = await supabase
      .from('quizzes')
      .select('id')
      .eq('id', result.quizId)
      .single();

    if (quizError) {
      console.warn('Quiz non trovato nella tabella quizzes, verifica l\'ID:', result.quizId);
      console.warn('Errore:', quizError);
      
      // Proviamo a cercare il quiz in altre tabelle
      console.log("Tentativo di trovare il quiz in quiz_templates...");
      const { data: quizTemplate, error: templateError } = await supabase
        .from('quiz_templates')
        .select('id, title')
        .eq('id', result.quizId)
        .single();
        
      if (!templateError && quizTemplate) {
        console.log("Quiz trovato in quiz_templates, ID:", quizTemplate.id);
        
        // Ora che conosciamo la struttura della tabella quizzes, creiamo un record appropriato
        try {
          console.log("Creazione di un nuovo record nella tabella quizzes...");
          const newQuizData = {
            title: quizTemplate.title || 'Quiz importato',
            description: `Quiz importato da template ${result.quizId}`,
            type_id: null, // Non abbiamo questa informazione
            created_by: null, // Non abbiamo questa informazione
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          console.log("Dati per il nuovo quiz:", newQuizData);
          
          const { data: newQuiz, error: insertError } = await supabase
            .from('quizzes')
            .insert([newQuizData])
            .select('id')
            .single();
            
          if (insertError) {
            console.error("Errore nella creazione del quiz:", insertError);
            console.log("Continuiamo con l'ID originale");
          } else if (newQuiz) {
            console.log("Nuovo quiz creato con ID:", newQuiz.id);
            result.quizId = newQuiz.id; // Usiamo l'ID del nuovo quiz
          }
        } catch (insertError) {
          console.error("Errore durante l'inserimento:", insertError);
          console.log("Continuiamo con l'ID originale");
        }
      } else {
        console.log("Quiz non trovato in quiz_templates, utilizziamo l'ID originale");
      }
    } else {
      console.log("Quiz trovato nella tabella quizzes:", quizExists);
    }

    const resultData = {
      student_email: result.email,
      quiz_id: result.quizId,
      user_id: userIdData?.id, // Potrebbe essere undefined per utenti guest
      score: score,
      total_time: result.totalTime || 0,
      answers: result.answers,
      question_times: result.questionTimes,
      date: result.date || new Date().toISOString(),
      category: result.category || 'uncategorized',
      first_name: userIdData?.first_name || result.firstName || '',
      last_name: userIdData?.last_name || result.lastName || ''
    };

    console.log("Dati da inserire:", JSON.stringify(resultData));

    // Tentativo con client standard
    console.log("Tentativo di inserimento con client standard...");
    const { error: insertError } = await supabase
      .from('results')
      .insert([resultData]);

    if (insertError) {
      console.error('Errore dettagliato durante inserimento risultato:', insertError);
      console.error('Codice errore:', insertError.code);
      console.error('Messaggio errore:', insertError.message);
      console.error('Dettagli errore:', insertError.details);
      
      // Se l'errore è dovuto al vincolo user_id, proviamo senza
      if (insertError.message.includes('results_user_id_fkey') && resultData.user_id) {
        console.log("Tentativo di inserimento senza user_id...");
        const resultDataWithoutUserId = { ...resultData };
        delete resultDataWithoutUserId.user_id;
        
        const { error: retryError } = await supabase
          .from('results')
          .insert([resultDataWithoutUserId]);
          
        if (retryError) {
          console.error('Errore anche senza user_id:', retryError);
        } else {
          console.log("Risultato salvato con successo senza user_id!");
          return;
        }
      }
      
      // Se l'errore è dovuto al vincolo quiz_id, proviamo con un approccio diverso
      if (insertError.message.includes('results_quiz_id_fkey')) {
        console.log("Errore di foreign key su quiz_id, tentativo alternativo...");
        
        // Proviamo a salvare il risultato senza quiz_id
        const resultDataWithoutQuizId = { ...resultData };
        delete resultDataWithoutQuizId.quiz_id;
        
        const { error: retryError } = await supabase
          .from('results')
          .insert([resultDataWithoutQuizId]);
          
        if (retryError) {
          console.error('Errore anche senza quiz_id:', retryError);
        } else {
          console.log("Risultato salvato con successo senza quiz_id!");
          return;
        }
      }
      
      // Tentativo con client admin se disponibile
      console.log("Tentativo di inserimento con client admin...");
      try {
        const { supabaseAdmin } = await import('./supabase');
        const { error: adminInsertError } = await supabaseAdmin
          .from('results')
          .insert([resultData]);
          
        if (adminInsertError) {
          console.error('Errore anche con client admin:', adminInsertError);
          throw new Error(`Failed to save quiz result: ${adminInsertError.message}`);
        } else {
          console.log("Risultato salvato con successo usando client admin!");
          return;
        }
      } catch (adminError) {
        console.error('Errore durante il tentativo con client admin:', adminError);
        throw new Error(`Failed to save quiz result: ${insertError.message}`);
      }
    }

    console.log("Risultato salvato con successo!");
    console.log("=== FINE SALVATAGGIO RISULTATO QUIZ ===");
  } catch (error) {
    console.error('Errore generale durante il salvataggio del risultato:', error);
    throw error;
  }
}

export async function getQuizResults(email?: string): Promise<QuizResult[]> {
  try {
    let query = supabase
      .from('results')
      .select(`
        *,
        quiz:quizzes(
          title,
          description
        )
      `)
      .order('date', { ascending: false });
    
    // Se è stata fornita un'email, filtra i risultati per quella email
    if (email) {
      query = query.eq('student_email', email);
    }
    
    const { data: results, error } = await query;

    if (error) {
      console.error('Error fetching quiz results:', error);
      return [];
    }

    // Se non ci sono risultati, restituisci un array vuoto
    if (!results || results.length === 0) {
      console.log('Nessun risultato trovato' + (email ? ` per l'email ${email}` : ''));
      return [];
    }

    return results.map((result: any) => ({
      email: result.student_email,
      score: result.score,
      totalTime: result.total_time,
      answers: result.answers,
      questionTimes: result.question_times,
      date: result.date,
      category: result.category,
      quizId: result.quiz_id,
      firstName: result.first_name,
      lastName: result.last_name
    }));
  } catch (error) {
    console.error('Error in getQuizResults:', error);
    return [];
  }
}