import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Clock, Users, AlertCircle, ArrowLeft, Wifi, WifiOff, RefreshCw, Shield, Info } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { LiveQuizSession } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEYS = {
  NICKNAME: 'nickname',
  QUIZ_ID: 'quizId',
  SESSION_ID: 'sessionId',
  QUIZ_PIN: 'quizPin'
};

export function QuizWaiting() {
  const [session, setSession] = useState<LiveQuizSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [shouldRefresh, setShouldRefresh] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Storage utility with fallback mechanism
  const storage = {
    getItem: (key: string) => {
      const sessionValue = sessionStorage.getItem(key);
      const localValue = localStorage.getItem(key);
      return sessionValue || localValue;
    },
    setItem: (key: string, value: string) => {
      try {
        sessionStorage.setItem(key, value);
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('Storage error:', e);
      }
    },
    removeItem: (key: string) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    },
    clear: () => {
      sessionStorage.clear();
      localStorage.clear();
    }
  };
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Try to get data from state first, then sessionStorage, then localStorage
    const state = location.state || {};
    const nickname = state.nickname || storage.getItem('nickname');
    const quizPin = storage.getItem('quizPin');
    const sessionToken = storage.getItem('sessionToken');
    
    if (!quizPin || !sessionToken || (!nickname && !localStorage.getItem('isProfessor'))) {
      navigate('/quiz-live/join');
      return;
    }

    const initialize = async () => {
      try {
        await loadSession();
        const unsubscribe = setupRealtimeSubscription();
        setIsInitialized(true);
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing:', error);
        navigate('/quiz-live/join', { replace: true });
      }
    };

    const cleanup = initialize();
    return () => cleanup?.then(fn => fn?.());
  }, []);

  // Handle session status changes
  useEffect(() => {
    if (session?.status === 'active' && isInitialized) {
      handleSessionActive();
    }
  }, [session?.status, isInitialized]);

  const handleSessionActive = async () => {
    try {
      console.log('Handling active session transition...');
      setError(null);

      // Get the latest session data before navigating
      const { data: updatedSession, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          quiz:quiz_templates(
            *,
            questions:quiz_questions(*)
          )
        `)
        .eq('id', id)
        .single();

      if (sessionError || !updatedSession) {
        console.error('Error fetching session:', sessionError);
        throw new Error('Sessione non trovata');
      }

      // Store quiz ID in localStorage
      localStorage.setItem('quizId', updatedSession.quiz_id);

      // If session exists but no quiz data, fetch and prepare it
      if (updatedSession && !updatedSession.quiz_data) {
        if (!updatedSession.quiz?.questions || updatedSession.quiz.questions.length === 0) {
          throw new Error('Il quiz non ha domande');
        }

        updatedSession.quiz_data = {
          title: updatedSession.quiz.title,
          description: updatedSession.quiz.description,
          questions: updatedSession.quiz.questions,
          duration_minutes: updatedSession.quiz.duration_minutes,
          started_at: updatedSession.started_at,
          quiz_id: updatedSession.quiz_id
        };
      }

      // Navigate to quiz play
      await navigate(`/quiz-live/play/${id}`, {
        replace: true,
        state: { 
          session: updatedSession,
          sessionId: updatedSession.id,
          quizId: updatedSession.quiz_id,
          quizPin: storage.getItem('quizPin'),
          nickname: storage.getItem('nickname'),
          isActive: true
        }
      });
    } catch (error) {
      console.error('Error handling active session:', error);
      setError('Errore durante il passaggio al quiz. Ricarica la pagina.');
    }
  };

  const loadSession = async () => {
    try {
      setLoading(true);
      if (retryCount >= MAX_RETRIES) {
        throw new Error('Impossibile connettersi al server. Ricarica la pagina.');
      }

      setLastUpdateTime(new Date());
      setError(null);

      const quizPin = storage.getItem('quizPin');
      if (!quizPin) {
        throw new Error('PIN di gioco non trovato');
        return;
      }

      // Get session by ID
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          quiz:quiz_templates(
            id,
            title,
            description,
            question_count,
            duration_minutes,
            questions:quiz_questions(*)
          ),
          participants:live_quiz_participants(
            id,
            nickname,
            score,
            answers,
            joined_at
          )
        `)
        .eq('pin', quizPin)
        .single();

      if (sessionError || !sessionData) {
        console.error('Session not found:', sessionError);
        navigate('/quiz-live/join', { replace: true });
        return;
      }

      // If session is active but no quiz data, fetch it first
      if (sessionData.status === 'active' && !sessionData.quiz_data) {
        const { data: quiz, error: quizError } = await supabase
          .from('quiz_templates')
          .select(`
            *,
            questions:quiz_questions(*)
          `)
          .eq('id', sessionData.quiz_id)
          .single();

        if (quizError) throw quizError;

        sessionData.quiz_data = {
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions,
          duration_minutes: quiz.duration_minutes,
          started_at: sessionData.started_at,
          quiz_id: quiz.id
        };
      }

      setSession(sessionData);
      
      // If session is already active, redirect to quiz
      if (sessionData.status === 'active') {
        navigate(`/quiz-live/play/${sessionData.id}`, {
          replace: true,
          preventScrollReset: true,
          state: { 
            session: sessionData,
            hasRefreshed: true,
            sessionId: sessionData.id,
            quizId: sessionData.quiz_id,
            quizPin: quizPin,
            nickname: storage.getItem('nickname')
          }
        });
      } else {
        navigate(`/quiz-live/waiting/${sessionData.id}`, {
          replace: true,
          preventScrollReset: true,
          state: { 
            session: sessionData,
            hasRefreshed: true,
            sessionId: sessionData.id,
            quizId: sessionData.quiz_id,
            quizPin: quizPin,
            nickname: storage.getItem('nickname')
          }
        });
      }
    } catch (error) {
      console.error('Error loading session:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il caricamento della sessione');
      setIsConnected(false);
      
      // Implement exponential backoff for retries
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadSession();
        }, delay);
      } else {
        navigate('/quiz-live/join', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`quiz_waiting_${id}`)
      .on('subscription', (status) => {
        setIsConnected(status === 'SUBSCRIBED');
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_quiz_participants',
          filter: `session_id=eq.${id}`
        },
        (payload) => {
          setLastUpdateTime(new Date());
          if (session) {
            setSession(prev => ({
              ...prev,
              participants: [...(prev?.participants || []), payload.new]
            }));
          }
        }
      )
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_quiz_sessions',
        filter: `id=eq.${id}`
      }, async (payload) => {
        const updatedSession = payload.new;
        
        // If session becomes active, handle transition
        if (updatedSession.status === 'active') {
          console.log('Session became active, initiating transition...');
          await handleSessionActive();
        } else {
          // Otherwise just update the session data
          setSession(prev => prev ? {
            ...prev,
            ...updatedSession,
            participants: prev.participants
          } : null);
        }
      });
      
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscription active');
        }
      });

    return () => {
      channel.unsubscribe();
    };
  };

  const handleLeaveQuiz = () => {
    const confirmed = window.confirm('Sei sicuro di voler abbandonare il quiz?');
    if (confirmed) {
      // Remove participant from session
      if (session?.id && storage.getItem('nickname')) {
        supabase
          .from('live_quiz_participants')
          .delete()
          .match({ 
            session_id: session.id, 
            nickname: storage.getItem('nickname') 
          })
          .then(() => {
            storage.clear();
            navigate('/quiz-live/join');
          });
      } else {
        storage.clear();
        navigate('/quiz-live/join');
      }
    }
  };

  const handleReconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (reconnectAttempts >= MAX_RETRIES) {
        throw new Error('Troppi tentativi di riconnessione. Ricarica la pagina.');
      }
      
      setReconnectAttempts(prev => prev + 1);
      await loadSession();
      const newChannel = setupRealtimeSubscription();
      setChannel(newChannel);
      setIsConnected(true);
      setRetryCount(0);
    } catch (error) {
      console.error('Error reconnecting:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la riconnessione');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionStatus = () => {
    if (!lastUpdateTime) return 'connecting';
    const timeSinceLastUpdate = Date.now() - lastUpdateTime.getTime();
    if (timeSinceLastUpdate > 30000) return 'unstable';
    return 'connected';
  };

  const renderConnectionStatus = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 text-green-700">
            <Wifi className="w-4 h-4" />
            <span className="text-sm">Connesso</span>
          </div>
        );
      case 'unstable':
        return (
          <div className="flex items-center gap-2 text-yellow-700">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Connessione instabile</span>
          </div>
        );
      default:
        return (
          <button
            onClick={handleReconnect}
            className="flex items-center gap-2 text-red-700"
          >
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">Riconnetti</span>
          </button>
        );
    }
  };

  const renderInstructions = () => {
    if (!session?.quiz) return null;
    return (
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium text-blue-800">Cosa Aspettarsi</h4>
        </div>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Durata: {session.quiz.duration_minutes} minuti
          </li>
          <li className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {session.quiz.question_count} domande da completare
          </li>
          <li>L'istruttore avvierà il quiz quando tutti i partecipanti saranno pronti</li>
        </ul>
      </div>
    );
  };

  const renderParticipantList = () => {
    if (!session?.participants) return null;
    return (
      <div className="mt-8">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
          <Users className="w-4 h-4" />
          <motion.span
            key={session.participants.length}
            initial={{ scale: 1.2, color: '#3B82F6' }}
            animate={{ scale: 1, color: '#6B7280' }}
            transition={{ duration: 0.3 }}
          >
            {session.participants.length} partecipanti
          </motion.span>
        </div>
        
        <div className="max-h-48 overflow-y-auto space-y-2">
          <AnimatePresence>
            {session.participants
              ?.sort((a: any, b: any) => 
                new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime()
              )
              .map((participant: any) => (
                <motion.div
                  key={participant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-2 bg-gray-50 rounded-lg text-gray-700 flex items-center justify-between"
                >
                  <span>{participant.nickname}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(participant.joined_at).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <img
            src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img/logo.svg"
            alt="OceanMed Logo"
            className="h-16 w-auto mx-auto mb-6"
          />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-xl font-bold mb-2">Preparazione Quiz</h2>
          <p className="text-gray-600">Connessione alla sessione in corso...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <img
            src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img/logo.svg"
            alt="OceanMed Logo"
            className="h-16 w-auto mx-auto mb-6"
          />
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sessione non Trovata</h2>
          <p className="text-gray-600 mb-6">
            {error || 'Impossibile trovare la sessione del quiz'}
          </p>
          <button
            onClick={() => navigate('/quiz-live/join')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
      {/* Connection Status */}
      <div className={`fixed top-4 right-4 p-2 rounded-lg ${
        getConnectionStatus() === 'connected' ? 'bg-green-50' :
        getConnectionStatus() === 'unstable' ? 'bg-yellow-50' :
        'bg-red-50'
      }`}>
        {renderConnectionStatus()}
      </div>

      {/* Leave Quiz Button */}
      <button
        onClick={handleLeaveQuiz}
        className="fixed top-4 left-4 p-2 text-white hover:text-blue-100 flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Esci
      </button>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <img
            src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img/logo.svg"
            alt="OceanMed Logo"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">
            In attesa dell'avvio...
          </h2>
          <p className="text-blue-100">
            {session.quiz?.title}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-8">
            <Clock className="w-12 h-12 text-blue-600 animate-pulse" />
          </div>
          
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold mb-2">
              {session.quiz?.title}
            </h3>
            <p className="text-gray-600 mb-4">
              {session.quiz?.description}
            </p>
            
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-4 bg-blue-50 text-blue-700 rounded-lg"
            >
              In attesa dell'avvio del quiz...
            </motion.div>

            {error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-gray-600">
                  L'istruttore avvierà il quiz a breve
                </p>
                <p className="text-sm text-gray-500">
                  Non chiudere questa finestra
                </p>
              </div>
            )}

            {renderInstructions()}
            {renderParticipantList()}
          </div>
        </div>
      </div>
    </div>
  );
}