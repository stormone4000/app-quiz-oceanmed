import React from 'react';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, AlertTriangle, Trophy, BookOpen, Star } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { QuizResult } from '../../types';

interface QuizDetailReportProps {
  result: QuizResult;
  onBack: () => void;
  quizTitle: string;
}

export function QuizDetailReport({ result, onBack, quizTitle }: QuizDetailReportProps) {
  const [questions, setQuestions] = React.useState<any[]>([]);
  const [previousResults, setPreviousResults] = React.useState<QuizResult[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadQuizData();
  }, [result.quizId]);

  const loadQuizData = async () => {
    try {
      console.log('Loading quiz data with:', { 
        quizId: result.quizId, 
        hasQuestions: result.questions && result.questions.length > 0,
        answers: result.answers ? result.answers.length : 0, 
        resultObject: JSON.stringify(result)
      });
      
      // Se le domande sono già incluse nel risultato, usale direttamente
      if (result.questions && result.questions.length > 0) {
        console.log('Using embedded questions:', result.questions.length);
        console.log('First question sample:', JSON.stringify(result.questions[0]));
        setQuestions(result.questions);
      } else {
        console.log('Attempting to load questions from database for quizId:', result.quizId);
        
        // Verifichiamo che quizId sia definito
        if (!result.quizId) {
          console.error('No quizId available, cannot load questions');
          setLoading(false);
          return;
        }
        
        // Altrimenti, carica le domande dal database
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', result.quizId)
          .order('created_at', { ascending: true });

        if (quizError) {
          console.error('Error loading quiz questions:', quizError);
          throw quizError;
        }
        
        console.log(`Loaded ${quizData?.length || 0} questions from database`);
        if (quizData && quizData.length > 0) {
          console.log('First question sample from database:', JSON.stringify(quizData[0]));
        }
        
        // Se non abbiamo trovato domande con questa query, proviamo un approccio alternativo
        if (!quizData || quizData.length === 0) {
          console.log('No questions found with quiz_id, trying to load quiz template');
          
          // Proviamo a caricare il template del quiz per ottenere le domande
          const { data: quizTemplate, error: templateError } = await supabase
            .from('quizzes')
            .select('*, quiz_questions(*)')
            .eq('id', result.quizId)
            .single();
            
          if (templateError) {
            console.error('Error loading quiz template:', templateError);
          } else if (quizTemplate && quizTemplate.quiz_questions) {
            console.log(`Loaded ${quizTemplate.quiz_questions.length} questions from quiz template`);
            if (quizTemplate.quiz_questions.length > 0) {
              console.log('First question sample from template:', JSON.stringify(quizTemplate.quiz_questions[0]));
            }
            setQuestions(quizTemplate.quiz_questions);
          } else {
            console.error('No questions found in database or template');
          }
        } else {
          setQuestions(quizData);
        }
      }

      // Load previous results for comparison
      const { data: prevResults, error: prevError } = await supabase
        .from('results')
        .select('*')
        .eq('student_email', result.email)
        .eq('category', result.category)
        .order('date', { ascending: false })
        .limit(5);

      if (prevError) throw prevError;
      setPreviousResults(prevResults || []);
    } catch (error) {
      console.error('Error loading quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcolo statistiche base ancora necessarie
  const correctAnswers = result.answers.filter(Boolean).length;
  const totalQuestions = result.answers.length;
  const successRate = correctAnswers / totalQuestions;

  // Calcolo difficoltà
  const getDifficultyLevel = () => {
    if (difficultyScore > 0.8) return 'Avanzato';
    if (difficultyScore > 0.6) return 'Intermedio';
    return 'Base';
  };

  // Queste variabili sono ancora necessarie per il calcolo del livello di difficoltà
  const avgTimePerQuestion = result.totalTime / totalQuestions;
  const difficultyScore = Math.min(
    ((30 - avgTimePerQuestion) / 30) * 0.5 + (1 - successRate) * 0.5,
    1
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Caricamento risultati...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-lime-800/10 dark:bg-lime-800/20 backdrop-blur-lg border border-white/30 dark:border-lime-100/30 rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-light text-white dark:text-slate-100">{quizTitle}</h1>
            <p className="text-gray-300 dark:text-slate-300">Completato il {formatDate(result.date)}</p>
          </div>
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-200"
          >
            <ArrowLeft className="w-6 h-6" /> Indietro
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-950">Punteggio Totale</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {(result.score * 100).toFixed(1)}%
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-950">Risposte Corrette</h3>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {correctAnswers}/{totalQuestions}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-950">Tempo Totale</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {formatTime(result.totalTime)}
            </p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-950">Livello</h3>
            </div>
            <p className="text-2xl font-bold text-yellow-600">
              {getDifficultyLevel()}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Question Analysis */}
      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100 mb-4">Analisi Dettagliata delle Risposte</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {questions.length > 0 ? (
            questions.map((question, index) => {
              // Determiniamo un'opzione incorretta "simulata" per rappresentare la scelta dell'utente
              // quando ha sbagliato (poiché non abbiamo l'informazione effettiva)
              const correctAnswerIndex = question.correct_answer !== undefined ? question.correct_answer : question.correctAnswer;
              let simulatedWrongAnswer = -1;
              
              // Solo se la risposta è sbagliata, selezioniamo un'opzione diversa da quella corretta
              if (!result.answers[index] && question.options && question.options.length > 0) {
                // Simuliamo la scelta dell'utente con un'opzione diversa da quella corretta
                const availableWrongOptions = Array.from(
                  { length: question.options.length }, 
                  (_, i) => i
                ).filter(i => i !== correctAnswerIndex);
                
                if (availableWrongOptions.length > 0) {
                  // Prendiamo la prima opzione errata disponibile per avere un comportamento deterministico
                  simulatedWrongAnswer = availableWrongOptions[0];
                }
              }
              
              return (
                <div key={index} className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-slate-950 dark:text-slate-100 mb-2"> 
                        Domanda {index + 1} {!result.answers[index] && <span className="text-rose-600 font-semibold">(Risposta Errata)</span>}
                      </h3>
                      <p className="text-slate-950 dark:text-slate-100 mb-4">
                        {question.question_text || question.question || ""}
                      </p>

                      {/* Options */}
                      <div className="space-y-2 text-slate-950 dark:text-slate-900 mb-4">
                        {(question.options || []).map((option: string, optionIndex: number) => {
                          // Supporta entrambi i formati di indice della risposta corretta
                          const correctAnswerIndex = 
                            question.correct_answer !== undefined 
                              ? question.correct_answer 
                              : question.correctAnswer;
                          
                          const isCorrectAnswer = optionIndex === correctAnswerIndex;
                          // Evidenziamo in rosso solo l'opzione che simula la scelta errata dell'utente
                          const isSimulatedWrongAnswer = !result.answers[index] && optionIndex === simulatedWrongAnswer;
                          
                          return (
                            <div
                              key={optionIndex}
                              className={`p-3 rounded-lg ${
                                isCorrectAnswer
                                  ? 'bg-emerald-600 text-white border border-emerald-700'
                                  : isSimulatedWrongAnswer
                                    ? 'bg-rose-600 text-white border border-rose-700'
                                    : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>{option}</div>
                                <div>
                                  {isCorrectAnswer && (
                                    <span className="ml-2 text-white font-medium flex items-center">
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      Risposta corretta
                                    </span>
                                  )}
                                  {isSimulatedWrongAnswer && (
                                    <span className="ml-2 text-white font-medium flex items-center">
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Risposta selezionata (errata)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {!result.answers[index] && (
                        <div className="mb-4 p-3 bg-gray-100 text-gray-800 rounded-lg">
                          <span className="font-medium">Rivedi la risposta corretta evidenziata in verde.</span>
                        </div>
                      )}

                      {/* Question Stats */}
                      <div className="flex items-center gap-6 text-sm text-slate-750 dark:text-slate-100 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Tempo: {formatTime(result.questionTimes[index] || 0)}
                        </span>
                      </div>

                      {/* Explanation */}
                      {question.explanation && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-800">Spiegazione</span>
                          </div>
                          <p className="text-blue-900">{question.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">Nessuna domanda disponibile per questo quiz</p>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions and Resources */}
      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-100 mb-6">Suggerimenti e Risorse</h2>
        
        <div className="space-y-4">
          {successRate < 0.75 && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">
                  Aree di Miglioramento
                </h3>
                <p className="text-yellow-700">
                  Per migliorare il tuo punteggio, ti suggeriamo di:
                </p>
                <ul className="list-disc list-inside mt-2 text-yellow-700">
                  <li>Rivedere attentamente le domande sbagliate</li>
                  <li>Concentrarti sulle spiegazioni fornite</li>
                  <li>Esercitarti con più quiz della stessa categoria</li>
                </ul>
              </div>
            </div>
          )}

          {successRate >= 0.75 && (
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <Trophy className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-800 mb-1">
                  Ottimo Risultato!
                </h3>
                <p className="text-green-700">
                  Hai dimostrato una buona padronanza degli argomenti. Per migliorare ulteriormente:
                </p>
                <ul className="list-disc list-inside mt-2 text-green-700">
                  <li>Prova quiz di livello più avanzato</li>
                  <li>Aiuta altri studenti condividendo le tue strategie</li>
                  <li>Mantieni costante il tuo ritmo di studio</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}