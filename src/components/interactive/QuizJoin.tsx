import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Play, AlertCircle, Loader2, ArrowLeft, Wifi, WifiOff, Check, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

// Storage utility
const storage = {
  setItem: (key: string, value: string) => {
    try {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  getItem: (key: string) => {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key);
    } catch (e) {
      console.error('Storage error:', e);
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
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

export function QuizJoin() {
  const [pin, setPin] = useState(() => {
    return storage.getItem('quizPin') || '';
  });
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState<'pin' | 'nickname'>('pin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [isInitialized, setIsInitialized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { pin: urlPin } = useParams();
  const location = useLocation();
  const locationState = location.state as { pin?: string } || {};
  const [isConnected, setIsConnected] = useState(true);
  const [pinValidationStatus, setPinValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [nicknameValidationStatus, setNicknameValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [nicknameRules, setNicknameRules] = useState({
    length: false,
    noSpecialChars: false,
    available: false
  });
  
  const checkExistingSession = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const existingPin = storage.getItem('quizPin');
      const existingSessionId = storage.getItem('sessionId');
      const existingNickname = storage.getItem('nickname');
      const userEmail = localStorage.getItem('userEmail');
      
      if (existingPin && existingSessionId && existingNickname && userEmail) {
        // Add delay to prevent throttling
        await new Promise(resolve => setTimeout(resolve, 100));

        const { data: session, error } = await supabase
          .from('live_quiz_sessions')
          .select('*')
          .eq('pin', existingPin)
          .eq('id', existingSessionId)
          .eq('participant_email', userEmail)
          .single();

        if (error) throw error;

        // Add delay to prevent throttling
        await new Promise(resolve => setTimeout(resolve, 100));

        if (session.status === 'active') {
          navigate(`/quiz-live/play/${session.id}`, {
            replace: true,
            state: { 
              session,
              sessionId: session.id,
              quizId: session.quiz_id,
              quizPin: existingPin,
              nickname: existingNickname,
              isActive: true
            }
          });
        } else if (session.status === 'waiting') {
          navigate(`/quiz-live/waiting/${session.id}`, {
            replace: true,
            state: { 
              session,
              sessionId: session.id,
              quizId: session.quiz_id,
              quizPin: existingPin,
              nickname: existingNickname,
              isWaiting: true
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking session:', error);
      storage.clear();
    } finally {
      setLoading(false);
    }
  }, [loading, navigate]);

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setLoading(true);
        const userEmail = localStorage.getItem('userEmail');
        setUserEmail(userEmail);

        if (urlPin || locationState.pin) {
          setPin(urlPin || locationState.pin);
          setStep('nickname');
        }

        if (userEmail) {
          await checkExistingSession();
        }
      } catch (error) {
        console.error('Error initializing:', error);
        storage.clear();
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeComponent();
    
    // Cleanup function
    return () => {
      if (loading) {
        setLoading(false);
      }
    };
  }, [urlPin, locationState.pin]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
        <div className="text-white">
          Caricamento...
        </div>
      </div>
    );
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPinValidationStatus('validating');
      setLoading(true);
      setError(null);
      
      if (!userEmail) {
        throw new Error('Devi effettuare il login per partecipare al quiz');
      }

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Validate PIN format
      if (!/^\d{6}$/.test(pin)) {
        throw new Error('Il PIN deve essere composto da 6 cifre');
      }

      const trimmedPin = pin.trim();

      // Verify if session exists and get quiz data
      const { data: session, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          quiz:quiz_templates(
            title,
            description,
            questions:quiz_questions(*)
          ),
          participants:live_quiz_participants(*)
        `)
        .eq('pin', trimmedPin)
        .single();

      if (sessionError) {
        throw new Error('PIN non valido');
      }

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (session.status === 'completed') {
        throw new Error('Questa sessione è terminata');
      }
      
      setPinValidationStatus('valid');

      // Generate a temporary auth token
      const sessionToken = btoa(`quiz_${session.id}_${Date.now()}`);
      storage.setItem('sessionToken', sessionToken);
      localStorage.setItem('sessionToken', sessionToken);

      // Store session data consistently
      const storageData = {
        quizPin: trimmedPin,
        sessionId: session.id,
        quizId: session.quiz_id
      };
      
      Object.entries(storageData).forEach(([key, value]) => {
        sessionStorage.setItem(key, value);
        localStorage.setItem(key, value);
      });
      
      // Update session with participant email
      const { error: updateError } = await supabase
        .from('live_quiz_sessions')
        .update({ participant_email: userEmail })
        .eq('id', session.id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw new Error('Error updating session');
      }

      setStep('nickname');
    } catch (error) {
      console.error('Error verifying PIN:', error);
      setPinValidationStatus('invalid');
      setError(error instanceof Error ? error.message : 'PIN non valido');
    } finally {
      setLoading(false);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setNicknameValidationStatus('validating');
      if (loading) return;
      setLoading(true);
      setError(null);
      
      if (!userEmail) {
        throw new Error('Devi effettuare il login per partecipare al quiz');
      }

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));

      const userNickname = nickname.trim();
      const quizPin = pin.trim();

      if (!quizPin || !userNickname) {
        throw new Error('PIN e nickname sono richiesti');
      }
      
      // Validate nickname format
      if (!/^[a-zA-Z0-9\s]{2,20}$/.test(userNickname)) {
        throw new Error('Il nickname può contenere solo lettere, numeri e spazi');
      }

      // Get latest session data
      const { data: session, error: sessionError } = await supabase
        .from('live_quiz_sessions')
        .select(`
          *,
          quiz:quiz_templates(
            title,
            description,
            questions:quiz_questions(*)
          ),
          participants:live_quiz_participants(*)
        `)
        .eq('pin', quizPin)
        .single();

      if (sessionError) throw new Error('Sessione non valida');
      if (session.status === 'completed') throw new Error('Questa sessione è terminata');

      setNicknameValidationStatus('valid');

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify nickname availability
      const existingNicknames = session.participants?.map(p => p.nickname.toLowerCase()) || [];
      if (existingNicknames.includes(userNickname.toLowerCase())) {
        setNicknameValidationStatus('invalid');
        throw new Error('Questo nickname è già in uso');
      }

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Store session data
      storage.setItem('quizId', session.quiz_id);
      storage.setItem('sessionId', session.id);
      storage.setItem('quizPin', quizPin);
      storage.setItem('nickname', userNickname);

      // Register participant
      const { error: participantError } = await supabase
        .from('live_quiz_participants') 
        .upsert([{
          session_id: session.id,
          nickname: userNickname,
          participant_email: userEmail,
          score: 0,
          answers: []
        }])
        .select()
        .single();

      if (participantError) {
        storage.clear();
        throw new Error('Errore durante la registrazione');
      }

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));

      const navigationState = {
        session,
        sessionId: session.id,
        quizId: session.quiz_id,
        quizPin,
        nickname: userNickname,
        timestamp: Date.now()
      };

      if (session.status === 'active') {
        navigate(`/quiz-live/play/${session.id}`, {
          replace: true,
          state: { ...navigationState, isActive: true }
        });
      } else {
        navigate(`/quiz-live/waiting/${session.id}`, {
          replace: true,
          state: { ...navigationState, isWaiting: true }
        });
      }

    } catch (error) {
      console.error('Error joining quiz:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'accesso');
      setNicknameValidationStatus('invalid');
      storage.clear();
    } finally {
      setLoading(false);
    }
  };

  const validateNickname = (value: string) => {
    const rules = {
      length: value.length >= 2 && value.length <= 20,
      noSpecialChars: /^[a-zA-Z0-9\s]*$/.test(value),
      available: true // Will be checked on submit
    };
    setNicknameRules(rules);
    return Object.values(rules).every(rule => rule);
  };

  const handleReconnect = () => {
    // Implement reconnection logic
    setIsConnected(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-950 flex items-center justify-center p-4">
      {/* Connection Status */}
      <div className={`fixed top-4 right-4 p-2 rounded-lg ${
        isConnected ? 'bg-green-50' : 'bg-red-50'
      }`}>
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-700">
            <Wifi className="w-4 h-4" />
            <span className="text-sm">Connesso</span>
          </div>
        ) : (
          <button
            onClick={handleReconnect}
            className="flex items-center gap-2 text-red-700"
          >
            <WifiOff className="w-4 h-4" />
            <span className="text-sm">Riconnetti</span>
          </button>
        )}
      </div>

      {!userEmail ? (
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-4">Accesso Richiesto</h2>
          <p className="text-gray-600 mb-6">
            Devi effettuare il login per partecipare al quiz.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Vai al Login
          </button>
        </div>
      ) : (
      <div className="max-w-md w-full">
        <div className="text-center mb-8 text-white">
          <img
            src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/sign/img/logo.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWcvbG9nby5zdmciLCJpYXQiOjE3MzcwNTE0MTEsImV4cCI6MTc2ODU4NzQxMX0.UB0cavGc9Ha_FTkpHQZONaQ0MEGFglY96yl4GPCGZbM"
            alt="OceanMed Logo"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold mb-2">
            {step === 'pin' ? 'Inserisci PIN' : 'Scegli Nickname'}
          </h2>
          <p className="text-blue-100 text-lg">
            {step === 'pin' 
              ? 'Inserisci il PIN fornito dal tuo istruttore'
              : 'Scegli un nickname per partecipare al quiz'
            }
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}

            {step === 'pin' ? (
              <motion.form 
                key="pin-form"
                onSubmit={handlePinSubmit} 
                className="space-y-6" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PIN di Gioco
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPin(value);
                        setPinValidationStatus(value.length === 6 ? 'validating' : 'idle');
                      }}
                      className={`w-full px-4 py-3 text-2xl tracking-widest font-mono rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                        pinValidationStatus === 'valid' ? 'border-green-300 bg-green-50' :
                        pinValidationStatus === 'invalid' ? 'border-red-300 bg-red-50' :
                        'border-gray-300'
                      }`}
                      placeholder="000000"
                      required
                      pattern="\d{6}"
                      maxLength={6}
                      autoFocus
                      disabled={loading}
                    />
                    <AnimatePresence>
                      {pinValidationStatus === 'validating' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 text-center">
                    Inserisci il codice a 6 cifre fornito dall'istruttore
                  </p>
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
              </motion.form>
            ) : (
              <motion.form 
                key="nickname-form"
                onSubmit={handleNicknameSubmit} 
                className="space-y-6" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep('pin');
                    setError(null);
                  }}
                  className="text-gray-600 hover:text-gray-800 flex items-center gap-2 mb-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Cambia PIN
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nickname
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nickname}
                      onChange={async (e) => {
                        const value = e.target.value.slice(0, 20);
                        setNickname(value);
                        const isValid = validateNickname(value);
                        setNicknameValidationStatus(isValid ? 'valid' : 'invalid');
                      }}
                      className={`w-full px-4 py-3 text-lg rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                        nicknameValidationStatus === 'valid' ? 'border-green-300 bg-green-50' :
                        nicknameValidationStatus === 'invalid' ? 'border-red-300 bg-red-50' :
                        'border-gray-300'
                      }`}
                      placeholder="Scegli un nickname"
                      required
                      maxLength={20}
                      pattern=".{2,20}"
                      title="Il nickname deve essere tra 2 e 20 caratteri"
                      autoFocus
                      disabled={loading}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      {20 - nickname.length} caratteri rimanenti
                    </p>
                  </div>
                  
                  {/* Nickname Rules */}
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Requisiti Nickname:</p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        {nicknameRules.length ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        <span className={nicknameRules.length ? 'text-green-600' : 'text-gray-600'}>
                          Tra 2 e 20 caratteri
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {nicknameRules.noSpecialChars ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-red-500" />
                        )}
                        <span className={nicknameRules.noSpecialChars ? 'text-green-600' : 'text-gray-600'}>
                          Solo lettere, numeri e spazi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !nickname.trim()}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Accesso in corso...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Inizia Subito
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </div>
  );
}