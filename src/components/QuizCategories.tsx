import React, { useState, useEffect } from 'react';
import { Book, Anchor, Compass, CloudSun, Shield, Wrench, ArrowLeft, GraduationCap, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy, ArrowRight, HelpCircle, Clock, CheckCircle, Key, Filter, X, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { COLORS } from './instructor/QuizCreator';
import type { QuizType } from '../types';

interface Category {
  name: string;
  count: number;
  icon: keyof typeof ICONS;
  color: keyof typeof COLORS;
}

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
  'life-buoy': LifeBuoy,
  'users': Users
};

interface QuizCategoryProps {
  type: QuizType;
  onBack: () => void;
  onSelectCategory: (category: string) => void;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  quiz_type: QuizType;
  category: string;
  question_count: number;
  duration_minutes: number;
  icon: string;
  icon_color: string;
  quiz_code?: string;
}

export function QuizCategories({ type, onBack, onSelectCategory }: QuizCategoryProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    console.log("QuizCategories - Tipo di quiz selezionato:", type);
    loadQuizzes();
  }, [type]);

  useEffect(() => {
    if (quizzes.length > 0) {
      // Extract unique categories and count quizzes
      const categoryMap = quizzes.reduce((acc, quiz) => {
        const category = quiz.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = {
            name: category,
            count: 0,
            icon: 'compass',
            color: 'blue'
          };
        }
        acc[category].count++;
        return acc;
      }, {} as Record<string, Category>);

      console.log("QuizCategories - Categorie estratte:", Object.keys(categoryMap));
      setCategories(Object.values(categoryMap));
    } else {
      console.log("QuizCategories - Nessun quiz trovato per estrarre categorie");
    }
  }, [quizzes]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      const quizCode = localStorage.getItem('quizCode');
      
      const userEmail = localStorage.getItem('userEmail');

      // Log per debug
      console.log(`Caricamento quiz di tipo: ${type}, codice: ${quizCode}, email: ${userEmail}`);
      console.log("URL Supabase:", import.meta.env.VITE_SUPABASE_URL);

      // Costruisci la query
      let query = supabase
        .from('quiz_templates')
        .select('*')
        .eq('quiz_type', type)
        .order('created_at', { ascending: false });

      // Aggiungi filtro per visibilità
      if (quizCode) {
        query = query.or(`visibility.eq.public,quiz_code.eq.${quizCode}`);
      } else {
        query = query.eq('visibility', 'public');
      }

      console.log("Query costruita per caricare i quiz");
      
      const { data: quizData, error: quizError } = await query;

      if (quizError) {
        console.error("Errore nella query Supabase:", quizError);
        throw quizError;
      }
      
      // Log per debug
      console.log(`Quiz trovati: ${quizData?.length || 0}`);
      if (quizData && quizData.length > 0) {
        console.log('Primo quiz trovato:', quizData[0]);
      } else {
        console.log('Nessun quiz trovato nel database per il tipo:', type);
      }
      
      setQuizzes(quizData || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setError('Errore durante il caricamento dei quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  const filteredQuizzes = quizzes.filter(quiz => 
    selectedCategories.length === 0 || selectedCategories.includes(quiz.category || 'Uncategorized')
  );

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-white hover:text-blue-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna alla selezione
        </button>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-white hover:text-blue-100 flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Torna alla selezione
      </button>

      <h1 className="text-4xl font-light text-white mb-3">
        {type === 'exam' ? 'Quiz di Esame' : 
         type === 'learning' ? 'Moduli di Apprendimento' : 
         'Quiz Interattivi'}
      </h1>
      <p className="text-blue-100 mb-8">
        {type === 'exam' 
          ? 'Seleziona il tipo di patente per iniziare la simulazione d\'esame'
          : type === 'learning'
            ? 'Scegli un argomento per iniziare ad imparare'
            : 'Seleziona un quiz interattivo creato da altri studenti'
        }
      </p>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-white" />
            <h3 className="text-lg font-medium text-white">Filtra per Categoria</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategoryToggle(category.name)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  selectedCategories.includes(category.name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {category.name}
                <span className="text-sm opacity-75">({category.count})</span>
                {selectedCategories.includes(category.name) && (
                  <X className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-white">
          Caricamento quiz...
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center text-white">
          {selectedCategories.length > 0
            ? 'Nessun quiz disponibile per le categorie selezionate'
            : 'Nessun quiz disponibile al momento'
          }
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredQuizzes.map((quiz) => {
            const IconComponent = ICONS[quiz.icon || 'compass'];
            const color = COLORS[quiz.icon_color as keyof typeof COLORS] || COLORS.blue;
            const quizCode = quiz.quiz_code;
            return (
              <motion.div
                key={quiz.id}
                className="group relative rounded-xl bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 shadow-lg p-6 hover:scale-[1.02] transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 ${color.bg} dark:bg-opacity-30 rounded-lg shadow-md`}>
                    <IconComponent className={`w-8 h-8 ${color.text} dark:text-opacity-90`} />
                  </div>
                  <h2 className="text-2xl font-light text-white dark:text-slate-100">{quiz.title}</h2>
                </div>
                <p className="text-gray-200 dark:text-slate-300">
                  {quiz.description}
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-6 text-sm text-gray-300 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      <span>
                        {quiz.question_count} domande</span>
                    </div>
                    {type === 'exam' ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{quiz.duration_minutes} minuti</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>75% per superare</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Feedback immediato</span>
                      </div>
                    )}
                  </div>
                  {quizCode && (
                    <div className="flex items-center gap-2 mt-2">
                      <Key className="w-4 h-4 text-gray-300" />
                      <span className="text-sm text-gray-300 font-mono">
                        Codice: {quizCode}
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => onSelectCategory(quiz.id)} 
                    className={`w-full ${
                      type === 'exam' 
                        ? 'bg-indigo-600 hover:bg-indigo-700' 
                        : type === 'interactive'
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : color.accent
                    } text-white py-3 px-6 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 text-base font-medium`}
                  >
                    {type === 'exam' 
                      ? 'Inizia Simulazione' 
                      : type === 'interactive'
                        ? 'Inizia Quiz Interattivo'
                        : 'Inizia il Quiz'
                    }
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}