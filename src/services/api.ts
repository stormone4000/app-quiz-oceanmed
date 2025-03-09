import { supabase } from './supabase';
import type { 
  Question, 
  QuizResult, 
  LiveQuizSession, 
  LiveQuizParticipant 
} from '../types';
import { v4 as uuidv4 } from 'uuid';

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
      // Invece di lanciare un errore, generiamo un nuovo ID
      result.quizId = uuidv4();
      console.log("ID quiz generato automaticamente:", result.quizId);
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

    // Importa direttamente il supabaseAdmin per tutte le operazioni
    const { supabaseAdmin } = await import('./supabase');
    
    // APPROCCIO DIRETTO: Creiamo sempre un nuovo quiz nella tabella quizzes
    // Questo evita problemi di foreign key constraint
    console.log("Creazione diretta di un nuovo quiz nella tabella quizzes usando client admin...");
    const newQuizId = uuidv4();
    
    // Cerchiamo un type_id valido dalla tabella quiz_types
    console.log("Cerco un type_id valido dalla tabella quiz_types...");
    
    // Mappiamo il tipo di quiz interno ai nomi dei tipi nel database
    let quizTypeName = 'Esame Standardizzato'; // Default per 'exam'
    if (result.quiz_type === 'learning') {
      quizTypeName = 'Modulo di Apprendimento';
    } else if (result.quiz_type === 'interactive') {
      quizTypeName = 'Quiz Interattivo';
    }
    
    console.log(`Cerco un type_id per il tipo: ${result.quiz_type || 'exam'} (${quizTypeName})`);
    
    // Cerchiamo un type_id che corrisponda al tipo del quiz usando supabaseAdmin
    const { data: quizTypes, error: typesError } = await supabaseAdmin
      .from('quiz_types')
      .select('id, name')
      .eq('name', quizTypeName);
      
    let validTypeId;
    
    if (typesError || !quizTypes || quizTypes.length === 0) {
      console.warn(`Nessun tipo di quiz trovato per: ${quizTypeName}`);
      console.log("Provo a recuperare qualsiasi tipo di quiz disponibile...");
      
      // Se non troviamo un tipo corrispondente, prendiamo il primo disponibile usando supabaseAdmin
      const { data: anyTypes, error: anyTypesError } = await supabaseAdmin
        .from('quiz_types')
        .select('id')
        .limit(1);
        
      if (anyTypesError || !anyTypes || anyTypes.length === 0) {
        console.error("Errore nel recupero di un type_id valido:", anyTypesError);
        throw new Error('Impossibile recuperare un type_id valido');
      }
      
      validTypeId = anyTypes[0].id;
      console.log("Type ID generico trovato:", validTypeId);
    } else {
      validTypeId = quizTypes[0].id;
      console.log(`Type ID specifico trovato per '${quizTypeName}':`, validTypeId);
    }
    
    const newQuizData = {
      id: newQuizId,
      title: result.category ? `Quiz ${result.category}` : 'Quiz completato',
      description: `Quiz completato il ${new Date().toLocaleString()}`,
      category: result.category || 'uncategorized',
      type_id: validTypeId, // Usiamo un type_id valido dalla tabella quiz_types
      created_by: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      questions: result.questions || []
    };
    
    console.log("Dati per il nuovo quiz:", JSON.stringify(newQuizData));
    
    // Usa supabaseAdmin per inserire il quiz
    const { data: newQuiz, error: quizInsertError } = await supabaseAdmin
      .from('quizzes')
      .insert([newQuizData])
      .select('id')
      .single();
      
    if (quizInsertError) {
      console.error("Errore nella creazione del quiz:", quizInsertError);
      throw new Error(`Failed to create quiz: ${quizInsertError.message}`);
    }
    
    console.log("Nuovo quiz creato con successo, ID:", newQuiz.id);
    
    // Ora salviamo il risultato con il nuovo quiz_id usando supabaseAdmin
    const resultData = {
      student_email: result.email,
      quiz_id: newQuiz.id, // Usiamo l'ID del nuovo quiz appena creato
      user_id: userIdData?.id, // Potrebbe essere undefined per utenti guest
      score: score,
      total_time: result.totalTime || 0,
      answers: result.answers,
      question_times: result.questionTimes,
      date: result.date || new Date().toISOString(),
      category: result.category || 'uncategorized',
      first_name: userIdData?.first_name || result.firstName || '',
      last_name: userIdData?.last_name || result.lastName || '',
      user_answers: result.userAnswers || [], // Aggiungiamo le risposte specifiche dell'utente
      quiz_type: result.quiz_type || 'exam' // Aggiungiamo il tipo di quiz
    };

    console.log("Dati da inserire:", JSON.stringify(resultData));

    // Usa direttamente supabaseAdmin per inserire il risultato
    console.log("Tentativo di inserimento con client admin...");
    const { error: adminInsertError } = await supabaseAdmin
      .from('results')
      .insert([resultData]);
      
    if (adminInsertError) {
      console.error('Errore con client admin:', adminInsertError);
      throw new Error(`Failed to save quiz result: ${adminInsertError.message}`);
    }
      
    console.log("Risultato salvato con successo usando client admin!");
    console.log("=== FINE SALVATAGGIO RISULTATO QUIZ ===");
  } catch (error) {
    console.error('Errore generale durante il salvataggio del risultato:', error);
    throw error;
  }
}

export const getQuizResults = async (email?: string): Promise<QuizResult[]> => {
  console.log(`[${new Date().toISOString()}] Caricamento risultati quiz per email: ${email || 'non specificata'}`);
  
  try {
    // Importa il client admin per bypassare le restrizioni RLS
    const { supabaseAdmin } = await import('./supabase');
    
    let query = supabaseAdmin
      .from('results')
      .select(`
        *,
        quizzes (
          id,
          title,
          description
        )
      `);

    if (email) {
      query = query.eq('student_email', email);
    }

    const { data: results, error } = await query;

    if (error) {
      console.error('Errore nel caricamento dei risultati:', error);
      return [];
    }

    if (!results || results.length === 0) {
      console.log('Nessun risultato trovato per email:', email);
      return [];
    }

    console.log(`Trovati ${results.length} risultati per email: ${email}`);
    
    // Esempio di un risultato per debug
    if (results.length > 0) {
      console.log('Esempio di risultato:', JSON.stringify(results[0], null, 2).substring(0, 500) + '...');
    }

    const formattedResults: QuizResult[] = await Promise.all(
      results.map(async (result) => {
        console.log(`[${new Date().toISOString()}] Elaborazione risultato con ID: ${result.id}, Quiz ID: ${result.quiz_id}`);
        
        const formattedResult: QuizResult = {
          id: result.id,
          studentId: result.user_id,
          firstName: result.first_name,
          lastName: result.last_name,
          email: result.student_email,
          score: result.score,
          totalTime: result.total_time,
          answers: result.answers,
          questionTimes: result.question_times,
          date: result.date,
          category: result.category,
          quizId: result.quiz_id,
          questions: [] // Inizializziamo con un array vuoto
        };

        // Caricamento delle domande associate al quiz
        if (result.quiz_id) {
          try {
            console.log(`[${new Date().toISOString()}] Tentativo 1: Caricamento domande da quiz_questions per quiz_id: ${result.quiz_id}`);
            
            // Tentativo 1: Caricare le domande dalla tabella quiz_questions usando supabaseAdmin
            const { data: questionData, error: questionError } = await supabaseAdmin
              .from('quiz_questions')
              .select('*')
              .eq('quiz_id', result.quiz_id);

            if (questionError) {
              console.error(`Errore nel caricamento delle domande per quiz_id ${result.quiz_id}:`, questionError);
            }

            if (questionData && questionData.length > 0) {
              console.log(`Trovate ${questionData.length} domande nella tabella quiz_questions`);
              formattedResult.questions = questionData;
            } else {
              console.log(`Nessuna domanda trovata nella tabella quiz_questions per quiz_id: ${result.quiz_id}`);
              
              // Tentativo 2: Caricare le domande dal template del quiz usando supabaseAdmin
              console.log(`[${new Date().toISOString()}] Tentativo 2: Caricamento domande dal template per quiz_id: ${result.quiz_id}`);
              const { data: quizData, error: quizError } = await supabaseAdmin
                .from('quizzes')
                .select('template_id, questions')
                .eq('id', result.quiz_id)
                .single();

              if (quizError) {
                console.error(`Errore nel caricamento del template_id per quiz_id ${result.quiz_id}:`, quizError);
                
                // Se c'è un errore, potrebbe essere perché la colonna 'questions' non esiste
                // Proviamo di nuovo senza richiedere quella colonna usando supabaseAdmin
                console.log(`Tentativo alternativo senza colonna 'questions'`);
                const { data: quizDataAlt, error: quizErrorAlt } = await supabaseAdmin
                  .from('quizzes')
                  .select('template_id')
                  .eq('id', result.quiz_id)
                  .single();
                  
                if (quizErrorAlt) {
                  console.error(`Errore anche nel tentativo alternativo:`, quizErrorAlt);
                } else if (quizDataAlt && quizDataAlt.template_id) {
                  console.log(`Trovato template_id: ${quizDataAlt.template_id} per quiz_id: ${result.quiz_id}`);
                  
                  const { data: templateQuestions, error: templateError } = await supabaseAdmin
                    .from('quiz_templates')
                    .select('questions')
                    .eq('id', quizDataAlt.template_id)
                    .single();

                  if (templateError) {
                    console.error(`Errore nel caricamento delle domande dal template ${quizDataAlt.template_id}:`, templateError);
                  }

                  if (templateQuestions && templateQuestions.questions && templateQuestions.questions.length > 0) {
                    console.log(`Trovate ${templateQuestions.questions.length} domande nel template`);
                    formattedResult.questions = templateQuestions.questions;
                  }
                }
              } else {
                // Verifichiamo se il quiz ha domande incorporate
                if (quizData && quizData.questions && quizData.questions.length > 0) {
                  console.log(`Trovate ${quizData.questions.length} domande incorporate nel quiz`);
                  formattedResult.questions = quizData.questions;
                } else if (quizData && quizData.template_id) {
                  console.log(`Trovato template_id: ${quizData.template_id} per quiz_id: ${result.quiz_id}`);
                  
                  const { data: templateQuestions, error: templateError } = await supabaseAdmin
                    .from('quiz_templates')
                    .select('questions')
                    .eq('id', quizData.template_id)
                    .single();

                  if (templateError) {
                    console.error(`Errore nel caricamento delle domande dal template ${quizData.template_id}:`, templateError);
                  }

                  if (templateQuestions && templateQuestions.questions && templateQuestions.questions.length > 0) {
                    console.log(`Trovate ${templateQuestions.questions.length} domande nel template`);
                    formattedResult.questions = templateQuestions.questions;
                  } else {
                    console.log(`Nessuna domanda trovata nel template per template_id: ${quizData.template_id}`);
                    
                    // Tentativo 3: Caricare le domande direttamente dalla tabella quizzes usando supabaseAdmin
                    console.log(`[${new Date().toISOString()}] Tentativo 3: Caricamento domande direttamente dalla tabella quizzes per quiz_id: ${result.quiz_id}`);
                    
                    // Questo tentativo potrebbe fallire se la colonna 'questions' non esiste
                    try {
                      const { data: directQuizData, error: directQuizError } = await supabaseAdmin
                        .from('quizzes')
                        .select('questions')
                        .eq('id', result.quiz_id)
                        .single();

                      if (directQuizError) {
                        console.error(`Errore nel caricamento diretto delle domande per quiz_id ${result.quiz_id}:`, directQuizError);
                      }

                      if (directQuizData && directQuizData.questions && directQuizData.questions.length > 0) {
                        console.log(`Trovate ${directQuizData.questions.length} domande direttamente nella tabella quizzes`);
                        formattedResult.questions = directQuizData.questions;
                      }
                    } catch (err) {
                      console.error(`Errore durante il tentativo 3:`, err);
                    }
                    
                    if (!formattedResult.questions || formattedResult.questions.length === 0) {
                      console.log(`Nessuna domanda trovata direttamente nella tabella quizzes per quiz_id: ${result.quiz_id}`);
                      
                      // Tentativo 4: Ultimo tentativo - cercare nella tabella quiz_templates direttamente con l'ID del quiz usando supabaseAdmin
                      console.log(`[${new Date().toISOString()}] Tentativo 4: Caricamento domande da quiz_templates usando direttamente quiz_id: ${result.quiz_id}`);
                      const { data: fallbackTemplateData, error: fallbackTemplateError } = await supabaseAdmin
                        .from('quiz_templates')
                        .select('questions')
                        .eq('id', result.quiz_id)
                        .single();

                      if (fallbackTemplateError) {
                        console.error(`Errore nel tentativo fallback per quiz_id ${result.quiz_id}:`, fallbackTemplateError);
                      }

                      if (fallbackTemplateData && fallbackTemplateData.questions && fallbackTemplateData.questions.length > 0) {
                        console.log(`Trovate ${fallbackTemplateData.questions.length} domande nel tentativo fallback`);
                        formattedResult.questions = fallbackTemplateData.questions;
                      } else {
                        console.log(`Nessuna domanda trovata in nessun tentativo per quiz_id: ${result.quiz_id}`);
                        
                        // Tentativo 5: Cercare nella tabella quiz_templates usando il campo quiz_id usando supabaseAdmin
                        console.log(`[${new Date().toISOString()}] Tentativo 5: Caricamento domande da quiz_templates usando il campo quiz_id: ${result.quiz_id}`);
                        const { data: quizIdTemplateData, error: quizIdTemplateError } = await supabaseAdmin
                          .from('quiz_templates')
                          .select('questions')
                          .eq('quiz_id', result.quiz_id)
                          .single();

                        if (quizIdTemplateError) {
                          console.error(`Errore nel tentativo con quiz_id per quiz_id ${result.quiz_id}:`, quizIdTemplateError);
                        }

                        if (quizIdTemplateData && quizIdTemplateData.questions && quizIdTemplateData.questions.length > 0) {
                          console.log(`Trovate ${quizIdTemplateData.questions.length} domande nel tentativo con quiz_id`);
                          formattedResult.questions = quizIdTemplateData.questions;
                        } else {
                          console.log(`Nessuna domanda trovata in nessun tentativo per quiz_id: ${result.quiz_id}`);
                          formattedResult.questions = [];
                        }
                      }
                    }
                  }
                } else {
                  console.log(`Nessun template_id trovato per quiz_id: ${result.quiz_id}`);
                  formattedResult.questions = [];
                }
              }
            }
          } catch (error) {
            console.error(`Errore durante il caricamento delle domande per quiz_id ${result.quiz_id}:`, error);
            formattedResult.questions = [];
          }
        } else {
          console.log('quiz_id non definito per questo risultato');
          formattedResult.questions = [];
        }

        console.log(`Numero finale di domande caricate per quiz_id ${result.quiz_id}: ${formattedResult.questions ? formattedResult.questions.length : 0}`);
        return formattedResult;
      })
    );

    return formattedResults;
  } catch (error) {
    console.error('Errore generale nel recupero dei risultati quiz:', error);
    return [];
  }
};