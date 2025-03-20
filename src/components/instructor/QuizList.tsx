import React, { useState, useEffect } from 'react';
import { Book, GraduationCap, Edit, Trash2, Users, Compass, Shield, CloudSun, Wrench, Anchor, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy, RefreshCw, Eye, EyeOff, Copy, Check, Code, ChevronDown, ChevronUp, Mail, HelpCircle, FileQuestion, CalendarClock, CalendarCheck, Clock, Tag, Activity, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { COLORS } from './QuizCreator';
import { toast } from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';
import { supabase } from '../../services/supabase';

const ICONS: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = {
  'compass': Compass,
  'shield': Shield,
  'cloud-sun': CloudSun,
  'book': Book,
  'graduation-cap': GraduationCap,
  'wrench': Wrench,
  'anchor': Anchor,
  'ship': Ship,
  'navigation': Navigation,
  'map': Map,
  'waves': Waves,
  'wind': Wind,
  'thermometer': Thermometer,
  'life-buoy': LifeBuoy
};

interface Quiz {
  id: string;
  title: string;
  created_by: string;
  description: string;
  visibility: 'public' | 'private';
  question_count: number;
  duration_minutes: number;
  icon: string;
  icon_color: string;
  category?: string;
  quiz_code?: string;
  activations_count?: number;
  questions?: { 
    id: string;
    text: string; 
    type: 'multiple_choice' | 'true_false' | 'short_answer' | string;
    options?: string[]; 
    correct_answer?: number;
  }[];
  created_at: string;
  updated_at: string;
  creator_details?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  last_activation?: {
    user_email: string;
    user_name?: string;
    date: string;
  };
}

interface QuizListProps {
  quizzes: Quiz[];
  onEdit?: (quiz: Quiz) => void;
  onDelete?: (quiz: Quiz) => void;
  onAssign?: (quiz: Quiz) => void;
  onVisibilityChange: (quizId: string, isPublic: boolean) => void;
  onRegenerateCode: (quizId: string) => void;
  onTestQuiz?: (quiz: Quiz) => void;
  isMaster: boolean;
  viewMode?: 'all' | 'manage';
  filterMessage?: string;
}

export const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  onEdit,
  onDelete,
  onAssign,
  onVisibilityChange,
  onRegenerateCode,
  onTestQuiz,
  isMaster,
  viewMode = 'manage',
  filterMessage
}) => {
  const [copiedCodes, setCopiedCodes] = useState<{[key: string]: boolean}>({});
  const [expandedQuizzes, setExpandedQuizzes] = useState<{[key: string]: boolean}>({});
  const [creatorDetails, setCreatorDetails] = useState<{[key: string]: {first_name: string, last_name: string, email: string} | null}>({});
  const [loadingCreators, setLoadingCreators] = useState<{[key: string]: boolean}>({});
  const [activationDetails, setActivationDetails] = useState<{[key: string]: Quiz['last_activation'] | null}>({});
  const [loadingActivations, setLoadingActivations] = useState<{[key: string]: boolean}>({});
  const { showSuccess, showError } = useModal();
  
  // Aggiungo un log per verificare i quiz ricevuti
  useEffect(() => {
    console.log('==================== QUIZLIST COMPONENT ====================');
    console.log('Quiz ricevuti:', quizzes.length);
    console.log('Quiz dettagli:', quizzes.map(q => ({
      id: q.id,
      title: q.title,
      created_by: q.created_by,
      visibility: q.visibility,
      questions: q.questions ? q.questions.length : 0
    })));
    console.log('viewMode:', viewMode);
    console.log('isMaster:', isMaster);
    console.log('==================== FINE QUIZLIST COMPONENT ====================');
    
    // Carica immediatamente i dettagli dei creatori per tutti i quiz
    const loadAllCreatorDetails = async () => {
      // Crea un insieme degli ID dei quiz per i quali non abbiamo ancora caricato i dettagli del creatore
      const quizzesToLoad = quizzes.filter(quiz => 
        quiz.created_by && !creatorDetails[quiz.id]
      );
      
      if (quizzesToLoad.length === 0) return;
      
      console.log(`Caricamento dettagli creatori per ${quizzesToLoad.length} quiz`);
      
      // Aggiorna lo stato di caricamento per tutti i quiz da caricare
      const loadingState: {[key: string]: boolean} = {};
      quizzesToLoad.forEach(quiz => {
        loadingState[quiz.id] = true;
      });
      
      setLoadingCreators(prev => ({
        ...prev,
        ...loadingState
      }));
      
      // Carica i dettagli in parallelo per tutti i quiz
      await Promise.all(
        quizzesToLoad.map(quiz => loadCreatorDetails(quiz.id, quiz.created_by))
      );
    };
    
    // Carica anche i dettagli di attivazione per i quiz con activations_count > 0
    const loadAllActivationDetails = async () => {
      const quizzesWithActivations = quizzes.filter(quiz => 
        quiz.activations_count && quiz.activations_count > 0 && !activationDetails[quiz.id]
      );
      
      if (quizzesWithActivations.length === 0) return;
      
      console.log(`Caricamento dettagli attivazioni per ${quizzesWithActivations.length} quiz`);
      
      // Aggiorna lo stato di caricamento per tutti i quiz da caricare
      const loadingState: {[key: string]: boolean} = {};
      quizzesWithActivations.forEach(quiz => {
        loadingState[quiz.id] = true;
      });
      
      setLoadingActivations(prev => ({
        ...prev,
        ...loadingState
      }));
      
      // Carica i dettagli in parallelo per tutti i quiz
      await Promise.all(
        quizzesWithActivations.map(quiz => loadActivationDetails(quiz.id))
      );
    };
    
    loadAllCreatorDetails();
    loadAllActivationDetails();
  }, [quizzes, viewMode, isMaster]);
  
  const handleCopyCode = (quizCode: string, quizId: string) => {
    navigator.clipboard.writeText(quizCode)
      .then(() => {
        // Imposta lo stato di copia per questo quiz
        setCopiedCodes(prev => ({ ...prev, [quizId]: true }));
        
        // Mostra un toast di conferma
        toast.success('Codice quiz copiato negli appunti!');
        
        // Mostra anche una modale di conferma
        showSuccess('Codice Copiato', 'Il codice quiz è stato copiato negli appunti.');
        
        // Resetta lo stato dopo 2 secondi
        setTimeout(() => {
          setCopiedCodes(prev => ({ ...prev, [quizId]: false }));
        }, 2000);
      })
      .catch(err => {
        console.error('Errore durante la copia del codice:', err);
        toast.error('Impossibile copiare il codice');
        showError('Errore', 'Impossibile copiare il codice negli appunti.');
      });
  };

  const toggleQuizDetails = async (quizId: string) => {
    // Invertiamo lo stato di espansione
    const newExpandedState = !expandedQuizzes[quizId];
    
    setExpandedQuizzes(prev => ({
      ...prev,
      [quizId]: newExpandedState
    }));
    
    // Non è più necessario caricare i dettagli del creatore qui, poiché vengono caricati all'avvio
  };
  
  const loadCreatorDetails = async (quizId: string, creatorEmail: string) => {
    try {
      setLoadingCreators(prev => ({ ...prev, [quizId]: true }));
      
      // Verifichiamo se l'email è un UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creatorEmail);
      
      let query;
      if (isUuid) {
        // Se è un UUID, cerchiamo per ID
        query = supabase
          .from('auth_users')
          .select('first_name, last_name, email')
          .eq('id', creatorEmail)
          .single();
      } else {
        // Altrimenti cerchiamo per email
        query = supabase
          .from('auth_users')
          .select('first_name, last_name, email')
          .eq('email', creatorEmail)
          .single();
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Errore nel caricamento dei dettagli del creatore:', error);
        setCreatorDetails(prev => ({ ...prev, [quizId]: null }));
      } else if (data) {
        setCreatorDetails(prev => ({ 
          ...prev, 
          [quizId]: {
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            email: data.email || creatorEmail
          }
        }));
      }
    } catch (err) {
      console.error('Errore imprevisto nel caricamento dei dettagli del creatore:', err);
    } finally {
      setLoadingCreators(prev => ({ ...prev, [quizId]: false }));
    }
  };

  // Funzione per caricare le informazioni sull'ultimo utente che ha attivato il quiz
  const loadActivationDetails = async (quizId: string) => {
    try {
      setLoadingActivations(prev => ({ ...prev, [quizId]: true }));
      
      // Recupera l'ultimo utente che ha attivato il quiz
      const { data, error } = await supabase
        .from('quiz_assignments')
        .select(`
          created_at,
          assigned_to,
          auth_users!inner(
            first_name,
            last_name,
            email
          )
        `)
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Errore nel caricamento dei dettagli di attivazione:', error);
        setActivationDetails(prev => ({ ...prev, [quizId]: null }));
      } else if (data && data.length > 0) {
        const activation = data[0];
        
        // Correggiamo l'accesso ai dati dell'utente
        const userData = activation.auth_users as unknown as {
          first_name?: string;
          last_name?: string;
          email?: string;
        };
        
        setActivationDetails(prev => ({ 
          ...prev, 
          [quizId]: {
            user_email: userData?.email || activation.assigned_to,
            user_name: userData?.first_name && userData?.last_name ? 
              `${userData.first_name} ${userData.last_name}` : undefined,
            date: activation.created_at
          }
        }));
      } else {
        // Nessuna attivazione trovata
        setActivationDetails(prev => ({ ...prev, [quizId]: null }));
      }
    } catch (err) {
      console.error('Errore imprevisto nel caricamento dei dettagli di attivazione:', err);
    } finally {
      setLoadingActivations(prev => ({ ...prev, [quizId]: false }));
    }
  };

  return (
    <div className="space-y-6 w-full">
      {quizzes.length === 0 ? (
        <div className="text-center py-10">
          <div className="flex flex-col items-center justify-center">
            <FileQuestion className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Nessun quiz trovato</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2">
              {filterMessage || "Nessun quiz corrisponde ai filtri selezionati."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {quizzes.map((quiz) => {
            // Verifica che il quiz abbia tutti i campi necessari
            if (!quiz || !quiz.id) {
              console.error('Quiz non valido:', quiz);
              return null;
            }
            
            console.log('Rendering quiz:', quiz.id, quiz.title);
            
            const IconComponent = ICONS[quiz.icon || 'book'];
            const color = COLORS[quiz.icon_color as keyof typeof COLORS] || COLORS.blue;
            const userEmail = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');
            
            // Verifica se il quiz è stato creato dall'utente corrente, controllando sia email che UUID
            const isCreatedByCurrentUser = quiz.created_by === userEmail || 
                                         (userId && quiz.created_by === userId);
            
            // Determina se l'utente può modificare la visibilità del quiz
            // Gli admin possono modificare tutti i quiz, gli istruttori solo i propri
            const canChangeVisibility = isMaster || isCreatedByCurrentUser;
            
            // Verifica se il quiz è espanso
            const isExpanded = expandedQuizzes[quiz.id] || false;
            
            return (
              <div
                key={quiz.id}
                className={`group relative bg-white dark:bg-slate-800 border rounded-xl shadow-sm overflow-hidden ${
                  isExpanded ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                } transition-all duration-200 max-w-full`}
              >
                {/* Card Overlay */}
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${color.bg} opacity-5 dark:opacity-10 z-0`}
                ></div>
                
                {/* Quiz content */}
                <div className="flex flex-col gap-4 relative z-10 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mb-0">
                      <IconComponent className={`w-8 h-8 ${color.text} dark:text-${color.text.split('-')[1]}-400`} />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate">{quiz.title}</h3>
                      
                      {/* Codice quiz */}
                      <div className="mt-2 mb-2 overflow-x-auto pb-1">
                        {quiz.quiz_code ? (
                          <span className="flex items-center gap-1 inline-flex font-mono bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-md text-blue-700 dark:text-blue-300 text-sm">
                            <Code className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{quiz.quiz_code}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(quiz.quiz_code || '', quiz.id);
                              }}
                              className="ml-2 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors flex-shrink-0"
                              aria-label="Copia codice quiz"
                              title="Copia codice quiz"
                            >
                              {copiedCodes[quiz.id] ? (
                                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 inline-flex font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md text-gray-500 dark:text-gray-400 text-sm">
                            <Code className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">Nessun codice</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRegenerateCode(quiz.id);
                              }}
                              className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex-shrink-0"
                              aria-label="Genera codice quiz"
                              title="Genera codice quiz"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </span>
                        )}
                      </div>
                      
                      <p className="text-slate-600 dark:text-gray-200 mt-2 line-clamp-2 break-words">{quiz.description}</p>
                      
                      {/* Informazioni sul creatore - SEMPRE VISIBILI */}
                      <div className="mt-2 mb-2">
                        <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="font-medium">Creato da:</span> 
                          <span className="text-slate-600 dark:text-slate-300">
                            {loadingCreators[quiz.id] ? (
                              <span className="inline-flex items-center">
                                <span className="animate-pulse">Caricamento...</span>
                              </span>
                            ) : creatorDetails[quiz.id] ? (
                              <span>
                                {(creatorDetails[quiz.id]?.first_name || creatorDetails[quiz.id]?.last_name) ? 
                                  `${creatorDetails[quiz.id]?.first_name || ''} ${creatorDetails[quiz.id]?.last_name || ''} (${creatorDetails[quiz.id]?.email || quiz.created_by})` : 
                                  creatorDetails[quiz.id]?.email || quiz.created_by
                                }
                              </span>
                            ) : (
                              <span>{quiz.created_by}</span>
                            )}
                          </span>
                        </div>
                        
                        {/* Se il quiz è stato attivato da qualcuno (in questo caso attivazioni_count > 0) */}
                        {quiz.activations_count !== undefined && quiz.activations_count > 0 && (
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                              <Activity className="w-3.5 h-3.5" />
                              <span className="font-medium">Attivazioni:</span>
                              <span className="text-slate-600 dark:text-slate-300">{quiz.activations_count} {quiz.activations_count === 1 ? 'volta' : 'volte'}</span>
                            </div>
                            
                            {/* Dettagli dell'ultima attivazione */}
                            {loadingActivations[quiz.id] ? (
                              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-medium">Ultimo utilizzo:</span>
                                <span className="text-slate-600 dark:text-slate-300 animate-pulse">Caricamento...</span>
                              </div>
                            ) : activationDetails[quiz.id] ? (
                              <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                                <Users className="w-3.5 h-3.5" />
                                <span className="font-medium">Ultimo utilizzo:</span>
                                <span className="text-slate-600 dark:text-slate-300">
                                  {activationDetails[quiz.id]?.user_name ? 
                                    `${activationDetails[quiz.id]?.user_name} (${activationDetails[quiz.id]?.user_email})` : 
                                    activationDetails[quiz.id]?.user_email
                                  } - {new Date(activationDetails[quiz.id]?.date || '').toLocaleString('it-IT')}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      
                      {/* Info quiz */}
                      <div className="flex flex-wrap gap-2 mt-3 text-sm text-slate-500 dark:text-gray-300">
                        <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          {quiz.question_count} domande
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {quiz.duration_minutes} minuti
                        </span>
                        {quiz.category && (
                          <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5" />
                            {quiz.category}
                          </span>
                        )}
                        
                        {/* Indicatore visibilità */}
                        {canChangeVisibility ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onVisibilityChange(quiz.id, quiz.visibility !== 'public');
                            }}
                            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                              quiz.visibility === 'public'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}
                            title={quiz.visibility === 'public' ? 'Clicca per rendere privato' : 'Clicca per rendere pubblico'}
                          >
                            {quiz.visibility === 'public' ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Pubblico</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Privato</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                            quiz.visibility === 'public' 
                              ? 'bg-green-100/70 text-green-700 dark:bg-green-900/20 dark:text-green-300/70'
                              : 'bg-gray-100/70 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300/70'
                          }`}>
                            {quiz.visibility === 'public' ? (
                              <>
                                <Eye className="w-3 h-3" />
                                <span>Pubblico</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                <span>Privato</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Toggle Button */}
                  <button
                    onClick={() => toggleQuizDetails(quiz.id)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-2 text-sm font-medium transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Nascondi dettagli</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Mostra dettagli</span>
                      </>
                    )}
                  </button>
                  
                  {/* Action Buttons - Mobile */}
                  <div className="sm:hidden flex flex-col w-full gap-2 mt-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                    {onTestQuiz && (
                      <button
                        onClick={() => {
                          if (onTestQuiz) onTestQuiz(quiz);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Prova</span>
                      </button>
                    )}
                    
                    {onAssign && (
                      <button
                        onClick={() => {
                          if (onAssign) onAssign(quiz);
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>Assegna</span>
                      </button>
                    )}
                    
                    {onEdit && (
                      <button
                        onClick={() => {
                          if (onEdit) onEdit(quiz);
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Modifica</span>
                      </button>
                    )}
                    
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (onDelete) onDelete(quiz);
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Elimina</span>
                      </button>
                    )}
                  </div>
                  
                  {/* Action Buttons - Desktop */}
                  <div className="hidden sm:flex gap-3 justify-end mt-2 border-t border-gray-100 dark:border-slate-700 pt-4">
                    {onTestQuiz && (
                      <button
                        onClick={() => {
                          if (onTestQuiz) onTestQuiz(quiz);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Prova</span>
                      </button>
                    )}
                    
                    {onAssign && (
                      <button
                        onClick={() => {
                          if (onAssign) onAssign(quiz);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        <span>Assegna</span>
                      </button>
                    )}
                    
                    {onEdit && (
                      <button
                        onClick={() => {
                          if (onEdit) onEdit(quiz);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Modifica</span>
                      </button>
                    )}
                    
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (onDelete) onDelete(quiz);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Elimina</span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Expanded quiz content */}
                {isExpanded && (
                  <div className="p-5 pt-0 border-t border-gray-100 dark:border-slate-700 overflow-x-auto">
                    {/* Quiz details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 break-words">
                            <strong>Creato da:</strong> {
                              loadingCreators[quiz.id] ? (
                                <span className="inline-flex items-center">
                                  <span className="animate-pulse mr-2">Caricamento...</span>
                                </span>
                              ) : creatorDetails[quiz.id] ? (
                                <span>
                                  {(creatorDetails[quiz.id]?.first_name || creatorDetails[quiz.id]?.last_name) ? 
                                    `${creatorDetails[quiz.id]?.first_name || ''} ${creatorDetails[quiz.id]?.last_name || ''} (${creatorDetails[quiz.id]?.email || quiz.created_by})` : 
                                    creatorDetails[quiz.id]?.email || quiz.created_by
                                  }
                                </span>
                              ) : (
                                quiz.created_by
                              )
                            }
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CalendarClock className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>Creato:</strong> {new Date(quiz.created_at).toLocaleString('it-IT')}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2">
                          <CalendarCheck className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">
                            <strong>Aggiornato:</strong> {new Date(quiz.updated_at).toLocaleString('it-IT')}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 break-words">
                            <strong>ID:</strong> {quiz.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quiz questions table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-slate-700">
                            <th className="p-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Domanda</th>
                            <th className="p-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                          {(quiz.questions || []).map((question) => (
                            <tr
                              key={question.id}
                              className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors"
                            >
                              <td className="p-3 text-sm text-gray-700 dark:text-gray-300 break-words max-w-[300px] md:max-w-none">
                                {question.text}
                              </td>
                              <td className="p-3 text-sm text-right">
                                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-300">
                                  {question.type === 'multiple_choice'
                                    ? 'Scelta multipla'
                                    : question.type === 'true_false'
                                    ? 'Vero/Falso'
                                    : question.type === 'short_answer'
                                    ? 'Risposta breve'
                                    : question.type}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};