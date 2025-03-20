import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle, XCircle, Trophy, BookOpen, Download } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion } from 'framer-motion';
import { ConnectionStatus } from './ConnectionStatus';
import { AnswerFeedback } from './AnswerFeedback';
import { theme } from '../../config/theme';

// Funzione per verificare se un valore è un UUID v4 valido
function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  image_url?: string;
}

interface QuizData {
  title: string;
  description: string;
  questions: QuizQuestion[];
  duration_minutes: number;
  started_at: string;
}

export function QuizPlay() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(location.state?.session || null);
  const isPreview = location.state?.preview || false;
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ answer: number; timeMs: number; isCorrect: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [answerStatus, setAnswerStatus] = useState<'submitting' | 'success' | 'error' | null>(null);
  const [channel, setChannel] = useState<any>(null);

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
    clear: () => {
      try {
        ['quizPin', 'sessionId', 'quizId', 'nickname', 'sessionToken'].forEach(key => {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        });
      } catch (e) {
        console.error('Storage error:', e);
      }
    }
  };

  const initializeQuiz = (currentSession = session) => {
    if (!currentSession?.quiz_data?.questions) {
      return;
    }
    
    setCurrentQuestion(currentSession.current_question_index || 0);
    setQuestionStartTime(new Date());
    setIsInitializing(false);
    
    // Calculate remaining time based on start time
    if (currentSession.quiz_data.started_at) {
      const startTime = new Date(currentSession.quiz_data.started_at);
      const elapsedSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      const totalSeconds = currentSession.quiz_data.duration_minutes * 60;
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setRemainingTime(remaining);
      setStartTime(new Date(Date.now() - (elapsedSeconds * 1000)));
    } else {
      setRemainingTime(currentSession.quiz_data.duration_minutes * 60);
      setStartTime(new Date());
    }
  };

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Verifica che l'ID sia un UUID valido
      if (!id || !isValidUUID(id)) {
        console.error("ID sessione non valido, non è un UUID:", id);
        setError('ID sessione non valido. Si prega di utilizzare una sessione con un ID valido.');
        setLoading(false);
        return;
      }

      const { data: sessionData, error: sessionError } = await supabase
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

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error('Sessione non trovata');

      // If session exists but no quiz data, fetch it first
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
      initializeQuiz(sessionData);
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Errore durante il caricamento della sessione');
      navigate('/quiz-live/join', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      navigate(isPreview ? '/quiz-live' : '/quiz-live/join', { replace: true });
      return;
    }

    // Initialize session data from various sources
    const state = location.state || {};
    const sessionData = {
      nickname: state.nickname || storage.getItem('nickname'),
      quizId: state.quizId || storage.getItem('quizId'),
      sessionId: state.sessionId || storage.getItem('sessionId'),
      quizPin: storage.getItem('quizPin'),
      sessionToken: storage.getItem('sessionToken')
    };
    const sessionToken = storage.getItem('sessionToken');
    
    console.log('QuizPlay mounted with:', sessionData);
    
    // Validate required data
    if (!id || !sessionData.quizPin || !sessionToken || 
        (!sessionData.nickname && !localStorage.getItem('isProfessor'))) {
      console.log('Missing required data, redirecting to join');
      navigate('/quiz-live/join', { replace: true });
      return;
    }

    if (isPreview && location.state?.session) {
      setSession(location.state.session);
      initializeQuiz(location.state.session);
    } else if (!session) {
      loadSession();
    } else {
      initializeQuiz();
    }

    const unsubscribe = !isPreview && setupRealtimeSubscription();
    return () => {
      if (unsubscribe) unsubscribe();
    }
  }, [id, isPreview, location.state]);

  useEffect(() => {
    if (session?.quiz_data && !startTime) {
      setStartTime(new Date());
      setIsInitializing(false);
      setQuestionStartTime(new Date());
      const totalSeconds = session.quiz_data.duration_minutes * 60;
      setRemainingTime(totalSeconds);
    }
  }, [session?.quiz_data]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (startTime && remainingTime !== null && remainingTime > 0 && !showResults) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [startTime, remainingTime, showResults]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`quiz_play_${id}`)
      .on('subscription', (status) => {
        setIsConnected(status === 'SUBSCRIBED');
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_quiz_sessions',
          filter: `id=eq.${id}`
        },
        (payload) => {
          const updatedSession = payload.new;
          setSession(prev => ({
            ...prev,
            ...updatedSession
          }));

          if (updatedSession.status === 'completed') {
            handleQuizEnd();
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleReconnect = async () => {
    try {
      setLoading(true);
      await loadSession();
      const newChannel = setupRealtimeSubscription();
      setChannel(newChannel);
      setIsConnected(true);
    } catch (error) {
      console.error('Error reconnecting:', error);
      setError('Errore durante la riconnessione');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!session?.quiz_data || !questionStartTime) return;

    // Prevent multiple answers for the same question
    if (selectedAnswer !== null) return;

    const questionTime = Math.floor((new Date().getTime() - questionStartTime.getTime()));
    const questionData = session.quiz_data.questions[currentQuestion];
    const isCorrect = answerIndex === questionData.correct_answer;
    const newAnswer = {
      answer: answerIndex,
      timeMs: questionTime,
      isCorrect
    };
    setAnswers(prev => [...prev, newAnswer]);

    const newQuestionTimes = [...questionTimes];
    newQuestionTimes[currentQuestion] = questionTime;
    setQuestionTimes(newQuestionTimes);

    setSelectedAnswer(answerIndex);

    // Immediately proceed to next question
    nextQuestion();

    // Only update database if not in preview mode
    if (!isPreview) {
      try {
        setAnswerStatus('submitting');
        // Try to get nickname from state first, then sessionStorage, then localStorage
        const state = location.state || {};
        const storage = window.sessionStorage.getItem('nickname') ? window.sessionStorage : window.localStorage;
        const nickname = state.nickname || storage.getItem('nickname');
        
        if (!nickname) {
          console.error('No nickname found in localStorage');
          setAnswerStatus('error');
          return;
        }

        const updatedAnswers = [...answers, newAnswer];
        const score = Math.round((updatedAnswers.filter(a => a.isCorrect).length / 
          session.quiz_data.questions.length) * 100);

        const { error: updateError } = await supabase
          .from('live_quiz_participants')
          .update({
            answers: updatedAnswers,
            score: score
          })
          .eq('session_id', id)
          .eq('nickname', nickname);

        if (updateError) throw updateError;
        setAnswerStatus('success');
      } catch (error) {
        console.error('Error updating answers:', error);
        setAnswerStatus('error');
      }
    }
  };

  const handleTimeUp = () => {
    if (selectedAnswer === null) {
      handleAnswer(-1); // -1 indicates no answer
    }
  };

  const handleQuizEnd = async () => {
    if (showResults) return; // Prevent multiple executions
    
    try {
      const state = location.state || {};
      const participantNickname = state.nickname || storage.getItem('nickname');
      
      // Calculate final score
      const score = Math.round((answers.filter(a => a.isCorrect).length / session.quiz_data.questions.length) * 100);

      // Update participant score
      const { error: updateError } = await supabase
        .from('live_quiz_participants')
        .update({
          score: score,
          answers: answers.map((answer, index) => ({
            questionIndex: index,
            answer: selectedAnswer,
            isCorrect: answer,
            timeMs: questionTimes[index] * 1000
          }))
        })
        .eq('session_id', id)
        .eq('nickname', participantNickname);

      if (updateError) throw updateError;

      // Navigate to leaderboard
      navigate(`/quiz-live/leaderboard/${id}`, {
        replace: true,
        preventScrollReset: true,
        state: { 
          session: session,
          nickname: participantNickname,
          sessionId: id,
          score: score,
          answers: answers
        }
      });

      // Clear quiz-specific storage but keep important data
      const isProfessor = localStorage.getItem('isProfessor');
      const savedNickname = storage.getItem('nickname');
      storage.clear();
      
      // Restore important tokens
      if (isProfessor) {
        localStorage.setItem('isProfessor', isProfessor);
      }
      if (savedNickname) {
        localStorage.setItem('nickname', savedNickname);
        sessionStorage.setItem('nickname', savedNickname);
      }
    } catch (error) {
      console.error('Error ending quiz:', error);
      setError('Errore durante il completamento del quiz');
    }
  };

  const nextQuestion = () => {
    if (!session?.quiz_data) return;

    setShowFeedback(false);
    setSelectedAnswer(null);
    
    if (currentQuestion < session.quiz_data.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionStartTime(new Date());
    } else {
      setShowResults(true); // Set showResults before handling quiz end
      handleQuizEnd();
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-xl font-bold mb-2">Inizializzazione Quiz</h2>
          <p className="text-gray-600">Preparazione domande in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="flex flex-col items-center gap-4">
            <img
              src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img/logo.svg"
              alt="OceanMed Logo"
              className="h-16 w-auto mb-4"
            />
            <p className="text-lg text-gray-800">{error}</p>
            <p className="text-sm text-gray-600">L'istruttore condividerà i risultati a breve</p>
          </div>
          <button
            onClick={() => navigate('/quiz-live/join')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mt-6"
          >
            Torna alla Home
          </button>
        </div>
      </div>
    );
  }

  if (!session?.quiz_data?.questions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <p>Quiz non trovato o nessuna domanda disponibile</p>
          </div>
          <button
            onClick={() => navigate(isPreview ? '/quiz-live' : '/quiz-live/join')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  const currentQuestionData = session.quiz_data.questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto px-4 relative z-10">
      <ConnectionStatus 
        isConnected={isConnected} 
        onReconnect={handleReconnect} 
      />
      
      <AnswerFeedback 
        status={answerStatus}
      />

      {/* Timer and Progress Bar */}
      <div className={`${theme.colors.background.glass.light} dark:${theme.colors.background.glass.dark} ${theme.blur.glass} border ${theme.colors.border.primary.light} dark:${theme.colors.border.primary.dark} rounded-xl shadow-lg p-4 mb-4 sticky top-4 z-10`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${theme.colors.text.primary.light} dark:${theme.colors.text.primary.dark}`} />
            <span className={`font-medium ${theme.colors.text.primary.light} dark:${theme.colors.text.primary.dark}`}>
              Tempo rimanente: {formatTime(remainingTime || 0)}
            </span>
          </div>
          <span className={`${theme.colors.text.secondary.light} dark:${theme.colors.text.secondary.dark}`}>
            Domanda {currentQuestion + 1} di {session.quiz_data.questions.length}
          </span>
        </div>
        <div className={`w-full ${theme.colors.quiz.timer.progress.background.light} dark:${theme.colors.quiz.timer.progress.background.dark} rounded-full h-2`}>
          <div
            className={`${theme.colors.quiz.timer.progress.fill.light} dark:${theme.colors.quiz.timer.progress.fill.dark} h-2 rounded-full transition-all duration-500`}
            style={{
              width: `${((currentQuestion + 1) / session.quiz_data.questions.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className={`${theme.colors.quiz.question.background.light} dark:${theme.colors.quiz.question.background.dark} ${theme.blur.glass} border ${theme.colors.border.primary.light} dark:${theme.colors.border.primary.dark} rounded-xl shadow-lg p-8`}>
        <div className="mb-6">
          <h2 className={`text-xl font-bold mb-2 ${theme.colors.text.primary.light} dark:${theme.colors.text.primary.dark}`}>{session.quiz_data.title}</h2>
          <p className={`${theme.colors.text.secondary.light} dark:${theme.colors.text.secondary.dark}`}>{session.quiz_data.description}</p>
        </div>

        <div className="mb-6">
          <h3 className={`text-lg font-medium mb-4 ${theme.colors.text.primary.light} dark:${theme.colors.text.primary.dark}`}>
            {currentQuestionData.question_text}
          </h3>
          
          {currentQuestionData.image_url && (
            <img
              src={currentQuestionData.image_url}
              alt="Question illustration"
              className="mb-4 rounded-lg max-w-full h-auto"
            />
          )}

          <div className="space-y-3">
            {currentQuestionData.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index); // A, B, C, D
              const isSelected = selectedAnswer === index;
              const isCorrect = isSelected && index === currentQuestionData.correct_answer;
              const isWrong = isSelected && index !== currentQuestionData.correct_answer;
              
              return (
                <button
                  key={index}
                  onClick={() => !showFeedback && handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-lg border text-left transition-colors flex items-center gap-4 ${
                    isSelected 
                      ? isCorrect 
                        ? 'bg-green-100/20 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                        : 'bg-red-100/20 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                      : selectedAnswer === null
                        ? 'border-white/30 dark:border-slate-700/30 hover:bg-white/10 dark:hover:bg-slate-700/20'
                        : 'border-white/30 dark:border-slate-700/30'
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full border border-current flex items-center justify-center shrink-0 ${
                    isSelected
                      ? isCorrect
                        ? 'text-green-500 dark:text-green-400'
                        : 'text-red-500 dark:text-red-400'
                      : 'text-gray-200 dark:text-slate-400'
                  }`}>
                    {letter}
                  </span>
                  <span className="text-white dark:text-slate-100">{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showFeedback && currentQuestionData.explanation && (
          <div className="mt-4 p-4 bg-blue-100/20 dark:bg-blue-900/20 border border-blue-200/30 dark:border-blue-700/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-400 dark:text-blue-300" />
              <span className="font-medium text-blue-100 dark:text-blue-200">Spiegazione</span>
            </div>
            <p className="text-blue-100 dark:text-blue-200">{currentQuestionData.explanation}</p>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/quiz-live/join')}
            className="text-gray-200 dark:text-slate-300 hover:text-white dark:hover:text-slate-100 flex items-center gap-2"
          >
            Esci dal quiz
          </button>
          
          {showFeedback && (
            <button
              onClick={nextQuestion}
              className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              {currentQuestion < session.quiz_data.questions.length - 1
                ? 'Prossima Domanda'
                : 'Termina Quiz'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}