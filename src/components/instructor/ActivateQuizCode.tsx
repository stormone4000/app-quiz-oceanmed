import React, { useState } from 'react';
import { supabase, supabaseAdmin } from '../../services/supabase';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../ui/Modal';

// Funzione per generare un UUID v4
const generateUUID = () => {
  // Implementazione più robusta di UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Funzione per verificare se una stringa è un UUID v4 valido
const isValidUUID = (uuid: string): boolean => {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(uuid);
};

interface ActivateQuizCodeProps {
  onQuizActivated?: () => void;
}

const ActivateQuizCode: React.FC<ActivateQuizCodeProps> = ({ onQuizActivated }) => {
  const [quizCode, setQuizCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { modalState, showSuccess, showError, closeModal } = useModal();

  const handleActivateQuiz = async () => {
    if (!quizCode.trim()) {
      setError('Inserisci un codice quiz valido');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Prima verifichiamo se il codice esiste usando supabaseAdmin invece di supabase
      const { data: codeExists, error: codeError } = await supabaseAdmin
        .from('quiz_templates')
        .select('id, title')
        .eq('quiz_code', quizCode.trim())
        .single();
      
      if (codeError || !codeExists) {
        setError('Codice quiz non valido o inesistente');
        showError('Codice non valido', 'Il codice inserito non corrisponde a nessun quiz esistente. Verifica che il codice sia corretto.');
        return;
      }
      
      // Ottieni l'email dell'utente corrente - metodo alternativo
      // Prima prova a ottenere dal localStorage
      let userEmail = localStorage.getItem('userEmail');
      
      // Se non è disponibile nel localStorage, prova con l'Auth API
      if (!userEmail) {
        const { data: sessionData } = await supabase.auth.getSession();
        userEmail = sessionData?.session?.user?.email || '';
      }
      
      // Se ancora non abbiamo l'email, ultimo tentativo con getUser
      if (!userEmail) {
        const { data: userData } = await supabase.auth.getUser();
        userEmail = userData?.user?.email || '';
      }
      
      console.log("Email utente recuperata:", userEmail);
      
      if (!userEmail) {
        setError('Errore: Impossibile identificare l\'utente corrente');
        showError('Errore Utente', 'Impossibile identificare l\'utente corrente. Prova a effettuare nuovamente l\'accesso.');
        return;
      }
      
      // Ottieni il quiz originale usando supabaseAdmin
      const { data: quizData, error: quizError } = await supabaseAdmin
        .from('quiz_templates')
        .select('*')
        .eq('quiz_code', quizCode.trim())
        .single();
      
      if (quizError || !quizData) {
        setError('Errore nel recupero del quiz');
        showError('Errore', 'Si è verificato un errore durante il recupero del quiz.');
        return;
      }
      
      // Metodo diretto (senza RPC, che sembra dare problemi)
      // Crea una copia del quiz con un nuovo ID e l'utente corrente come creatore
      const newQuizCode = `QUIZ-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const currentTimestamp = new Date().toISOString();
      
      // Crea un nuovo oggetto senza includere l'id
      const { id, ...quizDataWithoutId } = quizData;
      
      const newQuiz = {
        ...quizDataWithoutId,
        created_by: userEmail,
        quiz_code: newQuizCode,
        code_generated_at: currentTimestamp,
        // created_at verrà impostato automaticamente dal default della tabella
      };
      
      console.log("Tentativo di inserimento nuovo quiz:", newQuiz);
      
      // Inserisci il nuovo quiz usando supabaseAdmin
      const { data: insertedQuiz, error: insertError } = await supabaseAdmin
        .from('quiz_templates')
        .insert([newQuiz])
        .select()
        .single();
      
      if (insertError) {
        console.error('Errore nell\'inserimento del quiz:', insertError);
        setError('Errore durante la duplicazione del quiz');
        showError('Errore', 'Si è verificato un errore durante la duplicazione del quiz.');
        return;
      }
      
      console.log("Quiz inserito con successo:", insertedQuiz);
      
      // Determina la tabella corretta per le domande in base al tipo di quiz
      const questionsTableName = quizData.quiz_type === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
      console.log(`Utilizzo tabella ${questionsTableName} per le domande del quiz di tipo ${quizData.quiz_type}`);
      
      // Copia le domande dal quiz originale al nuovo quiz usando supabaseAdmin
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from(questionsTableName)
        .select('*')
        .eq('quiz_id', quizData.id);
      
      if (questionsError) {
        console.error('Errore nel recupero delle domande:', questionsError);
        setError('Errore durante il recupero delle domande del quiz');
        showError('Errore', 'Si è verificato un errore durante il recupero delle domande del quiz.');
        return;
      }
      
      console.log(`Trovate ${questions?.length || 0} domande da copiare`);
      
      if (questions && questions.length > 0) {
        // Crea nuove domande per il nuovo quiz
        const newQuestions = questions.map(q => {
          // Assicuriamoci che le opzioni siano nel formato corretto
          let options = q.options;
          if (typeof options === 'string') {
            try {
              options = JSON.parse(options);
              console.log(`Opzioni parsate da stringa JSON per la domanda: ${q.id}`);
            } catch (e) {
              console.error(`Errore nel parsing delle opzioni per la domanda ${q.id}:`, e);
              options = [];
            }
          } else if (!Array.isArray(options)) {
            console.log(`Opzioni non in formato array per la domanda ${q.id}, tipo: ${typeof options}`);
            // Se options è un oggetto, prova a convertirlo in array
            if (options && typeof options === 'object') {
              try {
                options = Object.values(options);
                console.log(`Opzioni convertite da oggetto ad array: ${JSON.stringify(options)}`);
              } catch (e) {
                console.error(`Errore nella conversione delle opzioni in array:`, e);
                options = [];
              }
            } else {
              options = [];
            }
          }
          
          // Assicuriamoci che correct_answer sia un numero
          let correctAnswer = q.correct_answer;
          if (typeof correctAnswer === 'string') {
            correctAnswer = parseInt(correctAnswer, 10);
            if (isNaN(correctAnswer)) {
              correctAnswer = 0; // Valore predefinito
            }
          }
          
          return {
            ...q,
            id: generateUUID(), // Generiamo un nuovo UUID
            quiz_id: insertedQuiz.id,
            options: Array.isArray(options) ? options : [],
            correct_answer: correctAnswer
          };
        });
        
        console.log(`Preparate ${newQuestions.length} domande da inserire`);
        console.log(`Prima domanda esempio: ${JSON.stringify(newQuestions[0])}`);
        
        // Inserisci le nuove domande una alla volta per evitare problemi di policy
        let successCount = 0;
        let errorCount = 0;
        
        for (const question of newQuestions) {
          try {
            const { error: insertQuestionError } = await supabaseAdmin
              .from(questionsTableName)
              .insert([question]);
              
            if (insertQuestionError) {
              console.error('Errore nell\'inserimento domanda:', insertQuestionError);
              errorCount++;
              
              // Tentativo alternativo con un approccio diverso
              try {
                // Rimuovi l'ID per lasciare che il database lo generi
                const { id, ...questionWithoutId } = question;
                const { error: altInsertError } = await supabaseAdmin
                  .from(questionsTableName)
                  .insert([{
                    ...questionWithoutId,
                    quiz_id: insertedQuiz.id,
                    // Assicuriamoci che options sia una stringa JSON se non lo è già
                    options: Array.isArray(questionWithoutId.options) 
                      ? questionWithoutId.options 
                      : (typeof questionWithoutId.options === 'string' 
                          ? JSON.parse(questionWithoutId.options) 
                          : [])
                  }]);
                  
                if (altInsertError) {
                  console.error('Anche il tentativo alternativo è fallito:', altInsertError);
                } else {
                  console.log('Domanda inserita con metodo alternativo');
                  successCount++;
                }
              } catch (e) {
                console.error('Errore nel tentativo alternativo:', e);
              }
            } else {
              successCount++;
            }
          } catch (e) {
            console.error('Errore imprevisto nell\'inserimento della domanda:', e);
            errorCount++;
          }
        }
        
        console.log(`Inserimento domande completato: ${successCount} successi, ${errorCount} errori`);
      } else {
        console.log('Nessuna domanda trovata da copiare');
      }
      
      // Resetta l'input e notifica il completamento
      setQuizCode('');
      if (onQuizActivated) {
        onQuizActivated();
      }
      
      // Verifica finale che le domande siano state copiate correttamente
      const { data: verifyQuestions, error: verifyError } = await supabaseAdmin
        .from(questionsTableName)
        .select('*')
        .eq('quiz_id', insertedQuiz.id);
        
      const questionsCopied = verifyQuestions?.length || 0;
      console.log(`Verifica finale: ${questionsCopied} domande copiate su ${questions?.length || 0} originali`);
      
      // Mostra un messaggio di successo con la modale
      showSuccess(
        'Quiz Duplicato', 
        `Il quiz "${quizData.title}" è stato duplicato con successo nella tua collezione personale con ${questionsCopied} domande. ${
          questionsCopied === 0 ? 'ATTENZIONE: Nessuna domanda è stata copiata. Dovrai aggiungerle manualmente.' : 
          questionsCopied < (questions?.length || 0) ? `ATTENZIONE: Solo ${questionsCopied} domande su ${questions?.length} sono state copiate.` : 
          'Tutte le domande sono state copiate correttamente.'
        } Ora puoi modificarlo o assegnarlo ai tuoi studenti.`,
        'Fantastico!'
      );
      
    } catch (err) {
      console.error('Errore durante la duplicazione del quiz:', err);
      setError('Si è verificato un errore durante la duplicazione del quiz');
      showError('Errore', 'Si è verificato un errore imprevisto durante la duplicazione del quiz. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <h3 className="text-lg font-medium text-blue-800 dark:text-blue-300">Attiva Quiz di altri Istruttori</h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
          Inserisci il codice fornito da un altro istruttore per aggiungere il suo quiz alla tua collezione. 
          Questo ti permetterà di avere una copia del quiz che potrai utilizzare con i tuoi studenti.
        </p>
        
        <div className="flex">
          <div className="relative flex-1">
            <input
              type="text"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              placeholder="Es. QUIZ-ABC12345"
              className="w-full rounded-l-md border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 py-3 px-4 text-sm placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={handleActivateQuiz}
              disabled={isLoading || !quizCode.trim()}
              className="absolute right-0 top-0 h-full px-4 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Attiva quiz con questo codice"
            >
              {isLoading ? (
                <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span className="hidden sm:inline">Attiva</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-500">
            {error}
          </div>
        )}
      </div>

      {/* Modal per mostrare notifiche */}
      <Modal 
        isOpen={modalState.isOpen} 
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
      />
    </>
  );
};

export default ActivateQuizCode; 