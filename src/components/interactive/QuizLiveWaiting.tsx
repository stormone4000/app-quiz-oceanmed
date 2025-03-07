import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, Loader2, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabase';

export function QuizLiveWaiting() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [nickname, setNickname] = useState<string>('');
  const [isLeaving, setIsLeaving] = useState(false);

  // Effetto per caricare i dati della sessione e impostare le sottoscrizioni
  useEffect(() => {
    // Recupera informazioni dal localStorage
    const storedNickname = localStorage.getItem('quiz_live_nickname');
    const storedSessionId = localStorage.getItem('quiz_live_session_id');
    const storedParticipantId = localStorage.getItem('quiz_live_participant_id');
    
    if (!storedNickname || !storedSessionId || !storedParticipantId) {
      setError('Informazioni di sessione mancanti');
      return;
    }
    
    setNickname(storedNickname);
    
    // Verifica che l'ID sessione corrisponda
    if (storedSessionId !== sessionId) {
      setError('ID sessione non valido');
      return;
    }
    
    loadSessionData();
    
    // Configura le sottoscrizioni realtime
    const unsubscribe = setupRealtimeSubscription();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [sessionId]);

  // Carica i dati della sessione
  const loadSessionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          participants:live_quiz_participants(
            id, 
            nickname, 
            score, 
            joined_at
          )
        `)
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      
      if (!data) {
        throw new Error('Sessione non trovata');
      }
      
      // Se la sessione è già iniziata, reindirizza alla pagina di gioco
      if (data.status === 'active') {
        navigate(`../play/${sessionId}`);
        return;
      }
      
      // Se la sessione è terminata, reindirizza alla home
      if (data.status === 'completed') {
        setError('Questa sessione è terminata');
        return;
      }
      
      setSession(data);
      setParticipants(data.participants || []);
    } catch (error) {
      console.error('Error loading session:', error);
      setError('Errore durante il caricamento della sessione');
    } finally {
      setLoading(false);
    }
  };

  // Configura le sottoscrizioni realtime
  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('quiz-waiting-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_quiz_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setParticipants(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_quiz_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        const updatedSession = payload.new;
        setSession(updatedSession);
        
        // Se la sessione è iniziata, reindirizza alla pagina di gioco
        if (updatedSession.status === 'active') {
          navigate(`../play/${sessionId}`);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Gestisce l'uscita dalla sessione
  const handleLeave = async () => {
    try {
      setIsLeaving(true);
      
      const participantId = localStorage.getItem('quiz_live_participant_id');
      if (!participantId) {
        throw new Error('ID partecipante non trovato');
      }
      
      // Rimuovi il partecipante dalla sessione
      const { error } = await supabase
        .from('live_quiz_participants')
        .delete()
        .eq('id', participantId);
      
      if (error) throw error;
      
      // Cancella le informazioni di sessione
      localStorage.removeItem('quiz_live_session_id');
      localStorage.removeItem('quiz_live_participant_id');
      localStorage.removeItem('quiz_live_nickname');
      localStorage.removeItem('quiz_live_pin');
      
      // Torna alla dashboard
      navigate('../');
    } catch (error) {
      console.error('Error leaving session:', error);
      setError('Errore durante l\'uscita dalla sessione');
    } finally {
      setIsLeaving(false);
    }
  };

  // Mostra il loader durante il caricamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-400">Caricamento della sala d'attesa...</p>
        </div>
      </div>
    );
  }

  // Mostra l'errore se presente
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900 p-4">
        <div className="max-w-md w-full bg-navy-800 p-6 rounded-xl shadow-xl border border-navy-700">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle size={24} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Errore</h2>
              <p className="text-gray-400">{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('../')}
            className="w-full py-3 px-6 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
          >
            Torna alla home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 p-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full bg-navy-800 rounded-xl shadow-xl border border-navy-700 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-navy-700 p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-1">Sala d'attesa</h2>
          <p className="text-gray-400">In attesa che l'istruttore avvii il quiz</p>
          
          <div className="flex items-center justify-center gap-4 mt-4 mb-2">
            <div className="flex items-center gap-2 text-gray-300">
              <Clock size={16} />
              <span className="text-sm">Quiz: {session?.pin}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <Users size={16} />
              <span className="text-sm">{participants.length} partecipanti</span>
            </div>
          </div>
        </div>
        
        {/* Corpo */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-300">Il tuo nickname</h3>
              <span className="text-blue-400 font-medium">{nickname}</span>
            </div>
            <p className="text-sm text-gray-500">Sarai visibile agli altri con questo nome</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-300 mb-3">Partecipanti</h3>
            <div className="bg-navy-700 rounded-lg overflow-hidden p-1">
              <div className="max-h-60 overflow-y-auto p-2">
                {participants.length === 0 ? (
                  <p className="text-center text-gray-500 py-3">Nessun partecipante al momento</p>
                ) : (
                  <AnimatePresence>
                    {participants.map((participant, index) => (
                      <motion.div
                        key={participant.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          participant.nickname === nickname 
                            ? 'bg-blue-900/30 border border-blue-800/50' 
                            : 'hover:bg-navy-600'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                          {participant.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${
                            participant.nickname === nickname ? 'text-blue-400' : 'text-white'
                          }`}>
                            {participant.nickname} {participant.nickname === nickname && '(tu)'}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-navy-700 pt-4 flex justify-between items-center">
            <div>
              <button
                onClick={handleLeave}
                disabled={isLeaving}
                className="flex items-center gap-1 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                {isLeaving ? <RefreshCw size={16} className="animate-spin" /> : <ArrowLeft size={16} />}
                <span>{isLeaving ? 'Uscendo...' : 'Esci'}</span>
              </button>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <RefreshCw size={14} className="animate-spin" />
              <span>In attesa dell'avvio...</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 