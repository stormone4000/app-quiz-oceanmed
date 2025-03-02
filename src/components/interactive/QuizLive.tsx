import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Users, Trophy, Clock, AlertCircle, Plus, Square as Stop, RefreshCw, Trash2, Target, Edit, Eye, BarChart, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { LiveQuizSession, LiveQuizParticipant } from '../../types';
import { QuizCreator } from '../instructor/QuizCreator';
import { COLORS } from '../instructor/QuizCreator';
import { DeleteQuizModal } from '../instructor/DeleteQuizModal';
import { QuizLiveResults } from './QuizLiveResults';
import { Bar, Pie } from 'react-chartjs-2';

interface QuizLiveProps {
  hostEmail: string;
}

export function QuizLive({ hostEmail }: QuizLiveProps) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [quizToDelete, setQuizToDelete] = useState<any>(null);
  const [editingQuiz, setEditingQuiz] = useState<any>(null);
  const [sessions, setSessions] = useState<{[key: string]: LiveQuizSession}>({});
  const [isCreating, setIsCreating] = useState(false);
  const [quizStats, setQuizStats] = useState<{[key: string]: {
    totalParticipants: number;
    correctAnswers: number;
    totalAnswers: number;
    averageTime: number;
    answersByQuestion: number[];
  }}>({});
  const [showResultsView, setShowResultsView] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadQuizzes();
    const unsubscribe = setupRealtimeSubscription();
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [hostEmail]);

  useEffect(() => {
    if (quizzes.length > 0) {
      loadSessions();
    }
  }, [quizzes]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsCreating(false);
      
      const { data: quizzesData, error: quizzesError } = await supabase
        .from('interactive_quiz_templates')
        .select(`
          id,
          title,
          description,
          visibility,
          quiz_format,
          quiz_type,
          question_count,
          duration_minutes,
          icon,
          icon_color,
          host_email,
          category,
          created_at
        `)
        .order('created_at', { ascending: false });
      
      if (quizzesError) throw quizzesError;
      setQuizzes(quizzesData || []);
      
      if (quizzesData?.length > 0) {
        await loadSessions();
      }
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setError('Errore durante il caricamento dei quiz');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          participants:live_quiz_participants(*),
          quiz:interactive_quiz_templates(
            title,
            description,
            question_count
          )
        `)
        .eq('host_email', hostEmail)
        .in('status', ['waiting', 'active']);

      if (sessionError) throw sessionError;
      
      const sessionsMap = {};
      const statsMap = {};

      if (sessionData) {
        sessionData.forEach(session => {
          if (session.quiz_id) {
            sessionsMap[session.quiz_id] = session;
            
            const participants = session.participants || [];
            const totalAnswers = participants.reduce((sum, p) => sum + (p.answers?.length || 0), 0);
            const correctAnswers = participants.reduce((sum, p) => 
              sum + (p.answers?.filter(a => a.isCorrect)?.length || 0), 0);
            const totalTime = participants.reduce((sum, p) => 
              sum + (p.answers?.reduce((t, a) => t + a.timeMs, 0) || 0), 0);
            
            const answersByQuestion = Array(session.quiz?.question_count || 0).fill(0);
            participants.forEach(p => {
              p.answers?.forEach((a, i) => {
                if (a.isCorrect) answersByQuestion[i]++;
              });
            });
            
            statsMap[session.quiz_id] = {
              totalParticipants: participants.length,
              correctAnswers,
              totalAnswers,
              averageTime: totalAnswers > 0 ? totalTime / totalAnswers : 0,
              answersByQuestion
            };
          }
        });
      }
      setSessions(sessionsMap);
      setQuizStats(statsMap);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Errore durante il caricamento delle sessioni');
    }
  };

  const generatePin = async () => {
    const { data: pinData, error } = await supabase.rpc('generate_unique_pin');
    if (error) throw error;
    return pinData;
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('live_quiz_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_quiz_participants'
      }, () => loadSessions())
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_quiz_sessions'
      }, () => loadSessions())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const startQuiz = async (quizId: string) => {
    try {
      setIsStarting(true);
      setError(null);
      
      const existingSession = sessions[quizId];
      if (!existingSession) {
        throw new Error('Sessione non trovata');
      }

      const { data: quizData, error: quizError } = await supabase
        .from('interactive_quiz_templates')
        .select('*, questions:quiz_questions(*)')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      if (!quizData.questions?.length) {
        throw new Error('Il quiz non ha domande');
      }

      const quizDataToUpdate = {
        title: quizData.title,
        description: quizData.description,
        questions: quizData.questions,
        duration_minutes: quizData.duration_minutes,
        started_at: new Date().toISOString(),
        quiz_id: quizData.id
      };

      const { error: updateError } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
          current_question_index: 0,
          quiz_data: quizDataToUpdate
        })
        .eq('id', existingSession.id);

      if (updateError) throw updateError;
      await loadSessions();
    } catch (error) {
      console.error('Error starting quiz:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'avvio del quiz');
    } finally {
      setIsStarting(false);
    }
  };

  const createSession = async (quizId: string) => {
    try {
      setLoading(true);
      setError(null);

      const pin = await generatePin();
      const { data: newSession, error: createError } = await supabase
        .from('live_quiz_sessions')
        .insert([{
          quiz_id: quizId,
          host_email: hostEmail,
          pin: pin,
          status: 'waiting',
          current_question_index: 0
        }])
        .select()
        .single();

      if (createError) throw createError;
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

  const stopQuiz = async (quizId: string) => {
    try {
      const session = sessions[quizId];
      if (!session) {
        console.error('Session not found for quiz:', quizId);
        return;
      }

      setIsStopping(true);
      setError(null);

      console.log('Stopping quiz session:', session.id);

      // Save quiz results first
      const { data: resultData, error: resultError } = await supabase
        .from('live_quiz_results')
        .insert([{
          session_id: session.id,
          quiz_id: quizId,
          host_email: hostEmail,
          total_participants: session.participants?.length || 0,
          average_score: session.participants?.reduce((acc, p) => acc + (p.score || 0), 0) / (session.participants?.length || 1),
          completion_rate: session.participants?.reduce((acc, p) => acc + ((p.answers?.length || 0) / session.quiz?.question_count * 100), 0) / (session.participants?.length || 1),
          duration_minutes: Math.ceil((new Date().getTime() - new Date(session.started_at || '').getTime()) / (1000 * 60))
        }])
        .select()
        .single();

      if (resultError) {
        console.error('Error saving quiz results:', resultError);
        throw resultError;
      }

      console.log('Saved quiz results:', resultData);

      // Then update session status
      const { error: updateError } = await supabase
        .from('live_quiz_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error updating session status:', updateError);
        throw updateError;
      }

      console.log('Updated session status to completed');

      await loadSessions();
    } catch (error) {
      console.error('Error stopping quiz:', error);
      setError('Errore durante l\'interruzione del quiz');
    } finally {
      setIsStopping(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // First, complete any active sessions for this quiz
      const { data: activeSessions, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('id')
        .eq('quiz_id', quizId)
        .in('status', ['waiting', 'active']);

      if (sessionError) throw sessionError;

      if (activeSessions && activeSessions.length > 0) {
        const { error: updateError } = await supabase
          .from('live_quiz_sessions')
          .update({
            status: 'completed',
            ended_at: new Date().toISOString()
          })
          .eq('quiz_id', quizId);

        if (updateError) throw updateError;
      }

      // Delete quiz questions
      const { error: questionsError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      if (questionsError) throw questionsError;

      // Finally delete the quiz template
      const { error: deleteError } = await supabase
        .from('interactive_quiz_templates')
        .delete()
        .eq('id', quizId);

      if (deleteError) throw deleteError;

      // Update local state
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      setShowDeleteModal(false);
      setQuizToDelete(null);
      
      // Reload sessions to update UI
      await loadSessions();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setError('Errore durante l\'eliminazione del quiz');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (quizId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: quizData, error: quizError } = await supabase
        .from('interactive_quiz_templates')
        .select('*, questions:quiz_questions(*)')
        .eq('id', quizId)
        .single();

      if (quizError) throw quizError;
      if (!quizData.questions?.length) {
        throw new Error('Il quiz non ha domande');
      }
      
      const previewSession = {
        id: quizId,
        status: 'active',
        quiz_data: {
          title: quizData.title,
          description: quizData.description,
          questions: quizData.questions,
          duration_minutes: quizData.duration_minutes,
          started_at: new Date().toISOString(),
          quiz_id: quizData.id
        }
      };
      
      navigate(`/quiz-live/play/${previewSession.id}`, {
        state: {
          preview: true,
          session: previewSession
        }
      });
    } catch (error) {
      console.error('Error loading quiz preview:', error);
      setError('Errore durante il caricamento dell\'anteprima');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento quiz in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full">
          <div className="flex items-center gap-3 text-red-600 mb-6">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-lg">{error}</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              loadQuizzes();
            }}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Riprova
          </button>
        </div>
      </div>
    );
  }

return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold text-white dark:text-slate-100">Quiz Interattivi</h1>
        {!showResultsView && (
          <button
            onClick={() => setShowResultsView(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 
            transition-colors flex items-center gap-2"
            title="Visualizza statistiche"
          >
            <BarChart className="w-5 h-5" />
            <span className="hidden sm:inline">Statistiche</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {showResultsView ? (
          <button
            onClick={() => setShowResultsView(false)}
            className="bg-gray-600 dark:bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-gray-700 dark:hover:bg-slate-600 
            transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Torna ai Quiz</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setIsCreating(true);
              setShowCreator(true);
            }}
            className="w-full sm:w-auto bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 
            transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 
            shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>Crea Nuovo Quiz</span>
          </button>
        )}
      </div>
    </div>

    {showResultsView ? (
      <QuizLiveResults 
        hostEmail={hostEmail}
      />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {quizzes.map((quiz) => {
          const color = COLORS[quiz.icon_color as keyof typeof COLORS] || COLORS.blue;
          return (
            <motion.div
              key={quiz.id}
              className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 hover:scale-[1.02] transition-all"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02 }}
            >
              {/* Header della card */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`p-3 ${color.bg} dark:${color.bg.replace('bg-', 'bg-')}/30 rounded-lg shadow-inner dark:shadow-none flex-shrink-0`}>
                    <Target className={`w-6 h-6 ${color.text} dark:text-opacity-90`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-white dark:text-slate-100 truncate">{quiz.title}</h3>
                    <p className="text-gray-200 dark:text-slate-300 mt-1 line-clamp-2">{quiz.description}</p>
                  </div>
                </div>

                {/* Azioni della card */}
                <div className="flex flex-wrap items-center gap-2 mt-4 text-white dark:text-slate-400">
                  <div className="flex-1 flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(quiz.id)}
                      className="p-2 hover:bg-white/10 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="Anteprima quiz"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    {sessions[quiz.id]?.status === 'active' && (
                      <button
                        onClick={() => navigate(`/quiz-live/leaderboard/${sessions[quiz.id].id}`)}
                        className="p-2 hover:bg-white/10 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                        title="Visualizza classifica in tempo reale"
                      >
                        <Trophy className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingQuiz(quiz);
                        setShowCreator(true);
                      }}
                      className="p-2 hover:bg-white/10 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="Modifica quiz"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setQuizToDelete(quiz);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 hover:bg-white/10 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                      title="Elimina quiz"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      if (sessions[quiz.id]?.status === 'active') {
                        stopQuiz(quiz.id);
                      } else if (!sessions[quiz.id]) {
                        createSession(quiz.id);
                      } else if (sessions[quiz.id]?.status === 'waiting') {
                        startQuiz(quiz.id);
                      }
                    }}
                    disabled={isStarting || isStopping}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-300 
                    flex items-center gap-2 font-medium shadow-md hover:shadow-lg
                    ${sessions[quiz.id]?.status === 'active'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : sessions[quiz.id]?.status === 'waiting'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${(isStarting || isStopping) ? 'opacity-75 cursor-not-allowed' : ''}`}
                  >
                    {isStarting || isStopping ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="whitespace-nowrap">
                          {isStarting ? 'Avvio...' : 'Stop...'}
                        </span>
                      </>
                    ) : sessions[quiz.id]?.status === 'active' ? (
                      <>
                        <Stop className="w-5 h-5" />
                        <span>Stop</span>
                      </>
                    ) : sessions[quiz.id]?.status === 'waiting' ? (
                      <>
                        <Play className="w-5 h-5" />
                        <span>Avvia</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>Crea</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sezione PIN */}
              {sessions[quiz.id]?.pin && (
                <div className="p-6 border-t border-white/10 dark:border-slate-700/30 bg-white/10 dark:bg-slate-800/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-white dark:text-slate-100">PIN di Gioco</h4>
                    <div className="text-3xl font-bold text-white dark:text-blue-400">
                      {sessions[quiz.id].pin}
                    </div>
                  </div>
                  <p className="text-sm text-gray-200 dark:text-slate-400 mt-2">
                    {sessions[quiz.id].status === 'waiting'
                      ? 'Gli studenti possono unirsi usando questo PIN'
                      : sessions[quiz.id].status === 'active'
                      ? 'Quiz in corso'
                      : 'Sessione terminata'}
                  </p>
                </div>
              )}

              {/* Sezione Partecipanti */}
              {sessions[quiz.id]?.participants?.length > 0 && (
                <div className="p-6 border-t border-white/10 dark:border-slate-700/30">
                  <h4 className="text-lg font-semibold text-white dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <span>Partecipanti ({sessions[quiz.id].participants.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sessions[quiz.id].participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="bg-white/10 dark:bg-slate-700/30 p-3 rounded-lg hover:bg-white/20 dark:hover:bg-slate-600/30 transition-colors"
                      >
                        <p className="font-medium text-white dark:text-slate-100">{participant.nickname}</p>
                        {participant.score !== undefined && (
                          <div className="flex items-center gap-2 mt-1">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <p className="text-sm text-gray-200 dark:text-slate-400">
                              Punteggio: {participant.score}%
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    )}

    {/* Modali invariati */}
    {showCreator && (
      <QuizCreator
        quizType="interactive"
        hostEmail={hostEmail}
        editQuiz={editingQuiz}
        onClose={() => {
          setShowCreator(false);
          setEditingQuiz(null);
          setIsCreating(false);
          loadQuizzes();
        }}
        onSaveSuccess={() => {
          console.log('Quiz interattivo salvato con successo, ricarico la lista');
          loadQuizzes();
        }}
      />
    )}
    
    {showDeleteModal && quizToDelete && (
      <DeleteQuizModal
        quiz={quizToDelete}
        onConfirm={() => handleDeleteQuiz(quizToDelete.id)}
        onCancel={() => {
          setShowDeleteModal(false);
          setQuizToDelete(null);
        }}
        isLoading={loading}
      />
    )}
  </div>
);
}