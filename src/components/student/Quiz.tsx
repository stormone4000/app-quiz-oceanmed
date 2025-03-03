import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, AlertCircle, CheckCircle, XCircle, Trophy, BookOpen, TrendingUp, Star } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { saveQuizResult } from '../../services/api';
import { motion } from 'framer-motion';
import { QuizDetailReport } from './QuizDetailReport';

interface QuizProps {
  quizId: string;
  onBack: () => void;
  studentEmail: string;
}

interface QuizData {
  id: string;
  title: string;
  description: string;
  quiz_type: 'exam' | 'learning';
  category: string;
  question_count: number;
  duration_minutes: number;
  questions: Array<{
    id: string;
    question_text: string;
    options: string[];
    correct_answer: number;
    explanation?: string;
    image_url?: string;
  }>;
}

export function Quiz({ quizId, onBack, studentEmail }: QuizProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Verifica che studentEmail sia definito all'inizio
  useEffect(() => {
    if (!studentEmail) {
      console.error('Student email is missing in Quiz component');
      setError('Email dello studente mancante. Impossibile iniziare il quiz.');
    }
  }, [studentEmail]);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  useEffect(() => {
    if (quiz && !startTime) {
      setStartTime(new Date());
      setQuestionStartTime(new Date());
      setRemainingTime(quiz.duration_minutes * 60);
    }
  }, [quiz]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (startTime && remainingTime !== null && remainingTime > 0 && !showResults) {
      timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            finishQuiz();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [startTime, remainingTime, showResults]);

  const loadQuiz = async () => {
    try {
      setError(null);
      console.log("Caricamento quiz con ID:", quizId);
      
      // Prima verifichiamo se il quiz esiste
      const { data: quizTemplate, error: templateError } = await supabase
        .from('quiz_templates')
        .select('*')
        .eq('id', quizId)
        .single();
        
      if (templateError) {
        console.error("Errore nel caricamento del template del quiz:", templateError);
        throw templateError;
      }
      
      if (!quizTemplate) {
        console.error("Quiz non trovato con ID:", quizId);
        throw new Error('Quiz non trovato');
      }
      
      console.log("Template del quiz trovato:", quizTemplate.title);
      
      // Ora carichiamo le domande associate
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId);
        
      if (questionsError) {
        console.error("Errore nel caricamento delle domande:", questionsError);
        throw questionsError;
      }
      
      console.log("Numero di domande trovate:", questions?.length || 0);
      
      if (!questions?.length) {
        console.error("Nessuna domanda trovata per il quiz:", quizId);
        throw new Error('Nessuna domanda disponibile per questo quiz');
      }
      
      // Combiniamo i dati
      const quizData = {
        ...quizTemplate,
        questions: questions
      };
      
      setQuiz(quizData);
      setStartTime(new Date());
      setQuestionStartTime(new Date());
      setRemainingTime(quizData.duration_minutes * 60);
      setIsInitializing(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      setError('Errore durante il caricamento del quiz');
    }
  };

  const handleAnswer = async (answerIndex: number) => {
    if (!quiz?.questions || !questionStartTime) return;

    // Create a copy of existing answers array
    const newAnswers = [...answers];
    // Add new answer without overwriting existing ones
    newAnswers[currentQuestion] = answerIndex === quiz.questions[currentQuestion].correct_answer;
    setAnswers(newAnswers);

    const questionTime = Math.floor((new Date().getTime() - questionStartTime.getTime()) / 1000);
    const newQuestionTimes = [...questionTimes];
    newQuestionTimes[currentQuestion] = questionTime;
    setQuestionTimes(newQuestionTimes);

    setSelectedAnswer(answerIndex);

    if (quiz.quiz_type === 'learning') {
      setShowFeedback(true);
    } else {
      nextQuestion();
    }
  };

  const nextQuestion = () => {
    if (!quiz) return;

    setShowFeedback(false);
    setSelectedAnswer(null);
    
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setQuestionStartTime(new Date());
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!quiz || !startTime) return;

    try {
      console.log("Iniziando finishQuiz...");
      const endTime = new Date();
      const totalTime = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Calculate score and ensure it's a valid number between 0 and 1
      const correctAnswers = answers.filter(Boolean).length;
      const score = Math.max(0, Math.min(1, correctAnswers / answers.length));
      console.log("Punteggio calcolato:", score, "Risposte corrette:", correctAnswers, "su", answers.length);

      // Verifica che studentEmail sia definito e non vuoto
      if (!studentEmail) {
        console.error('Student email is missing');
        setError('Email dello studente mancante. Impossibile salvare i risultati.');
        return;
      }
      console.log("Email studente verificata:", studentEmail);

      const quizResult = {
        email: studentEmail,
        quizId: quiz.id,
        score: score,
        totalTime: totalTime,
        answers: answers,
        questionTimes: questionTimes,
        date: new Date().toISOString(),
        category: quiz.category || quiz.quiz_type,
        firstName: '',
        lastName: ''
      };
      console.log("Oggetto quizResult creato:", JSON.stringify(quizResult));

      try {
        console.log("Tentativo di salvare il risultato...");
        await saveQuizResult(quizResult);
        console.log("Risultato salvato con successo!");
        setResult(quizResult);
        setShowResults(true);
      } catch (saveError) {
        console.error('Errore specifico durante il salvataggio:', saveError);
        
        // Tentativo di recupero in caso di errore RLS
        try {
          console.log("Tentativo di recupero: salvataggio risultato senza RLS...");
          // Salva solo i dati essenziali in localStorage come backup
          const backupResult = {
            date: new Date().toISOString(),
            score: score,
            totalQuestions: answers.length,
            correctAnswers: correctAnswers,
            quizTitle: quiz.title
          };
          localStorage.setItem('lastQuizResult', JSON.stringify(backupResult));
          console.log("Backup del risultato salvato in localStorage");
          
          // Mostra comunque i risultati all'utente
          setResult(quizResult);
          setShowResults(true);
          setError('I risultati sono visualizzati ma potrebbero non essere stati salvati nel database. Un backup è stato creato localmente.');
        } catch (backupError) {
          console.error('Errore anche nel backup:', backupError);
          setError('Errore durante il salvataggio dei risultati. Per favore riprova o contatta l\'assistenza.');
        }
      }
    } catch (error) {
      console.error('Errore generale in finishQuiz:', error);
      setError('Errore durante la finalizzazione del quiz. Per favore riprova.');
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isInitializing) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-xl font-bold mb-2">Inizializzazione Quiz</h2>
          <p className="text-gray-600">Preparazione domande in corso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
          <button
            onClick={onBack}
            className="mt-4 text-red-600 hover:text-red-700 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  if (!quiz?.questions) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertCircle className="w-6 h-6" />
            <p>Quiz non trovato o nessuna domanda disponibile</p>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Torna indietro
          </button>
        </div>
      </div>
    );
  }

  if (showResults && result) {
    return (
      <QuizDetailReport
        result={result}
        onBack={onBack}
        quizTitle={quiz.title}
      />
    );
  }

  const currentQuestionData = quiz.questions[currentQuestion];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Timer and Progress Bar */}
      <div className="bg-rose-800/10 dark:bg-rose-800/20 backdrop-blur-lg border border-white/30 dark:border-rose-100/30 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            <span className="text-lg font-light text-white dark:text-slate-100">
              Tempo rimanente: {formatTime(remainingTime || 0)}
            </span>
          </div>
          <span className="text-lg font-light text-white dark:text-white">
            Domanda {currentQuestion + 1} di {quiz.questions.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-rose-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%`
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-lime-800/10 dark:bg-lime-800/20 backdrop-blur-lg border border-white/30 dark:border-lime-100/30 rounded-xl shadow-lg p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-white dark:text-white">{quiz.title}</h2>
          <p className="text-gray-300">{quiz.description}</p>
        </div>

        <div className="mb-6">
          <h3 className="text-xl font-light text-white dark:text-white mb-4"> 
            {currentQuestionData.question_text}
          </h3>
          
          {currentQuestionData.image_url && (
            <img
              src={currentQuestionData.image_url}
              alt="Question illustration"
              className="mb-4 rounded-lg max-w-full h-auto"
            />
          )}

          <div className="space-y-3">
            {currentQuestionData.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index); // A, B, C, D
              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-lg border text-lg font-semibold text-white dark:text-white transition-colors flex items-center gap-4 ${
                    selectedAnswer === index
                      ? selectedAnswer === currentQuestionData.correct_answer
                        ? 'bg-emerald-600 border-emerals-200' // domande corrette
                        : 'bg-rose-600 border-rose-200' // domande sbagliate
                      : 'border-gray-200 hover:bg-blue-700' // Hover Domande 
                  }`}
                >
                  <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center shrink-0">
                    {letter}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        </div>

        {showFeedback && (
          <div className={`p-4 rounded-lg mb-6 ${
            selectedAnswer === currentQuestionData.correct_answer
              ? 'bg-green-50'
              : 'bg-red-50'
          }`}>
            <div className="flex items-center gap-2">
              {selectedAnswer === currentQuestionData.correct_answer ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <p className={
                selectedAnswer === currentQuestionData.correct_answer
                  ? 'text-green-700'
                  : 'text-red-700'
              }>
                {selectedAnswer === currentQuestionData.correct_answer
                  ? 'Risposta corretta!'
                  : 'Risposta errata. La risposta corretta era: ' + 
                    currentQuestionData.options[currentQuestionData.correct_answer]
                }
              </p>
            </div>
            {currentQuestionData.explanation && (
              <p className="mt-2 text-sm text-gray-600">
                {currentQuestionData.explanation}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={onBack}
            className="text-blue-300 hover:text-blue-100 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Esci dal quiz
          </button>

          {showFeedback && (
            <button
              onClick={nextQuestion}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {currentQuestion < quiz.questions.length - 1
                ? 'Prossima Domanda'
                : 'Termina Quiz'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}