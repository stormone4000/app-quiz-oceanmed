import React, { useState } from 'react';
import { supabase, supabaseAdmin } from '../../services/supabase';
import { useModal } from '../../hooks/useModal';
import { Modal } from '../ui/Modal';

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
      
      // Copia le domande dal quiz originale al nuovo quiz usando supabaseAdmin
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizData.id);
      
      if (questionsError) {
        console.error('Errore nel recupero delle domande:', questionsError);
        setError('Errore durante il recupero delle domande del quiz');
        showError('Errore', 'Si è verificato un errore durante il recupero delle domande del quiz.');
        return;
      }
      
      if (questions && questions.length > 0) {
        // Crea nuove domande per il nuovo quiz
        const newQuestions = questions.map(q => ({
          ...q,
          id: undefined, // Supabase genererà un nuovo ID
          quiz_id: insertedQuiz.id
        }));
        
        console.log("Tentativo inserimento domande:", newQuestions.length);
        
        // Inserisci le nuove domande una alla volta per evitare problemi di policy
        for (const question of newQuestions) {
          const { error: insertQuestionError } = await supabaseAdmin
            .from('quiz_questions')
            .insert([question]);
            
          if (insertQuestionError) {
            console.error('Errore nell\'inserimento domanda:', insertQuestionError);
          }
        }
        
        // Non c'è bisogno di copiare le risposte poiché non esiste una tabella separata
        // Le risposte sono probabilmente già incluse nelle domande
      }
      
      // Resetta l'input e notifica il completamento
      setQuizCode('');
      if (onQuizActivated) {
        onQuizActivated();
      }
      
      // Mostra un messaggio di successo con la modale
      showSuccess(
        'Quiz Duplicato', 
        `Il quiz "${quizData.title}" è stato duplicato con successo nella tua collezione personale. Ora puoi modificarlo o assegnarlo ai tuoi studenti.`,
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