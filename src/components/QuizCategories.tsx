import React, { useState, useEffect } from 'react';
import { Book, Anchor, Compass, CloudSun, Shield, Wrench, ArrowLeft, GraduationCap, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy, ArrowRight, HelpCircle, Clock, CheckCircle, Key, Filter, X, Users, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../services/supabase';
import { COLORS } from './instructor/QuizCreator';
import type { QuizType } from '../types';
import { useNavigate } from 'react-router-dom';

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
  created_by?: string;
}

export function QuizCategories({ type, onBack, onSelectCategory }: QuizCategoryProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [instructors, setInstructors] = useState<{id: string, name: string}[]>([]);
  const navigate = useNavigate();

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

      // Extract unique instructors
      const uniqueInstructors = [...new Set(quizzes.map(quiz => quiz.created_by || 'Sconosciuto'))];
      setInstructors(uniqueInstructors.map(instructor => ({ id: instructor, name: instructor })));

      console.log("QuizCategories - Categorie estratte:", Object.keys(categoryMap));
      console.log("QuizCategories - Istruttori estratti:", uniqueInstructors);
      setCategories(Object.values(categoryMap));
    } else {
      console.log("QuizCategories - Nessun quiz trovato per estrarre categorie");
    }
  }, [quizzes]);

  // Aggiungi questo useEffect per verificare la validità del codice di accesso
  useEffect(() => {
    // Verifica se il codice di accesso è ancora valido all'avvio del componente
    const checkAccessCode = async () => {
      const storedAccessCode = localStorage.getItem('accessCode');
      if (storedAccessCode) {
        console.log('Verifica validità del codice:', storedAccessCode);
        
        const { data, error } = await supabase
          .from('access_codes')
          .select('is_active, expiration_date')
          .eq('code', storedAccessCode)
          .single();
          
        if (error || !data) {
          console.error('Errore nella verifica del codice di accesso:', error);
          // Rimuovi il codice non valido
          localStorage.removeItem('accessCode');
          setError('Il codice di accesso non è più valido');
          return;
        }
        
        if (!data.is_active) {
          console.log('Codice di accesso disattivato');
          localStorage.removeItem('accessCode');
          setError('Il tuo codice di accesso è stato disattivato');
          setQuizzes([]);
          return;
        }
        
        if (data.expiration_date && new Date(data.expiration_date) < new Date()) {
          console.log('Codice di accesso scaduto');
          localStorage.removeItem('accessCode');
          setError('Il tuo codice di accesso è scaduto');
          setQuizzes([]);
          return;
        }
      }
    };
    
    checkAccessCode();
  }, []);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userEmail = localStorage.getItem('userEmail');
      const quizCode = localStorage.getItem('quizCode');
      const accessCode = localStorage.getItem('accessCode');
      
      console.log(`Caricamento quiz di tipo: ${type}, codice quiz: ${quizCode}, codice accesso: ${accessCode}, email: ${userEmail}`);
      
      // Costruisci la query di base
      let query = supabase
        .from('quiz_templates')
        .select('*')
        .eq('quiz_type', type)
        .order('created_at', { ascending: false });

      // NUOVA LOGICA DI VISIBILITÀ
      // 1. Recuperiamo gli istruttori associati allo studente (se esistono)
      let instructorEmails: string[] = [];
      
      if (userEmail) {
        // Ottieni gli istruttori associati allo studente
        const { data: instructorData, error: instructorError } = await supabase
          .from('student_instructor')
          .select('instructor_email')
          .eq('student_email', userEmail);
          
        if (instructorError) {
          console.error('Errore nel recupero degli istruttori associati:', instructorError);
        } else if (instructorData && instructorData.length > 0) {
          instructorEmails = instructorData.map(i => i.instructor_email);
          console.log('Istruttori associati trovati:', instructorEmails);
        }
        
        // Backup: ottieni gli istruttori dai codici di accesso usati
        if (instructorEmails.length === 0) {
          const { data: usageData, error: usageError } = await supabase
            .from('access_code_usage')
            .select('instructor_email')
            .eq('student_email', userEmail)
            .not('instructor_email', 'is', null);
            
          if (usageError) {
            console.error('Errore nel recupero dei codici usati:', usageError);
          } else if (usageData && usageData.length > 0) {
            const emails = usageData.map(u => u.instructor_email).filter(Boolean);
            instructorEmails = [...new Set([...instructorEmails, ...emails])];
            console.log('Istruttori trovati da codici usati:', instructorEmails);
          }
        }
      }
      
      // Costruisci la clausola di ricerca
      // Quiz pubblici dell'admin sono visibili a tutti
      let searchClause = 'created_by.eq.marcosrenatobruno@gmail.com,created_by.eq.system';
      
      // Aggiungi i quiz pubblici degli istruttori associati
      if (instructorEmails.length > 0) {
        instructorEmails.forEach(email => {
          if (email && email !== 'marcosrenatobruno@gmail.com') {
            searchClause += `,created_by.eq.${email}`;
          }
        });
      }
      
      // Filtro aggiuntivo per la visibilità
      searchClause = `(${searchClause}),visibility.eq.public`;
      
      // Se abbiamo un codice quiz specifico, aggiungiamolo alla clausola AND/OR
      if (quizCode) {
        console.log('Filtro con codice quiz:', quizCode);
        
        // Facciamo una ricerca compatibile sia con il formato "QUIZ-XXXX" che "XXXX"
        if (quizCode.startsWith('QUIZ-')) {
          // Se il codice ha già il prefisso, cerchiamo sia con che senza prefisso
          const codeWithoutPrefix = quizCode.replace('QUIZ-', '');
          searchClause = `(${searchClause}),quiz_code.eq.${quizCode},quiz_code.eq.${codeWithoutPrefix}`;
          console.log(`Cerco quiz con codice ${quizCode} o ${codeWithoutPrefix}`);
        } else {
          // Se il codice non ha il prefisso, cerchiamo sia con che senza prefisso
          const codeWithPrefix = `QUIZ-${quizCode}`;
          searchClause = `(${searchClause}),quiz_code.eq.${quizCode},quiz_code.eq.${codeWithPrefix}`;
          console.log(`Cerco quiz con codice ${quizCode} o ${codeWithPrefix}`);
        }
      }
      
      // Applica la clausola OR alla query
      query = query.or(searchClause);
      
      console.log("Query costruita per caricare i quiz:", searchClause);
      
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
        // Se non ci sono quiz pubblici o con il codice specifico, mostra un messaggio
        if (!accessCode) {
          setError('Per visualizzare i quiz privati, inserisci un codice di accesso valido');
        }
      }
      
      // Filtra i quiz "system" - mostra solo quelli creati dall'admin
      const filteredQuizData = quizData?.filter(quiz => 
        quiz.created_by !== 'system'
      ) || [];
      
      // Formatta i nomi degli istruttori per una migliore visualizzazione
      const formattedQuizData = filteredQuizData.map(quiz => {
        // Se l'istruttore è l'admin, mostra "Admin" invece dell'email
        if (quiz.created_by === 'marcosrenatobruno@gmail.com') {
          return { ...quiz, created_by: 'Admin' };
        }
        return quiz;
      });
      
      setQuizzes(formattedQuizData);
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

  const handleInstructorChange = (instructor: string | null) => {
    setSelectedInstructor(instructor);
  };

  const filteredQuizzes = quizzes.filter(quiz => 
    (selectedCategories.length === 0 || selectedCategories.includes(quiz.category || 'Uncategorized')) &&
    (selectedInstructor === null || quiz.created_by === selectedInstructor)
  );

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors mb-4"
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
    <div className="px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Torna alla selezione</span>
      </button>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
        {type === 'exam' ? 'Quiz di Esame' : 
         type === 'learning' ? 'Moduli di Apprendimento' : 
         'Quiz Live'}
      </h1>
      <p className="text-slate-800 dark:text-slate-200 mb-8 font-medium">
        {type === 'exam' 
          ? 'Seleziona il tipo di patente per iniziare la simulazione d\'esame'
          : type === 'learning'
            ? 'Scegli un argomento per iniziare ad imparare'
            : 'Sessioni live gestite da un istruttore con leaderboard in tempo reale'
        }
      </p>

      {/* Info message */}
      {!localStorage.getItem('quizCode') && type === 'interactive' && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded-lg mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-800 dark:text-blue-100 font-medium">
                Stai visualizzando i quiz live pubblici. Gli studenti partecipano in tempo reale usando un codice PIN.
                Per accedere a quiz privati, inserisci un codice nella pagina <strong>Quiz Disponibili</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-800 dark:text-white" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filtra per Categoria</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategoryToggle(category.name)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium ${
                  selectedCategories.includes(category.name)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {category.name}
                <span className="text-sm opacity-90">({category.count})</span>
                {selectedCategories.includes(category.name) && (
                  <X className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructor Filter */}
      {instructors.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-slate-800 dark:text-white" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filtra per Istruttore</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleInstructorChange(null)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium ${
                selectedInstructor === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Tutti gli istruttori
            </button>
            {instructors.map((instructor) => (
              instructor.id !== 'system' && (
                <button
                  key={instructor.id}
                  onClick={() => handleInstructorChange(instructor.id)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium ${
                    selectedInstructor === instructor.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {instructor.name}
                  {selectedInstructor === instructor.id && (
                    <X className="w-4 h-4" />
                  )}
                </button>
              )
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-800 dark:text-white py-8 font-medium">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p>Caricamento quiz...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="text-center text-slate-800 dark:text-white py-8 font-medium">
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
                className="group relative rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-md hover:shadow-lg transition-all"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-5">
                    <div className={`p-3.5 ${color.bg} dark:bg-opacity-60 rounded-xl shadow-sm`}>
                      <IconComponent className={`w-8 h-8 ${color.text} dark:text-opacity-100`} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">{quiz.title}</h2>
                  </div>
                  <p className="text-slate-700 dark:text-slate-200 mb-6 min-h-[60px] font-medium">
                    {quiz.description}
                  </p>
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        <HelpCircle className="w-4 h-4" />
                        <span>{quiz.question_count} domande</span>
                      </div>
                      {type === 'exam' ? (
                        <>
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                            <Clock className="w-4 h-4" />
                            <span>{quiz.duration_minutes} minuti</span>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                            <GraduationCap className="w-4 h-4" />
                            <span>75% per superare</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                          <CheckCircle className="w-4 h-4" />
                          <span>Feedback immediato</span>
                        </div>
                      )}
                    </div>
                    {quiz.created_by && (
                      <div className="flex items-center gap-2 mt-4 text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Creato da: {quiz.created_by}
                        </span>
                      </div>
                    )}
                    {quizCode && (
                      <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-400">
                        <Key className="w-4 h-4" />
                        <span className="text-sm font-medium font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                          Codice: {quizCode}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => onSelectCategory(quiz.id)} 
                      className={`w-full mt-6 ${
                        type === 'exam' 
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800' 
                          : type === 'interactive'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                      } text-white py-3.5 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2`}
                    >
                      {type === 'exam' 
                        ? 'Inizia Simulazione' 
                        : type === 'interactive'
                          ? 'Inizia Quiz Live'
                          : 'Inizia il Quiz'
                      }
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}