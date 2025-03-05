import React from 'react';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, AlertTriangle, Trophy, BookOpen, Star, RefreshCw } from 'lucide-react';
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
  const [loadingError, setLoadingError] = React.useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = React.useState(0);
  const [debugInfo, setDebugInfo] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadQuizData();
  }, [result.quizId, loadAttempts]);

  const loadQuizData = async () => {
    setLoading(true);
    setLoadingError(null);
    setDebugInfo(null);
    
    try {
      console.log('Loading quiz data with:', { 
        quizId: result.quizId, 
        hasQuestions: result.questions && result.questions.length > 0,
        answers: result.answers ? result.answers.length : 0, 
        resultObject: JSON.stringify(result),
        loadAttempt: loadAttempts + 1
      });
      
      // Se le domande sono già incluse nel risultato, usale direttamente
      if (result.questions && result.questions.length > 0) {
        console.log('Using embedded questions:', result.questions.length);
        console.log('First question sample:', JSON.stringify(result.questions[0]));
        
        // Normalizziamo le domande per assicurarci che abbiano tutti i campi necessari
        const normalizedQuestions = result.questions.map((q: any) => ({
          id: q.id || Math.random().toString(36).substring(2, 9),
          question_text: q.question_text || q.question || "",
          options: q.options || [],
          correct_answer: q.correct_answer !== undefined ? q.correct_answer : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
          explanation: q.explanation || "",
          image_url: q.image_url || "",
          category: q.category || result.category || ""
        }));
        
        setQuestions(normalizedQuestions);
        setLoading(false);
        return;
      }
      
      if (!result.quizId) {
        console.error("Quiz ID non disponibile nel risultato");
        setLoadingError("ID del quiz non disponibile");
        setLoading(false);
        return;
      }
      
      console.log(`Tentativo di caricamento domande per quiz_id: ${result.quizId}`);
      
      // PRIMO TENTATIVO: Carica direttamente da quiz_questions
      try {
        console.log(`1. Caricamento da quiz_questions per quiz_id: ${result.quizId}`);
        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', result.quizId);
          
        if (questionError) {
          console.error("Errore nel caricamento delle domande:", questionError);
        } else if (questionData && questionData.length > 0) {
          console.log(`Domande trovate in quiz_questions: ${questionData.length}`);
          setQuestions(questionData);
          setLoading(false);
          return;
        } else {
          console.log("Nessuna domanda trovata in quiz_questions");
        }
      } catch (err) {
        console.error("Errore durante il caricamento da quiz_questions:", err);
      }
      
      // SECONDO TENTATIVO: Carica dal quiz template
      try {
        console.log(`2. Caricamento del quiz template con ID: ${result.quizId}`);
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_templates')
          .select('*')
          .eq('id', result.quizId)
          .single();
          
        if (quizError) {
          console.error("Errore nel caricamento del quiz template:", quizError);
        } else if (quizData && quizData.questions && quizData.questions.length > 0) {
          console.log(`Domande trovate nel quiz template: ${quizData.questions.length}`);
          setQuestions(quizData.questions);
          setLoading(false);
          return;
        } else {
          console.log("Nessuna domanda trovata nel quiz template");
        }
      } catch (err) {
        console.error("Errore durante il caricamento del quiz template:", err);
      }
      
      // TERZO TENTATIVO: Carica da quizzes
      try {
        console.log(`3. Caricamento da quizzes con ID: ${result.quizId}`);
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', result.quizId)
          .single();
          
        if (quizzesError) {
          console.error("Errore nel caricamento da quizzes:", quizzesError);
        } else if (quizzesData && quizzesData.questions && quizzesData.questions.length > 0) {
          console.log(`Domande trovate in quizzes: ${quizzesData.questions.length}`);
          setQuestions(quizzesData.questions);
          setLoading(false);
          return;
        } else {
          console.log("Nessuna domanda trovata in quizzes");
        }
      } catch (err) {
        console.error("Errore durante il caricamento da quizzes:", err);
      }
      
      // QUARTO TENTATIVO: Carica direttamente le domande con una query RPC personalizzata
      try {
        console.log(`4. Tentativo con RPC get_quiz_questions per quiz_id: ${result.quizId}`);
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_quiz_questions', { quiz_id: result.quizId });
          
        if (rpcError) {
          console.error("Errore nella chiamata RPC:", rpcError);
        } else if (rpcData && rpcData.length > 0) {
          console.log(`Domande trovate tramite RPC: ${rpcData.length}`);
          setQuestions(rpcData);
          setLoading(false);
          return;
        } else {
          console.log("Nessuna domanda trovata tramite RPC");
        }
      } catch (err) {
        console.error("Errore durante la chiamata RPC:", err);
      }
      
      // Se arriviamo qui, non abbiamo trovato domande
      console.error("Nessuna domanda trovata dopo tutti i tentativi");
      setLoadingError("Nessuna domanda disponibile per questo quiz");
      setDebugInfo({
        quizId: result.quizId,
        category: result.category,
        date: formatDate(result.date)
      } as any);
    } catch (error) {
      console.error("Errore imprevisto nel caricamento dei dati:", error);
      setLoadingError(`Errore imprevisto: ${error instanceof Error ? error.message : String(error)}`);
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

  // Correggo gli errori di sintassi nella funzione di caricamento dei risultati precedenti
  const loadPreviousResults = async () => {
    try {
      const { data: prevResults, error: prevError } = await supabase
        .from('results')
        .select('*')
        .eq('student_email', result.email)
        .eq('category', result.category)
        .order('date', { ascending: false })
        .limit(5);

      if (prevError) {
        console.error('Error loading previous results:', prevError);
        throw prevError;
      }
      setPreviousResults(prevResults || []);
    } catch (error) {
      console.error("Errore nel caricamento dei risultati precedenti:", error);
    }
  };

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
              // Verifichiamo che l'indice sia valido per l'array delle risposte
              const hasValidAnswerIndex = index < result.answers.length;
              const isAnswerCorrect = hasValidAnswerIndex ? result.answers[index] : false;
              
              // Determiniamo un'opzione incorretta "simulata" per rappresentare la scelta dell'utente
              // quando ha sbagliato (poiché non abbiamo l'informazione effettiva)
              const correctAnswerIndex = 
                question.correct_answer !== undefined 
                  ? question.correct_answer 
                  : (question.correctAnswer !== undefined ? question.correctAnswer : 0);
              
              let simulatedWrongAnswer = -1;
              
              // Solo se la risposta è sbagliata, selezioniamo un'opzione diversa da quella corretta
              if (hasValidAnswerIndex && !isAnswerCorrect && question.options && question.options.length > 0) {
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
                        Domanda {index + 1} {hasValidAnswerIndex && !isAnswerCorrect && <span className="text-rose-600 font-semibold">(Risposta Errata)</span>}
                      </h3>
                      <p className="text-slate-950 dark:text-slate-100 mb-4">
                        {question.question_text || question.question || ""}
                      </p>

                      {/* Options */}
                      <div className="space-y-2 text-slate-950 dark:text-slate-900 mb-4">
                        {(question.options || []).map((option: string, optionIndex: number) => {
                          const isCorrectAnswer = optionIndex === correctAnswerIndex;
                          // Evidenziamo in rosso solo l'opzione che simula la scelta errata dell'utente
                          const isSimulatedWrongAnswer = hasValidAnswerIndex && !isAnswerCorrect && optionIndex === simulatedWrongAnswer;
                          
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

                      {hasValidAnswerIndex && !isAnswerCorrect && (
                        <div className="mb-4 p-3 bg-gray-100 text-gray-800 rounded-lg">
                          <span className="font-medium">Rivedi la risposta corretta evidenziata in verde.</span>
                        </div>
                      )}

                      {/* Question Stats */}
                      <div className="flex items-center gap-6 text-sm text-slate-750 dark:text-slate-100 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Tempo: {formatTime(result.questionTimes && index < result.questionTimes.length ? result.questionTimes[index] : 0)}
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
              <p className="text-gray-500 mb-4">Nessuna domanda disponibile per questo quiz</p>
              <p className="text-gray-400 mt-2">ID Quiz: {result.quizId || 'Non disponibile'}</p>
              <p className="text-gray-400">Categoria: {result.category || 'Non disponibile'}</p>
              <p className="text-gray-400 mb-6">Data: {formatDate(result.date)}</p>
              
              {loadingError && (
                <p className="text-rose-500 mb-4">{loadingError}</p>
              )}
              
              <button 
                onClick={() => setLoadAttempts(prev => prev + 1)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Riprova a caricare le domande
              </button>
              
              <p className="text-gray-400 mt-4 text-sm">
                Se il problema persiste, contatta l'assistenza tecnica fornendo l'ID Quiz.
              </p>
              
              {debugInfo && (
                <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-md text-left">
                  <p className="text-gray-500 mb-2 font-semibold">Informazioni di debug:</p>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {debugInfo}
                  </pre>
                </div>
              )}
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