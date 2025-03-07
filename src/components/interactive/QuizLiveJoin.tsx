import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, AlertCircle, Loader2, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';

interface QuizLiveJoinProps {
  studentEmail?: string;
  onSuccess?: () => void;
}

export function QuizLiveJoin({ studentEmail, onSuccess }: QuizLiveJoinProps) {
  const [pin, setPin] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pin || pin.length !== 6) {
      setError('Inserisci un PIN valido a 6 cifre');
      return;
    }

    if (!nickname) {
      setError('Inserisci un nickname per partecipare');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Verifica se esiste una sessione attiva con questo PIN
      const { data: session, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select('*')
        .eq('pin', pin)
        .in('status', ['waiting', 'active'])
        .single();

      if (sessionError || !session) {
        setError('Sessione non trovata o già terminata. Verifica il PIN.');
        return;
      }

      // Controlla se il nickname è già in uso in questa sessione
      const { data: existingParticipant, error: participantError } = await supabase
        .from('live_quiz_participants')
        .select('id')
        .eq('session_id', session.id)
        .eq('nickname', nickname)
        .maybeSingle();

      if (participantError) {
        throw participantError;
      }

      if (existingParticipant) {
        setError('Questo nickname è già in uso per questa sessione');
        return;
      }

      // Registra il partecipante
      const { data: participant, error: insertError } = await supabase
        .from('live_quiz_participants')
        .insert([{
          session_id: session.id,
          nickname,
          email: studentEmail || null,
          score: 0,
          joined_at: new Date().toISOString()
        }])
        .select('*')
        .single();

      if (insertError) {
        throw insertError;
      }

      // Memorizza le informazioni di sessione localmente
      localStorage.setItem('quiz_live_session_id', session.id);
      localStorage.setItem('quiz_live_participant_id', participant.id);
      localStorage.setItem('quiz_live_nickname', nickname);
      localStorage.setItem('quiz_live_pin', pin);

      // Reindirizza alla sala d'attesa
      if (session.status === 'waiting') {
        navigate(`waiting/${session.id}`);
      } else {
        navigate(`play/${session.id}`);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error joining quiz:', error);
      setError('Si è verificato un errore durante l\'accesso al quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-md w-full mx-auto bg-white dark:bg-slate-900/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
          <Target size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Partecipa al Quiz Live</h2>
        <p className="text-slate-600 dark:text-gray-400">Inserisci il PIN fornito dall'istruttore</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700/50 text-red-800 dark:text-red-400 rounded-lg flex items-start gap-2">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="pin" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            PIN di Accesso
          </label>
          <div className="flex">
            <input
              id="pin"
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500 rounded-lg w-full border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">Inserisci il codice a 6 cifre mostrato dall'istruttore</p>
        </div>

        <div>
          <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">
            Il tuo nickname
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Come vuoi essere chiamato"
            className="py-3 px-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-500 rounded-lg w-full border border-slate-300 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            maxLength={20}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-gray-500">Questo sarà il tuo nome nella classifica</p>
        </div>

        <button
          type="submit"
          disabled={loading || !pin || !nickname}
          className="w-full py-3 px-6 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Connessione in corso...</span>
            </>
          ) : (
            <>
              <Play size={18} />
              <span>Partecipa al Quiz</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
} 