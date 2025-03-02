import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Target, Play, Search, History, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizHistory {
  id: string;
  quiz_title: string;
  score: number;
  total_participants: number;
  date: string;
  duration_minutes: number;
}

interface QuizLiveDashboardProps {
  studentEmail: string;
}

export function QuizLiveDashboard({ studentEmail }: QuizLiveDashboardProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadQuizHistory();
  }, [studentEmail]);

  const loadQuizHistory = async () => {
    try {
      const { data: results, error: resultsError } = await supabase
        .from('live_quiz_results')
        .select(`
          id,
          quiz:interactive_quiz_templates(title),
          score,
          total_participants,
          created_at,
          duration_minutes
        `)
        .eq('participant_details->email', studentEmail)
        .order('created_at', { ascending: false });

      if (resultsError) throw resultsError;

      setQuizHistory(results?.map(r => ({
        id: r.id,
        quiz_title: r.quiz?.title || 'Quiz non disponibile',
        score: r.score,
        total_participants: r.total_participants,
        date: r.created_at,
        duration_minutes: r.duration_minutes
      })) || []);
    } catch (error) {
      console.error('Error loading quiz history:', error);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      if (!pin.trim()) {
        throw new Error('Inserisci un PIN');
      }

      // Validate PIN format
      if (!/^\d{6}$/.test(pin)) {
        throw new Error('Il PIN deve essere composto da 6 cifre');
      }

      console.log('Verifying PIN:', pin);

      // Verify if session exists
      const { data: session, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          quiz:interactive_quiz_templates!inner(
            id,
            title,
            description
          ),
          participants:live_quiz_participants(*)
        `)
        .eq('pin', pin)
        .single();

      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error('PIN non valido');
      }

      if (session.status === 'completed') {
        throw new Error('Questa sessione è terminata');
      }

      console.log('Session found:', session);

      // Generate a temporary auth token
      const sessionToken = btoa(`quiz_${session.id}_${Date.now()}`);
      sessionStorage.setItem('sessionToken', sessionToken);
      localStorage.setItem('sessionToken', sessionToken);

      // Store session data
      sessionStorage.setItem('quizPin', pin);
      localStorage.setItem('quizPin', pin);
      
      // Navigate to nickname step in QuizJoin
      navigate('/quiz-live/join', {
        replace: true,
        state: { 
          pin,
          session,
          sessionId: session.id,
          quizId: session.quiz_id,
          isActive: session.status === 'active'
        }
      });

      console.log('Stored session data:', {
        sessionId: session.id,
        quizId: session.quiz_id,
        quizPin: pin,
        sessionStatus: session.status
      });

    } catch (error) {
      console.error('Error verifying PIN:', error);
      setError(error instanceof Error ? error.message : 'PIN non valido');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Quiz Live</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PIN Input Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 rounded-lg">
              <Play className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-slate-100">Partecipa al Quiz</h3>
              <p className="text-gray-600 dark:text-slate-400">Inserisci il PIN fornito dal tuo istruttore</p>
            </div>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-2xl tracking-widest font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-center"
                placeholder="000000"
                pattern="\d{6}"
                maxLength={6}
              />
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-2 p-2 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifica in corso...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Avvia Quiz
                </>
              )}
            </button>
          </form>
        </div>

        {/* Stats Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold dark:text-slate-100">Le tue Statistiche</h3>
              <p className="text-gray-600 dark:text-slate-400">Riepilogo delle tue performance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-slate-400">Quiz Completati</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {quizHistory.length}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-gray-600 dark:text-slate-400">Media Punteggi</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {quizHistory.length > 0
                  ? `${(quizHistory.reduce((acc, curr) => acc + curr.score, 0) / quizHistory.length).toFixed(1)}%`
                  : '0%'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-600 dark:text-slate-400">Tempo Medio</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {quizHistory.length > 0
                  ? `${Math.round(quizHistory.reduce((acc, curr) => acc + curr.duration_minutes, 0) / quizHistory.length)}m`
                  : '0m'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz History */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-bold">Storico Quiz</h3>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cerca quiz..."
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {quizHistory.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Non hai ancora partecipato a nessun quiz live
            </div>
          ) : (
            quizHistory.map((quiz) => (
              <div key={quiz.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-lg mb-1">{quiz.quiz_title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDate(quiz.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {quiz.score}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-4 h-4" />
                        {quiz.total_participants} partecipanti
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/quiz-live/leaderboard/${quiz.id}`)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Vedi Classifica
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}