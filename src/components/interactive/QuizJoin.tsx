import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Play, AlertCircle, Loader2, ArrowLeft, Wifi, WifiOff, Check, X, Info, Key } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../components/theme-provider';

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
  const { theme } = useTheme();
  const [pin, setPin] = useState(() => {
    return storage.getItem('quizPin') || '';
  });
  const [nickname, setNickname] = useState('');
  const [step, setStep] = useState<'pin' | 'nickname'>('pin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
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
          setPin(urlPin || locationState.pin || '');
          setStep('nickname');
          setInfoMessage('Ottimo! PIN inserito. Ora scegli il tuo nickname per partecipare.');
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground transition-colors">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <div className="text-center">Caricamento quiz...</div>
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
      setInfoMessage(null);
      
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
        throw new Error('PIN non valido. Verifica il codice inserito.');
      }

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (session.status === 'completed') {
        throw new Error('Questa sessione è terminata. Contatta l\'istruttore per un nuovo quiz.');
      }
      
      setPinValidationStatus('valid');
      setInfoMessage(`Quiz trovato: "${session.quiz?.title}". Continua con il tuo nickname.`);

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
        throw new Error('Errore durante l\'aggiornamento della sessione');
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
      setInfoMessage(null);
      
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
        throw new Error('Il nickname può contenere solo lettere, numeri e spazi (da 2 a 20 caratteri)');
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

      if (sessionError) throw new Error('Sessione non valida. Riprova o contatta l\'istruttore.');
      if (session.status === 'completed') throw new Error('Questa sessione è terminata. Contatta l\'istruttore per un nuovo quiz.');

      setNicknameValidationStatus('valid');

      // Add delay to prevent throttling
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify nickname availability
      const existingNicknames = session.participants?.map((p: { nickname: string }) => p.nickname.toLowerCase()) || [];
      if (existingNicknames.includes(userNickname.toLowerCase())) {
        setNicknameValidationStatus('invalid');
        throw new Error('Questo nickname è già in uso. Scegline un altro.');
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
        throw new Error('Errore durante la registrazione. Riprova tra qualche istante.');
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
    setInfoMessage('Connessione ristabilita con successo!');
    setTimeout(() => setInfoMessage(null), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background transition-colors">
      {/* Connection Status */}
      <div className={`fixed top-4 right-4 p-2 rounded-lg border transition-colors ${
        isConnected 
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950' 
          : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
      }`}>
        {isConnected ? (
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400" role="status">
            <Wifi className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Connesso</span>
          </div>
        ) : (
          <button
            onClick={handleReconnect}
            className="flex items-center gap-2 text-red-700 dark:text-red-400"
            aria-label="Riconnetti al quiz"
          >
            <WifiOff className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Riconnetti</span>
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md mx-auto">
        {!userEmail ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-lg border border-border p-8 w-full text-center transition-colors">
            <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mx-auto mb-4" aria-hidden="true" />
            <h1 className="text-xl font-bold mb-4">Accesso Richiesto</h1>
            <p className="text-muted-foreground mb-6">
              Per partecipare al quiz è necessario effettuare l'accesso al tuo account.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background"
              aria-label="Vai alla pagina di login"
            >
              Vai al Login
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <img
                src="https://axfqxbthjalzzshdjedm.supabase.co/storage/v1/object/sign/img/logo.svg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJpbWcvbG9nby5zdmciLCJpYXQiOjE3MzcwNTE0MTEsImV4cCI6MTc2ODU4NzQxMX0.UB0cavGc9Ha_FTkpHQZONaQ0MEGFglY96yl4GPCGZbM"
                alt="OceanMed Logo"
                className="h-16 md:h-20 w-auto mx-auto mb-4"
              />
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">
                {step === 'pin' ? 'Partecipa al Quiz' : 'Un ultimo passo!'}
              </h1>
              <p className="text-muted-foreground md:text-lg">
                {step === 'pin' 
                  ? 'Inserisci il PIN a 6 cifre fornito dal tuo istruttore'
                  : 'Scegli un nickname per iniziare il quiz'
                }
              </p>
            </div>

            <div className="bg-card text-card-foreground rounded-xl shadow-lg border border-border p-6 md:p-8 transition-colors">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded-lg flex items-start gap-2"
                    role="alert"
                  >
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{error}</span>
                  </motion.div>
                )}
                
                {infoMessage && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-6 p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 rounded-lg flex items-start gap-2"
                    role="status"
                  >
                    <Info className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span>{infoMessage}</span>
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
                      <label htmlFor="quiz-pin" className="block text-sm font-medium text-foreground mb-1">
                        PIN di Gioco
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Key className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        </div>
                        <input
                          id="quiz-pin"
                          type="text"
                          inputMode="numeric"
                          value={pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setPin(value);
                            setPinValidationStatus(value.length === 6 ? 'validating' : 'idle');
                          }}
                          className={`w-full px-12 py-3 text-2xl tracking-widest font-mono rounded-lg border focus:ring-2 focus:outline-none focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background ${
                            pinValidationStatus === 'valid' ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950' :
                            pinValidationStatus === 'invalid' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' :
                            'border-input bg-background'
                          }`}
                          placeholder="000000"
                          required
                          pattern="\d{6}"
                          maxLength={6}
                          aria-label="PIN a 6 cifre per partecipare al quiz"
                          aria-required="true"
                          aria-invalid={pinValidationStatus === 'invalid'}
                          aria-describedby="pin-desc"
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
                              <Loader2 className="w-5 h-5 text-primary animate-spin" aria-hidden="true" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <p id="pin-desc" className="mt-2 text-sm text-muted-foreground text-center">
                        Il PIN è un codice a 6 cifre fornito dall'istruttore
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || pin.length !== 6}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background"
                      aria-label="Verifica il PIN e continua"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          <span>Verifica in corso...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" aria-hidden="true" />
                          <span>Verifica PIN</span>
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
                        setInfoMessage(null);
                      }}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded-md p-1"
                      aria-label="Torna alla schermata del PIN"
                    >
                      <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                      <span>Cambia PIN</span>
                    </button>

                    <div>
                      <label htmlFor="nickname" className="block text-sm font-medium text-foreground mb-1">
                        Nickname
                      </label>
                      <div className="relative">
                        <input
                          id="nickname"
                          type="text"
                          value={nickname}
                          onChange={async (e) => {
                            const value = e.target.value.slice(0, 20);
                            setNickname(value);
                            const isValid = validateNickname(value);
                            setNicknameValidationStatus(isValid ? 'valid' : value ? 'invalid' : 'idle');
                          }}
                          className={`w-full px-4 py-3 text-lg rounded-lg border focus:ring-2 focus:outline-none focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background ${
                            nicknameValidationStatus === 'valid' ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950' :
                            nicknameValidationStatus === 'invalid' ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950' :
                            'border-input bg-background'
                          }`}
                          placeholder="Il tuo nickname"
                          required
                          maxLength={20}
                          aria-label="Nickname per partecipare al quiz"
                          aria-required="true"
                          aria-invalid={nicknameValidationStatus === 'invalid'}
                          aria-describedby="nickname-counter nickname-rules"
                          autoFocus
                          disabled={loading}
                        />
                        <p id="nickname-counter" className="mt-1 text-sm text-muted-foreground">
                          {20 - nickname.length} caratteri rimanenti
                        </p>
                      </div>
                      
                      {/* Nickname Rules */}
                      <div id="nickname-rules" className="mt-4 space-y-2 p-3 border border-border rounded-lg bg-muted/40">
                        <p className="text-sm font-medium text-foreground">Requisiti per il nickname:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm" role="status">
                            {nicknameRules.length ? (
                              <Check className="w-4 h-4 text-green-500 dark:text-green-400" aria-hidden="true" />
                            ) : (
                              <X className="w-4 h-4 text-red-500 dark:text-red-400" aria-hidden="true" />
                            )}
                            <span className={nicknameRules.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                              Tra 2 e 20 caratteri
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm" role="status">
                            {nicknameRules.noSpecialChars ? (
                              <Check className="w-4 h-4 text-green-500 dark:text-green-400" aria-hidden="true" />
                            ) : (
                              <X className="w-4 h-4 text-red-500 dark:text-red-400" aria-hidden="true" />
                            )}
                            <span className={nicknameRules.noSpecialChars ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                              Solo lettere, numeri e spazi
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !nickname.trim() || !Object.values(nicknameRules).every(rule => rule)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background"
                      aria-label="Inizia il quiz con questo nickname"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                          <span>Accesso in corso...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" aria-hidden="true" />
                          <span>Inizia Quiz</span>
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Help/Instructions Section */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 p-4 border border-border rounded-lg bg-muted/30"
            >
              <h2 className="font-medium mb-2 text-foreground text-sm">Come partecipare al quiz</h2>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>{step === 'pin' ? <strong className="text-primary">Inserisci il PIN</strong> : 'Inserisci il PIN'} fornito dall'istruttore</li>
                <li>{step === 'nickname' ? <strong className="text-primary">Scegli un nickname</strong> : 'Scegli un nickname'} per identificarti nella sessione</li>
                <li>Attendi che l'istruttore avvii il quiz oppure inizia subito se già attivo</li>
                <li>Rispondi alle domande nei tempi indicati per guadagnare punti</li>
              </ol>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}