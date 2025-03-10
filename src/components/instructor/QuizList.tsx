import React, { useState } from 'react';
import { Book, GraduationCap, Edit, Trash2, Users, Compass, Shield, CloudSun, Wrench, Anchor, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy, RefreshCw, Eye, EyeOff, Copy, Check, Code } from 'lucide-react';
import { motion } from 'framer-motion';
import { COLORS } from './QuizCreator';
import { toast } from 'react-hot-toast';
import { useModal } from '../../hooks/useModal';

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
  description: string;
  quiz_type: 'exam' | 'learning' | 'interactive';
  category: string;
  question_count: number;
  duration_minutes: number;
  icon: string;
  icon_color: string;
  quiz_code?: string;
  visibility?: string;
  created_by?: string;
  activations_count?: number;
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
}

export function QuizList({ quizzes, onEdit, onDelete, onAssign, onVisibilityChange, onRegenerateCode, onTestQuiz, isMaster, viewMode = 'manage' }: QuizListProps) {
  const [copiedCodes, setCopiedCodes] = useState<{[key: string]: boolean}>({});
  const { showSuccess, showError } = useModal();
  
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

  return (
    <div className="space-y-6">
      {quizzes.map((quiz) => {
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
        
        return (
          <motion.div
            key={quiz.id}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col gap-5 relative z-10 p-5">
              <div className="flex items-start gap-5">
                <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
                  <IconComponent className={`w-8 h-8 ${color.text} dark:text-${color.text.split('-')[1]}-400`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white truncate">{quiz.title}</h3>
                  
                  {/* Aggiungiamo il codice quiz qui, subito sotto il titolo, sempre visibile anche se non c'è un codice */}
                  <div className="mt-2 mb-2">
                    {quiz.quiz_code ? (
                      <span className="flex items-center gap-1 inline-flex font-mono bg-blue-100 dark:bg-blue-900/30 px-3 py-1.5 rounded-md text-blue-700 dark:text-blue-300 text-sm">
                        <Code className="w-4 h-4" />
                        <span>Codice: {quiz.quiz_code}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyCode(quiz.quiz_code || '', quiz.id);
                          }}
                          className="ml-2 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors"
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
                        <Code className="w-4 h-4" />
                        <span>Nessun codice</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRegenerateCode(quiz.id);
                          }}
                          className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                          aria-label="Genera codice quiz"
                          title="Genera codice quiz"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-600 dark:text-gray-200 mt-2 line-clamp-2">{quiz.description}</p>
                  {quiz.created_by && (
                    <p className="text-sm text-slate-500 dark:text-gray-300 mt-2">
                      Creato da: {quiz.created_by}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-500 dark:text-gray-300">
                    <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">{quiz.question_count} domande</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">{quiz.duration_minutes} minuti</span>
                    {quiz.category && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">{quiz.category}</span>
                      </>
                    )}
                    
                    {/* Codice Quiz con pulsante per copiare */}
                    {quiz.quiz_code && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1 font-mono bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded text-blue-700 dark:text-blue-300">
                          <Code className="w-3.5 h-3.5" />
                          <span>{quiz.quiz_code}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(quiz.quiz_code || '', quiz.id);
                            }}
                            className="ml-1 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md transition-colors"
                            aria-label="Copia codice quiz"
                            title="Copia codice quiz"
                          >
                            {copiedCodes[quiz.id] ? (
                              <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </span>
                      </>
                    )}
                    
                    {quiz.activations_count !== undefined && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded text-indigo-700 dark:text-indigo-300">
                          Attivazioni: {quiz.activations_count}
                        </span>
                      </>
                    )}
                    {/* Mostra sempre l'indicatore di visibilità, ma come pulsante solo se l'utente può modificarla */}
                    <span className="hidden sm:inline">•</span>
                    {canChangeVisibility ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onVisibilityChange(quiz.id, quiz.visibility !== 'public');
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 ${
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

              {/* Mobile Actions */}
              <div className="sm:hidden flex flex-wrap justify-end gap-3 mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                {viewMode === 'all' && onTestQuiz && (
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
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
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

              {/* Desktop Actions */}
              <div className="hidden sm:flex gap-3 justify-end mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                {viewMode === 'all' && onTestQuiz && (
                  <button
                    onClick={() => {
                      if (onTestQuiz) onTestQuiz(quiz);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Prova Quiz</span>
                  </button>
                )}
                
                {quiz.quiz_code && (
                  <button
                    onClick={() => onRegenerateCode(quiz.id)}
                    className="text-slate-700 hover:text-slate-900 dark:text-gray-300 dark:hover:text-white border border-slate-300 dark:border-gray-600 hover:border-slate-500 dark:hover:border-gray-400 px-5 py-2 rounded-md flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Rigenera Codice</span>
                  </button>
                )}
                
                {onAssign && (
                  <button
                    onClick={() => {
                      if (onAssign) onAssign(quiz);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-md flex items-center gap-2 transition-colors"
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
                    className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-md flex items-center gap-2 transition-colors"
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
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Elimina</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}