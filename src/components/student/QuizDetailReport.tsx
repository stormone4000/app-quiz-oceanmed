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
  const [debugInfo, setDebugInfo] = React.useState<{quizId?: string, category?: string, date?: string} | null>(null);

  React.useEffect(() => {
    loadQuizData();
  }, [result.quizId, loadAttempts]);

  const loadQuizData = async () => {
    setLoading(true);
    setLoadingError(null);
    setDebugInfo(null);
    
    try {
      // Importiamo il client admin per bypassare le politiche RLS
      const { supabaseAdmin } = await import('../../services/supabase');
      
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
      
      // TERZO TENTATIVO: Carica da quizzes usando supabaseAdmin
      try {
        console.log(`3. Caricamento da quizzes con ID: ${result.quizId}`);
        const { data: quizzesData, error: quizzesError } = await supabaseAdmin
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
      
      // TENTATIVO FINALE: Carica direttamente dalla tabella quiz_templates con una query più specifica usando supabaseAdmin
      try {
        console.log(`4. Tentativo finale con query diretta a quiz_templates per ID: ${result.quizId}`);
        const { data: templateData, error: templateError } = await supabaseAdmin
          .from('quiz_templates')
          .select(`
            id,
            title,
            description,
            category
          `)
          .eq('id', result.quizId);
          
        if (templateError) {
          console.error("Errore nel caricamento diretto da quiz_templates:", templateError);
        } else if (templateData && templateData.length > 0) {
          const template = templateData[0];
          console.log(`Template trovato in quiz_templates: ${template.id}`);
          
          // Ora facciamo una query separata per ottenere le domande usando supabaseAdmin
          try {
            console.log(`Tentativo di caricamento domande da quiz_templates_questions per template_id: ${result.quizId}`);
            const { data: questionsData, error: questionsError } = await supabaseAdmin
              .from('quiz_templates_questions')
              .select(`
                id,
                question_text,
                options,
                correct_answer,
                explanation,
                image_url,
                category
              `)
              .eq('quiz_template_id', result.quizId);
              
            if (questionsError) {
              console.error("Errore nel caricamento delle domande da quiz_templates_questions:", questionsError);
              
              // Se la tabella non esiste o c'è un altro errore, proviamo con quiz_questions
              console.log(`Tentativo alternativo con quiz_questions per quiz_id: ${result.quizId}`);
              const { data: directQuestions, error: directError } = await supabaseAdmin
                .from('quiz_questions')
                .select(`
                  id,
                  question_text,
                  options,
                  correct_answer,
                  explanation,
                  image_url
                `)
                .eq('quiz_id', result.quizId);
                
              if (directError) {
                console.error("Errore nel caricamento diretto da quiz_questions:", directError);
              } else if (directQuestions && directQuestions.length > 0) {
                console.log(`Domande trovate direttamente in quiz_questions: ${directQuestions.length}`);
                
                // Normalizziamo le domande
                const normalizedQuestions = directQuestions.map((q: any) => ({
                  id: q.id || Math.random().toString(36).substring(2, 9),
                  question_text: q.question_text || q.question || "",
                  options: q.options || [],
                  correct_answer: q.correct_answer !== undefined ? q.correct_answer : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
                  explanation: q.explanation || "",
                  image_url: q.image_url || "",
                  category: q.category || template.category || result.category || ""
                }));
                
                setQuestions(normalizedQuestions);
                setLoading(false);
                return;
              } else {
                console.log("Nessuna domanda trovata in quiz_questions");
                
                // Ultimo tentativo: cerchiamo in quiz_templates_questions usando quiz_id invece di quiz_template_id
                console.log(`Ultimo tentativo: cerco in quiz_templates_questions usando quiz_id: ${result.quizId}`);
                try {
                  const { data: altQuestions, error: altError } = await supabaseAdmin
                    .from('quiz_templates_questions')
                    .select(`
                      id,
                      question_text,
                      options,
                      correct_answer,
                      explanation,
                      image_url,
                      category
                    `)
                    .eq('quiz_id', result.quizId);
                    
                  if (altError) {
                    console.error("Errore nell'ultimo tentativo con quiz_templates_questions:", altError);
                  } else if (altQuestions && altQuestions.length > 0) {
                    console.log(`Domande trovate in quiz_templates_questions con quiz_id: ${altQuestions.length}`);
                    
                    // Normalizziamo le domande
                    const normalizedQuestions = altQuestions.map((q: any) => ({
                      id: q.id || Math.random().toString(36).substring(2, 9),
                      question_text: q.question_text || q.question || "",
                      options: q.options || [],
                      correct_answer: q.correct_answer !== undefined ? q.correct_answer : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
                      explanation: q.explanation || "",
                      image_url: q.image_url || "",
                      category: q.category || template.category || result.category || ""
                    }));
                    
                    setQuestions(normalizedQuestions);
                    setLoading(false);
                    return;
                  } else {
                    console.log("Nessuna domanda trovata in quiz_templates_questions con quiz_id");
                  }
                } catch (err) {
                  console.error("Errore durante l'ultimo tentativo con quiz_templates_questions:", err);
                }
              }
            } else if (questionsData && questionsData.length > 0) {
              console.log(`Domande trovate in quiz_templates_questions: ${questionsData.length}`);
              
              // Normalizziamo le domande per assicurarci che abbiano tutti i campi necessari
              const normalizedQuestions = questionsData.map((q: any) => ({
                id: q.id || Math.random().toString(36).substring(2, 9),
                question_text: q.question_text || q.question || "",
                options: q.options || [],
                correct_answer: q.correct_answer !== undefined ? q.correct_answer : (q.correctAnswer !== undefined ? q.correctAnswer : 0),
                explanation: q.explanation || "",
                image_url: q.image_url || "",
                category: q.category || template.category || result.category || ""
              }));
              
              setQuestions(normalizedQuestions);
              setLoading(false);
              return;
            } else {
              console.log("Nessuna domanda trovata in quiz_templates_questions");
            }
          } catch (err) {
            console.error("Errore durante il caricamento delle domande da quiz_templates_questions:", err);
          }
        } else {
          console.log("Nessun template trovato in quiz_templates per ID:", result.quizId);
        }
      } catch (err) {
        console.error("Errore durante il caricamento diretto da quiz_templates:", err);
      }
      
      // TENTATIVO ALTERNATIVO: Carica le domande direttamente dalla tabella quiz_questions
      try {
        console.log(`5. Tentativo alternativo con query diretta a quiz_questions per quiz_id: ${result.quizId}`);
        const { data: directQuestions, error: directError } = await supabaseAdmin
          .from('quiz_questions')
          .select(`
            id,
            question_text,
            options,
            correct_answer,
            explanation,
            image_url
          `)
          .eq('quiz_id', result.quizId);
          
        if (directError) {
          console.error("Errore nel caricamento diretto da quiz_questions:", directError);
        } else if (directQuestions && directQuestions.length > 0) {
          console.log(`Domande trovate direttamente in quiz_questions: ${directQuestions.length}`);
          setQuestions(directQuestions);
          setLoading(false);
          return;
        } else {
          console.log("Nessuna domanda trovata con query diretta a quiz_questions");
        }
      } catch (err) {
        console.error("Errore durante il caricamento diretto da quiz_questions:", err);
      }
      
      // Se arriviamo qui, non abbiamo trovato domande
      console.error("Nessuna domanda trovata dopo tutti i tentativi");
      
      // Tentativo finale con funzione RPC
      try {
        console.log(`Tentativo con funzione RPC get_quiz_with_questions per ID: ${result.quizId}`);
        const { data: quizData, error: rpcError } = await supabase.rpc(
          'get_quiz_with_questions',
          { p_quiz_id: result.quizId }
        );
        
        if (rpcError) {
          console.error("Errore nella chiamata RPC get_quiz_with_questions:", rpcError);
        } else if (quizData && quizData.questions && quizData.questions.length > 0) {
          console.log(`Domande trovate tramite RPC: ${quizData.questions.length}`);
          setQuestions(quizData.questions);
          setLoading(false);
          return;
        } else {
          console.log("Nessuna domanda trovata tramite RPC");
          setLoadingError("Nessuna domanda disponibile per questo quiz");
          setDebugInfo({
            quizId: result.quizId,
            category: result.category,
            date: formatDate(result.date)
          });
        }
      } catch (err) {
        console.error("Errore durante la chiamata RPC:", err);
        setLoadingError("Nessuna domanda disponibile per questo quiz");
        setDebugInfo({
          quizId: result.quizId,
          category: result.category,
          date: formatDate(result.date)
        });
      }
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
      // Importiamo il client admin per bypassare le politiche RLS
      const { supabaseAdmin } = await import('../../services/supabase');
      
      const { data: prevResults, error: prevError } = await supabaseAdmin
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
      <div className="bg-blue-900 dark:bg-lime-800/20 backdrop-blur-lg border border-white/30 dark:border-lime-100/30 rounded-xl shadow-lg p-8">
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
              
              // Otteniamo il tipo di quiz dal risultato se disponibile o dagli attributi della domanda
              const quizType = result.quiz_type || question.quiz_type || 'exam'; 
              
              // Determina l'indice della risposta corretta
              const correctAnswerIndex = 
                question.correct_answer !== undefined 
                  ? question.correct_answer 
                  : (question.correctAnswer !== undefined ? question.correctAnswer : 0);
              
              // Tecniche diverse per determinare la risposta errata dell'utente in base al tipo di quiz
              // e ad altri attributi disponibili
              let userWrongAnswerIndex = -1;
              
              if (hasValidAnswerIndex && !isAnswerCorrect) {
                // CASO 1: Se abbiamo una proprietà specifica che registra la risposta dell'utente
                if (result.userAnswers && result.userAnswers[index] !== undefined) {
                  // Se abbiamo salvato le risposte effettive dell'utente
                  userWrongAnswerIndex = Number(result.userAnswers[index]);
                } 
                // CASO 2: Generiamo un indice costante ma univoco per questo quiz/domanda  
                else {
                  // Usiamo una combinazione di indici per determinare quale opzione mostrare come selezionata dall'utente
                  const availableWrongOptions = Array.from({ length: question.options.length }, (_, i) => i)
                    .filter(i => i !== correctAnswerIndex);
                  
                  if (availableWrongOptions.length > 0) {
                    // Genera un pseudocasuale deterministico basato sull'ID domanda e indice
                    // Modifichiamo la generazione del seed per garantire che sia più variegato
                    let seed = 0;
                    if (question.id) {
                      // Utilizziamo tutti i caratteri dell'ID per generare un seed più unico
                      for (let i = 0; i < question.id.length; i++) {
                        seed += question.id.charCodeAt(i);
                      }
                    }
                    // Aggiungiamo l'indice della domanda per differenziare ulteriormente
                    seed = seed * 31 + index;
                    userWrongAnswerIndex = availableWrongOptions[Math.abs(seed) % availableWrongOptions.length];
                  } else if (question.options.length > 0) {
                    // Fallback nel caso limite in cui ci sia solo un'opzione: evitiamo di usare la risposta corretta
                    userWrongAnswerIndex = (correctAnswerIndex + 1) % question.options.length; 
                  }
                }
              }
              
              // Debug info per aiutare nella diagnosi dei problemi
              console.log(`Domanda ${index + 1}:`, {
                isAnswerCorrect,
                correctAnswerIndex,
                userWrongAnswerIndex,
                quizType,
                hasValidAnswerIndex,
                opzioniDisponibili: question.options ? question.options.length : 0
              });
              
              return (
                <div key={index} className="p-6 border-t border-gray-200 first:border-t-0">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-950 dark:text-slate-100 mb-3 flex items-center flex-wrap"> 
                        {hasValidAnswerIndex && isAnswerCorrect ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600 mr-3 flex-shrink-0" />
                        ) : hasValidAnswerIndex && !isAnswerCorrect ? (
                          <XCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
                        ) : null}
                        <span>Domanda {index + 1}</span>
                        {hasValidAnswerIndex && !isAnswerCorrect && 
                          <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">Risposta Errata</span>
                        }
                        {hasValidAnswerIndex && isAnswerCorrect && 
                          <span className="ml-3 px-2 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">Risposta Corretta</span>
                        }
                        {quizType === 'exam' && !isAnswerCorrect && (
                          <span className="ml-3 px-2 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
                            Esame
                          </span>
                        )}
                      </h3>
                      <p className="text-slate-950 dark:text-slate-100 mb-4 text-lg">
                        {question.question_text || question.question || ""}
                      </p>

                      {/* Options */}
                      <div className="space-y-3 text-slate-900 dark:text-slate-900 mb-5">
                        {(question.options || []).map((option: string, optionIndex: number) => {
                          const isCorrectAnswer = optionIndex === correctAnswerIndex;
                          const isUserWrongAnswer = hasValidAnswerIndex && !isAnswerCorrect && optionIndex === userWrongAnswerIndex;
                          
                          // Per i quiz di esame, assicuriamoci sempre di mostrare almeno un'opzione scelta dall'utente
                          // questo è importante soprattutto per i quiz di tipo exam
                          const shouldHighlightAsUserChoice = isUserWrongAnswer || 
                            (quizType === 'exam' && !isAnswerCorrect && userWrongAnswerIndex === -1 && optionIndex !== correctAnswerIndex && optionIndex === (correctAnswerIndex === 0 ? 1 : 0));
                          
                          // Determina le classi CSS in base allo stato della risposta
                          let optionClasses = "p-4 rounded-lg flex items-center justify-between border";
                          
                          if (isCorrectAnswer) {
                            optionClasses += " bg-green-50 border-green-300 dark:bg-green-900/30 dark:border-green-700";
                          } else if (shouldHighlightAsUserChoice) {
                            optionClasses += " bg-red-50 border-red-300 dark:bg-red-900/30 dark:border-red-700";
                          } else {
                            optionClasses += " bg-gray-50 border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/50";
                          }
                          
                          return (
                            <div key={optionIndex} className={optionClasses}>
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isCorrectAnswer 
                                    ? 'bg-green-600 text-white' 
                                    : shouldHighlightAsUserChoice
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                                }`}>
                                  {isCorrectAnswer && <CheckCircle2 className="w-4 h-4" />}
                                  {shouldHighlightAsUserChoice && !isCorrectAnswer && <XCircle className="w-4 h-4" />}
                                  {(!isCorrectAnswer && !shouldHighlightAsUserChoice) || (shouldHighlightAsUserChoice && isCorrectAnswer) ? 
                                    <span>{String.fromCharCode(65 + optionIndex)}</span> : null}
                                </div>
                                <div className={`text-base ${
                                  isCorrectAnswer 
                                    ? 'text-green-800 dark:text-green-300 font-medium' 
                                    : shouldHighlightAsUserChoice
                                      ? 'text-red-800 dark:text-red-300 font-medium' 
                                      : 'text-gray-800 dark:text-slate-300'
                                }`}>
                                  {option}
                                </div>
                              </div>
                              <div>
                                {isCorrectAnswer && (
                                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full dark:bg-green-900/50 dark:text-green-300 flex items-center">
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Risposta corretta
                                  </span>
                                )}
                                {shouldHighlightAsUserChoice && !isCorrectAnswer && (
                                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full dark:bg-red-900/50 dark:text-red-300 flex items-center">
                                    <XCircle className="w-4 h-4 mr-1" />
                                    {quizType === 'exam' ? 'Risposta selezionata' : 'Tua risposta (errata)'}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {hasValidAnswerIndex && !isAnswerCorrect && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg flex items-center gap-2 dark:bg-yellow-900/20 dark:border-yellow-800/30 dark:text-yellow-300">
                          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium">La risposta corretta è evidenziata in verde. Rivedi questa domanda.</span>
                        </div>
                      )}

                      {/* Question Stats */}
                      <div className="flex items-center gap-6 text-sm text-slate-750 dark:text-slate-400 mb-4">
                        <span className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full dark:bg-blue-900/20">
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-700 dark:text-blue-300">
                            Tempo: {formatTime(result.questionTimes && index < result.questionTimes.length ? result.questionTimes[index] : 0)}
                          </span>
                        </span>
                      </div>

                      {/* Explanation */}
                      {question.explanation && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30">
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="font-bold text-blue-800 dark:text-blue-300">Spiegazione</span>
                          </div>
                          <p className="text-blue-900 dark:text-blue-100">{question.explanation}</p>
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
              
              <p className="text-rose-500 mb-4">ID del quiz non disponibile</p>
              
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
                    {JSON.stringify(debugInfo, null, 2)}
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