import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Medal, Clock, Target, ArrowLeft, Download, Share2, Home, RefreshCw, AlertCircle, Users } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

export function QuizLeaderboard() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [nickname, setNickname] = useState<string | null>(null);
  const navigate = useNavigate();
  const [participants, setParticipants] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 3;
  
  const storage = React.useMemo(() => ({
    getItem: (key: string) => sessionStorage.getItem(key) || localStorage.getItem(key),
    removeItem: (key: string) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    },
    clear: () => {
      const keysToRemove = ['quizPin', 'sessionId', 'quizId', 'nickname', 'sessionToken'];
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
    }
  }), []);

  const handleGoHome = () => {
    storage.clear();
    navigate('/quiz-live/join');
  };

  const handleExportResults = async () => {
    try {
      setExportLoading(true);
      
      if (!session || !participants.length) {
        throw new Error('Nessun risultato da esportare');
      }

      // Prepare data for export
      const csvData = [
        ['Posizione', 'Nickname', 'Punteggio', 'Tempo Totale (s)', 'Risposte Corrette'],
        ...participants.map((p, index) => [
          index + 1,
          p.nickname,
          `${p.score || 0}%`,
          Math.round(p.answers?.reduce((acc: number, curr: any) => acc + curr.timeMs, 0) / 1000) || 0,
          p.answers?.filter((a: any) => a.isCorrect).length || 0
        ])
      ];

      // Convert to CSV
      const csv = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `quiz-results-${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting results:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'esportazione');
    } finally {
      setExportLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (!session?.quiz?.title) return;
      
      const shareData = {
        title: 'Risultati Quiz',
        text: `Classifica del quiz "${session.quiz.title}"`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copiato negli appunti!');
      }
    } catch (error) {
      console.error('Error sharing results:', error);
    }
  };

  const handleRetry = async () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setError('Troppi tentativi di riconnessione. Ricarica la pagina.');
      return;
    }

    setReconnectAttempts(prev => prev + 1);
    setupRealtimeSubscription();
    await loadLeaderboard();
  };

  useEffect(() => {
    const stateNickname = location.state?.nickname;
    const storedNickname = sessionStorage.getItem('nickname') || localStorage.getItem('nickname');
    const isProfessor = localStorage.getItem('isProfessor') === 'true';
    const userEmail = localStorage.getItem('userEmail');

    if (!stateNickname && !storedNickname && !isProfessor && !userEmail) {
      navigate('/quiz-live/join');
      return;
    }
    
    setNickname(stateNickname || storedNickname || userEmail);
    
    async function initialize() {
      try {
        await loadLeaderboard();
        const unsubscribe = setupRealtimeSubscription();
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing leaderboard:', error);
        setError('Errore durante l\'inizializzazione della classifica');
      }
    }

    const cleanup = initialize();
    return () => cleanup?.then(fn => fn?.());
  }, [id]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        throw new Error('Session ID is required');
      }

      const { data: sessionData, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          quiz:interactive_quiz_templates(
            title,
            description,
            question_count
          ),
          participants:live_quiz_participants(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (sessionError) throw new Error('Errore durante il caricamento della sessione');

      if (!sessionData) {
        throw new Error('Sessione non trovata');
      }
      
      setSession(sessionData);
      setParticipants(
        (sessionData.participants || [])
          .sort((a: any, b: any) => {
            const scoreA = b.score || 0;
            const scoreB = a.score || 0;
            if (scoreA !== scoreB) return scoreA - scoreB;
            // If scores are equal, sort by time
            const timeA = b.answers?.reduce((acc: number, curr: any) => acc + curr.timeMs, 0) || 0;
            const timeB = a.answers?.reduce((acc: number, curr: any) => acc + curr.timeMs, 0) || 0;
            return timeA - timeB;
          })
      );
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setError('Errore durante il caricamento della classifica');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    return supabase
      .channel(`leaderboard_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_quiz_participants',
          filter: `session_id=eq.${id}`
        },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-600';
      default: return 'text-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="text-white">
          Caricamento classifica...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          <div className="space-y-4">
            {reconnectAttempts < MAX_RECONNECT_ATTEMPTS && (
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Riprova
              </button>
            )}
            <button
              onClick={handleGoHome}
              className="w-full border border-blue-600 text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Torna alla Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8 relative">
          <button
            onClick={handleGoHome}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-white hover:text-blue-100 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Home
          </button>
          <img
            src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/public/img/logo.svg"
            alt="OceanMed Logo"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white dark:text-slate-100 mb-2">
            Classifica Quiz
          </h2>
          <p className="text-blue-100 dark:text-slate-300 mb-4">
            {session?.quiz?.title}
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleExportResults}
              disabled={exportLoading || !participants.length}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {exportLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Esporta Risultati
            </button>
            <button
              onClick={handleShare}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Condividi
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center justify-center mb-8">
            <Trophy className="w-12 h-12 text-yellow-500" />
          </div>

          <div className="space-y-4">
            {participants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border border-gray-200' :
                  index === 2 ? 'bg-amber-50 border border-amber-200' :
                  'bg-white border border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                      index === 0 ? 'bg-yellow-100' :
                      index === 1 ? 'bg-gray-100' :
                      index === 2 ? 'bg-amber-100' :
                      'bg-blue-50'
                    }`}>
                      <Medal className={`w-5 h-5 ${getMedalColor(index)}`} />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{participant.nickname}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {participant.score || 0}%
                          {participant.nickname === nickname && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                              Tu
                            </span>
                          )}
                        </span>
                        {participant.answers?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {Math.round(participant.answers.reduce((acc: number, curr: any) => 
                              acc + curr.timeMs, 0) / 1000)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    #{index + 1}
                  </div>
                </div>
              </motion.div>
            ))}

            {participants.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Nessun partecipante al momento
              </div>
            )}
          </div>

          {/* Quiz Summary */}
          {session?.quiz && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Riepilogo Quiz</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Domande</span>
                  </div>
                  <p className="text-lg font-semibold">{session.quiz.question_count}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Partecipanti</span>
                  </div>
                  <p className="text-lg font-semibold">{participants.length}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Media</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {participants.length > 0
                      ? `${(participants.reduce((acc, p) => acc + (p.score || 0), 0) / participants.length).toFixed(1)}%`
                      : '0%'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}