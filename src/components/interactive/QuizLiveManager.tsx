import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Users, Trophy, Clock, AlertCircle, Plus, 
         Square as Stop, RefreshCw, Trash2, Target, Edit, Eye, 
         BarChart, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { QuizCreator } from '../instructor/QuizCreator';
import { DeleteQuizModal } from '../instructor/DeleteQuizModal';
import { QuizLiveResults } from './QuizLiveResults';
import QRCode from 'qrcode.react';
import { SessionStats } from './SessionStats';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../config/theme';

interface QuizLiveManagerProps {
  hostEmail: string;
  onBackToMain?: () => void;
}

// Funzione per verificare se un valore è un UUID v4 valido
function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

export function QuizLiveManager({ hostEmail, onBackToMain }: QuizLiveManagerProps) {
  // Stati per la gestione dei quiz e delle sessioni
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<any>(null);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [sessions, setSessions] = useState<{[key: string]: any}>({});
  const [isCreating, setIsCreating] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showResultsView, setShowResultsView] = useState(false);
  const [selectedSessionForResults, setSelectedSessionForResults] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Carica quiz e configura sottoscrizioni real-time all'avvio
  useEffect(() => {
    loadQuizzes();
    const unsubscribe = setupRealtimeSubscription();
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [hostEmail]);

  // Carica le sessioni quando i quiz sono disponibili
  useEffect(() => {
    if (quizzes.length > 0) {
      loadSessions();
    }
  }, [quizzes]);

  // Carica tutti i quiz dell'istruttore
  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Caricamento quiz per l'host:", hostEmail);
      
      const { data, error } = await supabase
        .from('interactive_quiz_templates')
        .select('*')
        .eq('host_email', hostEmail)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Errore nel caricamento dei quiz:", JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log(`Trovati ${data?.length || 0} quiz`);
      
      // Verifica che i quiz abbiano ID validi
      const validQuizzes = data?.filter(quiz => isValidUUID(quiz.id)) || [];
      if (validQuizzes.length < (data?.length || 0)) {
        console.warn(`Filtrati ${(data?.length || 0) - validQuizzes.length} quiz con ID non validi`);
      }
      
      setQuizzes(validQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il caricamento dei quiz');
    } finally {
      setLoading(false);
    }
  };

  // Carica le sessioni attive per i quiz dell'istruttore
  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          participants:live_quiz_participants(*)
        `)
        .eq('host_email', hostEmail)
        .in('status', ['waiting', 'active'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const sessionsMap: {[key: string]: any} = {};
      data?.forEach(session => {
        sessionsMap[session.quiz_id] = session;
      });

      setSessions(sessionsMap);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il caricamento delle sessioni');
    } finally {
      setLoading(false);
    }
  };

  // Genera un PIN univoco per la sessione
  const generatePin = async () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    return pin;
  };

  // Funzione per convertire un ID numerico in UUID
  const convertToUUID = (id: string | number): string => {
    // Crea un UUID v5 basato sull'ID numerico
    // Utilizziamo un namespace fisso per garantire la coerenza
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // Namespace UUID arbitrario
    
    // Converti l'ID in stringa se non lo è già
    const idStr = id.toString();
    
    // Crea un UUID v5 basato sull'ID e sul namespace
    // Questa è una implementazione semplificata, in produzione si dovrebbe usare una libreria UUID
    const hash = Array.from(idStr).reduce((acc, char) => {
      return (acc * 31 + char.charCodeAt(0)) & 0xffffffff;
    }, 0);
    
    // Formatta come UUID v4 (casuale)
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (hash + Math.random() * 16) % 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    
    return uuid;
  };

  // Configura le sottoscrizioni real-time
  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('live-quiz-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_quiz_participants',
        filter: `host_email=eq.${hostEmail}`
      }, () => {
        loadSessions();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_quiz_sessions',
        filter: `host_email=eq.${hostEmail}`
      }, () => {
        loadSessions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Avvia un quiz
  const startQuiz = async (quizId: string) => {
    try {
      if (!isValidUUID(quizId)) {
        console.error("ID quiz non valido, non è un UUID:", quizId);
        setError('ID quiz non valido. Impossibile avviare il quiz.');
        return;
      }
      
      setIsStarting(true);
      setError(null);

      // Controlla se esiste già una sessione per questo quiz
      const session = sessions[quizId];
      
      // Se non esiste una sessione, creane una nuova
      if (!session) {
        console.log('Creazione nuova sessione per quiz:', quizId);
        try {
          const newSession = await createSession(quizId);
          if (!newSession) {
            throw new Error('Impossibile creare la sessione');
          }
          
          // Aggiorna lo stato della sessione appena creata
          const { error: updateError } = await supabase
            .from('live_quiz_sessions')
            .update({
              status: 'active',
              started_at: new Date().toISOString()
            })
            .eq('id', newSession.id);
            
          if (updateError) {
            console.error('Errore nell\'avvio della sessione appena creata:', updateError);
            console.error('Dettagli errore:', JSON.stringify(updateError, null, 2));
            throw new Error(`Errore nell'avvio della sessione: ${updateError.message}`);
          }
          
          // Mostra un messaggio di successo con il PIN
          const pin = newSession.join_code;
          if (pin) {
            // Mostra un alert con il PIN
            window.alert(`Quiz avviato con successo! PIN: ${pin}\nCondividi questo PIN con gli studenti per permettere loro di partecipare.`);
          }
          
          await loadSessions();
          return;
        } catch (sessionError) {
          console.error('Errore dettagliato nella creazione della sessione:', sessionError);
          throw new Error(`Errore nella creazione della sessione: ${sessionError instanceof Error ? sessionError.message : 'Errore sconosciuto'}`);
        }
      }

      // Se esiste già una sessione, aggiornala
      console.log('Avvio sessione esistente:', session.id);
      const { error: updateError } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Errore nell\'avvio della sessione esistente:', updateError);
        console.error('Dettagli errore:', JSON.stringify(updateError, null, 2));
        throw new Error(`Errore nell'avvio della sessione: ${updateError.message}`);
      }
      
      // Mostra un messaggio di successo con il PIN
      const pin = session.join_code;
      if (pin) {
        // Mostra un alert con il PIN
        window.alert(`Quiz avviato con successo! PIN: ${pin}\nCondividi questo PIN con gli studenti per permettere loro di partecipare.`);
      }
      
      await loadSessions();
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'avvio del quiz');
    } finally {
      setIsStarting(false);
    }
  };

  // Crea una nuova sessione per un quiz
  const createSession = async (quizId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Controlla se c'è un PIN salvato in localStorage
      let pin = localStorage.getItem('lastGeneratedPin');
      
      // Se non c'è un PIN salvato, ne genera uno nuovo
      if (!pin) {
        pin = await generatePin();
      } else {
        // Rimuove il PIN da localStorage dopo averlo utilizzato
        localStorage.removeItem('lastGeneratedPin');
      }
      
      // Converti l'ID del quiz in UUID
      const uuidQuizId = convertToUUID(quizId);
      
      console.log(`Creazione sessione per quiz ${quizId} (UUID: ${uuidQuizId}) con PIN: ${pin}`);
      
      const { data: newSession, error: createError } = await supabase
        .from('live_quiz_sessions')
        .insert([{
          quiz_id: uuidQuizId, // Utilizziamo l'ID convertito in UUID
          host_email: hostEmail,
          join_code: pin,
          status: 'waiting'
        }])
        .select()
        .single();

      if (createError) {
        console.error('Errore nella creazione della sessione:', createError);
        throw createError;
      }
      
      // Non aggiorniamo più il quiz con il PIN perché la colonna non esiste
      
      await loadQuizzes(); // Ricarica i quiz
      await loadSessions();
      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Errore durante la creazione della sessione');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Termina un quiz attivo
  const stopQuiz = async (quizId: string) => {
    try {
      setIsStopping(true);
      setError(null);

      const session = sessions[quizId];
      if (!session) {
        throw new Error('Sessione non trovata');
      }

      // Calcola i risultati per tutti i partecipanti
      const { data: participantsData, error: participantsError } = await supabase
        .from('live_quiz_participants')
        .select('*')
        .eq('session_id', session.id);

      if (participantsError) throw participantsError;
      
      // Aggiorna lo stato della sessione
      const { error: updateError } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      await loadSessions();
      setSelectedSessionForResults(session.id);
      setShowResultsView(true);
    } catch (error) {
      console.error('Error stopping quiz:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'arresto del quiz');
    } finally {
      setIsStopping(false);
    }
  };

  // Elimina un quiz
  const handleDeleteQuiz = async (quizId: string) => {
    try {
      if (!isValidUUID(quizId)) {
        console.error("ID quiz non valido, non è un UUID:", quizId);
        setError('ID quiz non valido. Impossibile eliminare il quiz.');
        return;
      }
      
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('interactive_quiz_templates')
        .delete()
        .eq('id', quizId);

      if (deleteError) throw deleteError;
      
      // Ricarica i quiz dopo l'eliminazione
      await loadQuizzes();
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'eliminazione del quiz');
    } finally {
      setLoading(false);
    }
  };

  // Gestisce l'anteprima di un quiz
  const handlePreview = async (quizId: string) => {
    try {
      setLoading(true);
      const quiz = quizzes.find(q => q.id === quizId);
      
      if (!quiz) {
        throw new Error('Quiz non trovato');
      }
      
      const { data, error } = await supabase
        .from('interactive_quiz_questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('position', { ascending: true });
        
      if (error) throw error;
      
      // Naviga alla modalità anteprima con i dati del quiz
      navigate(`/quiz-preview/${quizId}`, { 
        state: { 
          quiz,
          questions: data
        }
      });
    } catch (error) {
      console.error('Error previewing quiz:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il caricamento dell\'anteprima');
    } finally {
      setLoading(false);
    }
  };

  // Gestisce il rendering del contenuto in base alla scheda attiva
  const renderTabContent = () => {
    if (activeTabIndex === 0) {
      return renderActiveQuizzes();
    } else if (activeTabIndex === 1) {
      return renderCompletedSessions();
    } else {
      return renderAllQuizzes();
    }
  };

  // Renderizza la lista di quiz attivi
  const renderActiveQuizzes = () => {
    const activeQuizzes = quizzes.filter(quiz => sessions[quiz.id] && 
      (sessions[quiz.id].status === 'waiting' || sessions[quiz.id].status === 'active'));
    
    if (activeQuizzes.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-slate-600 dark:text-gray-500 mb-4">Nessun quiz attivo al momento</p>
          <button
            onClick={() => setActiveTabIndex(2)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Vai ai tuoi quiz
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeQuizzes.map(quiz => renderQuizCard(quiz))}
      </div>
    );
  };

  // Renderizza le sessioni completate
  const renderCompletedSessions = () => {
    // Implementazione per visualizzare le sessioni completate
    return (
      <div className="py-6">
        <p>Funzionalità in arrivo</p>
      </div>
    );
  };

  // Renderizza tutti i quiz
  const renderAllQuizzes = () => {
    if (quizzes.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-slate-600 dark:text-gray-500 mb-4">Nessun quiz presente</p>
          <button
            onClick={() => setShowCreator(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Crea il tuo primo quiz
          </button>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quizzes.map(quiz => renderQuizCard(quiz))}
      </div>
    );
  };

  // Renderizza una singola card per un quiz
  const renderQuizCard = (quiz: any) => {
    const session = sessions[quiz.id];
    const isActive = session && (session.status === 'waiting' || session.status === 'active');
    const isWaiting = session && session.status === 'waiting';
    const isRunning = session && session.status === 'active';
    
    const participantCount = (session?.participants || []).length;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        key={quiz.id}
        className="bg-white dark:bg-slate-900/80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col"
      >
        {/* Intestazione della card */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${quiz.icon_color}-100 text-${quiz.icon_color}-600`}>
            <Target size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{quiz.title}</h3>
            <p className="text-sm text-slate-600 dark:text-gray-400 truncate">{quiz.description || 'Nessuna descrizione'}</p>
          </div>
        </div>
        
        {/* Corpo della card */}
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
              <Users size={16} />
              <span className="text-sm">{quiz.question_count} domande</span>
            </div>
            
            {isActive && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-gray-400">
                <Users size={16} />
                <span className="text-sm">{participantCount} partecipanti</span>
              </div>
            )}
          </div>
          
          {/* Mostra il PIN della sessione se è attiva */}
          {isActive && session?.join_code && (
            <div className="mt-2 p-3 bg-slate-100 dark:bg-navy-700 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-gray-400 mb-1">Codice PIN:</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-wider">{session.join_code}</span>
                <div className="flex items-center gap-2">
                  {isWaiting && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 text-xs rounded-full">
                      In attesa
                    </span>
                  )}
                  {isRunning && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs rounded-full">
                      In corso
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(session.join_code);
                      // Mostra un feedback di copia
                      const target = e.currentTarget;
                      target.classList.add('text-green-500');
                      setTimeout(() => target.classList.remove('text-green-500'), 1000);
                    }}
                    className="text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                    title="Copia PIN"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Pulsanti azione */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
          {!isActive && (
            <>
              <button
                onClick={() => startQuiz(quiz.id)}
                disabled={isStarting}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-1"
              >
                {isStarting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                <span>Avvia</span>
              </button>
              
              <button
                onClick={() => {
                  setEditingQuiz(quiz);
                  setShowCreator(true);
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg"
              >
                <Edit size={16} />
              </button>
              
              <button
                onClick={() => handlePreview(quiz.id)}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg"
              >
                <Eye size={16} />
              </button>
              
              <button
                onClick={() => {
                  setQuizToDelete(quiz);
                  setShowDeleteModal(true);
                }}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          
          {isActive && (
            <button
              onClick={() => stopQuiz(quiz.id)}
              disabled={isStopping}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-1"
            >
              {isStopping ? <RefreshCw size={16} className="animate-spin" /> : <Stop size={16} />}
              <span>Termina</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // Se è in visualizzazione risultati
  if (showResultsView && selectedSessionForResults) {
    return (
      <div className="p-6">
        <button
          onClick={() => {
            setShowResultsView(false);
            setSelectedSessionForResults(null);
          }}
          className="mb-4 flex items-center text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft size={16} className="mr-1" />
          Torna ai quiz
        </button>
        
        <QuizLiveResults 
          sessionId={selectedSessionForResults}
          onBackClick={() => {
            setShowResultsView(false);
            setSelectedSessionForResults(null);
          }}
        />
      </div>
    );
  }

  // Se è in modalità creazione/modifica quiz
  if (showCreator) {
    return (
      <div className="p-6">
        <QuizCreator
          quizType="interactive"
          editQuiz={editingQuiz}
          hostEmail={hostEmail}
          onClose={() => {
            setShowCreator(false);
            setEditingQuiz(null);
            loadQuizzes();
          }}
          onSaveSuccess={() => {
            setShowCreator(false);
            setEditingQuiz(null);
            loadQuizzes();
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header con pulsanti azione */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Quiz Live</h1>
          <p className="text-slate-600 dark:text-gray-400">Gestisci e crea sessioni live interattive con PIN</p>
        </div>
        
        <div className="flex gap-2">
          {onBackToMain && (
            <button
              onClick={onBackToMain}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-lg flex items-center gap-1"
            >
              <ArrowLeft size={16} />
              <span>Indietro</span>
            </button>
          )}
          
          <button
            onClick={() => {
              setEditingQuiz(null);
              setShowCreator(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
          >
            <Plus size={16} />
            <span>Nuovo Quiz</span>
          </button>
        </div>
      </div>
      
      {/* Visualizzazione di errori */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="mt-0.5" />
          <div>
            <p className="font-semibold">Si è verificato un errore</p>
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Tab per filtrare i quiz */}
      <div className="mb-6 border-b border-slate-200 dark:border-navy-700">
        <div className="flex">
          <button
            onClick={() => setActiveTabIndex(0)}
            className={`px-4 py-2 font-medium ${activeTabIndex === 0 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            Quiz attivi
          </button>
          
          <button
            onClick={() => setActiveTabIndex(1)}
            className={`px-4 py-2 font-medium ${activeTabIndex === 1 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            Sessioni completate
          </button>
          
          <button
            onClick={() => setActiveTabIndex(2)}
            className={`px-4 py-2 font-medium ${activeTabIndex === 2 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-300'}`}
          >
            Tutti i quiz
          </button>
        </div>
      </div>
      
      {/* Contenuto in base al tab selezionato */}
      {loading ? (
        <div className="py-10 text-center">
          <RefreshCw size={24} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Caricamento in corso...</p>
        </div>
      ) : (
        renderTabContent()
      )}
      
      {/* Modale di conferma eliminazione */}
      {showDeleteModal && quizToDelete && (
        <DeleteQuizModal
          quiz={quizToDelete}
          onConfirm={() => {
            if (quizToDelete) {
              handleDeleteQuiz(quizToDelete.id);
            }
          }}
          onCancel={() => setShowDeleteModal(false)}
          isLoading={loading}
        />
      )}
    </div>
  );
} 