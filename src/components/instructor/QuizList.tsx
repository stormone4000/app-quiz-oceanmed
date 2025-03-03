import React from 'react';
import { Book, GraduationCap, Edit, Trash2, Users, Compass, Shield, CloudSun, Wrench, Anchor, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { COLORS } from './QuizCreator';

const ICONS: { [key: string]: any } = {
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
  quiz_type: 'exam' | 'learning';
  category: string;
  question_count: number;
  duration_minutes: number;
  icon: string;
  icon_color: string;
  quiz_code?: string;
  visibility?: string;
  created_by?: string;
}

interface QuizListProps {
  quizzes: Quiz[];
  quizType: 'exam' | 'learning';
  onEdit: (quiz: Quiz) => void;
  onDelete: (quiz: Quiz) => void;
  onAssign: (quiz: Quiz) => void;
  onVisibilityChange: (quizId: string, isPublic: boolean) => void;
  onRegenerateCode: (quizId: string) => void;
  isMaster: boolean;
}

export function QuizList({ quizzes, quizType, onEdit, onDelete, onAssign, onVisibilityChange, onRegenerateCode, isMaster }: QuizListProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {quizzes.map((quiz) => {
        const IconComponent = ICONS[quiz.icon || 'compass'];
        const color = COLORS[quiz.icon_color as keyof typeof COLORS] || COLORS.blue;
        
        return (
          <motion.div
            key={quiz.id}
            className="group relative rounded-xl bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 shadow-lg p-6 hover:scale-[1.02] transition-all"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex flex-col gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className={`p-3 ${color.bg} dark:${color.bg.replace('bg-', 'bg-')}/30 rounded-lg shadow-inner dark:shadow-none flex-shrink-0`}>
                  <IconComponent className={`w-6 h-6 ${color.text} dark:text-opacity-90`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white dark:text-slate-100 truncate">{quiz.title}</h3>
                  <p className="text-gray-200 dark:text-slate-300 mt-1 line-clamp-2">{quiz.description}</p>
                  {isMaster && quiz.created_by && (
                    <p className="text-sm text-gray-300 dark:text-slate-400 mt-1">
                      Creato da: {quiz.created_by}
                    </p>
                  )}
                  {isMaster && quiz.created_by && (
                    <p className="text-sm text-gray-300 dark:text-slate-400 mt-1">
                      Creato da: {quiz.created_by}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-300 dark:text-slate-400">
                    <span>{quiz.question_count} domande</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{quiz.duration_minutes} minuti</span>
                    {quiz.category && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span>{quiz.category}</span>
                      </>
                    )}
                    {quiz.quiz_code && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="font-mono bg-blue-900/30 px-2 py-0.5 rounded">
                          Codice: {quiz.quiz_code}
                        </span>
                      </>
                    )}
                    {isMaster && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onVisibilityChange(quiz.id, quiz.visibility !== 'public');
                          }}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            quiz.visibility === 'public'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}
                        >
                          {quiz.visibility === 'public' ? 'Pubblico' : 'Privato'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Mobile Actions */}
              <div className="grid grid-cols-3 gap-2 sm:hidden mt-4">
                <button
                  onClick={() => onAssign(quiz)}
                  className="flex items-center justify-center gap-2 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Users className="w-5 h-5" />
                  <span>Assegna</span>
                </button>
                <button
                  onClick={() => onEdit(quiz)}
                  className="flex items-center justify-center gap-2 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Edit className="w-5 h-5" />
                  <span>Modifica</span>
                </button>
                <button
                  onClick={() => onDelete(quiz)}
                  className="flex items-center justify-center gap-2 p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Elimina</span>
                </button>
              </div>

              {/* Desktop Actions */}
              <div className="hidden sm:flex gap-2 justify-end mt-4">
                <button
                  onClick={() => onAssign(quiz)}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Assegna Quiz"
                >
                  <Users className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onRegenerateCode(quiz.id)}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Rigenera Codice"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onEdit(quiz)}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Modifica Quiz"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(quiz)}
                  className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Elimina Quiz"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}