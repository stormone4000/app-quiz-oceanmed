import React from 'react';
import { ArrowLeft, Clock, Target, CheckCircle2, XCircle, AlertTriangle, Trophy, BookOpen, TrendingUp, Star } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { QuizResult } from '../../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

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
      // Se le domande sono già incluse nel risultato, usale direttamente
      if (result.questions && result.questions.length > 0) {
        setQuestions(result.questions);
      } else {
        // Altrimenti, carica le domande dal database
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', result.quizId)
          .order('created_at', { ascending: true });

        if (quizError) throw quizError;
        setQuestions(quizData || []);
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

  const correctAnswers = result.answers.filter(Boolean).length;
  const totalQuestions = result.answers.length;
  const successRate = correctAnswers / totalQuestions;

  // Calculate difficulty level based on average time and success rate
  const avgTimePerQuestion = result.totalTime / totalQuestions;
  const difficultyScore = Math.min(
    ((30 - avgTimePerQuestion) / 30) * 0.5 + (1 - successRate) * 0.5,
    1
  );
  const getDifficultyLevel = () => {
    if (difficultyScore > 0.8) return 'Avanzato';
    if (difficultyScore > 0.6) return 'Intermedio';
    return 'Base';
  };

  // Calculate performance trend
  const performanceTrend = previousResults.length > 1
    ? (result.score - previousResults[1].score) * 100
    : 0;

  // Determine badges
  const badges = [
    { name: 'Precisione', icon: Target, earned: successRate >= 0.9 },
    { name: 'Velocità', icon: Clock, earned: avgTimePerQuestion < 20 },
    { name: 'Costanza', icon: TrendingUp, earned: performanceTrend > 0 },
  ];

  // Prepare chart data for time distribution
  const timeData = {
    labels: questions.map((_, i) => `Domanda ${i + 1}`),
    datasets: [{
      label: 'Tempo impiegato (secondi)',
      data: result.questionTimes,
      backgroundColor: '#3b82f6',
      borderColor: '#2563eb',
      borderWidth: 1,
    }]
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

      {/* Performance Analysis */}
      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-6 dark:text-slate-100">Analisi della Performance</h2>
        
        <div className="space-y-6">
          {/* Time Distribution Chart */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Distribuzione Tempi di Risposta</h3>
            <Bar
              data={timeData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Secondi'
                    }
                  }
                }
              }}
            />
          </div>

          {/* Badges */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Badge e Riconoscimenti</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {badges.map(badge => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.name}
                    className={`p-4 rounded-lg border ${
                      badge.earned
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${
                        badge.earned ? 'text-green-600' : 'text-gray-400'
                      }`} />
                      <span className={badge.earned ? 'text-green-800' : 'text-gray-600'}>
                        {badge.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Analysis */}
          {previousResults.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-slate-100 mb-4">Trend di Miglioramento</h3>
              <div className={`p-4 rounded-lg ${
                performanceTrend > 0
                  ? 'text-lg font-light text-emerald-950 dark:text-emerald-300'
                  : performanceTrend < 0
                    ? 'text-lg font-light text-rose-950 dark:text-rose-300'
                    : 'text-lg font-light text-slate-950 dark:text-slate-300'
              }`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-5 h-5 ${
                    performanceTrend > 0
                      ? 'text-green-600'
                      : performanceTrend < 0
                        ? 'text-lg font-light text-rose-950 dark:text-rose-300'
                        : 'text-lg font-light text-slate-950 dark:text-slate-300'
                  }`} />
                  <span>
                    {performanceTrend > 0
                      ? `Miglioramento del ${performanceTrend.toFixed(1)}% rispetto al tentativo precedente`
                      : performanceTrend < 0
                        ? `Diminuzione del ${Math.abs(performanceTrend).toFixed(1)}% rispetto al tentativo precedente`
                        : 'Prestazione stabile rispetto al tentativo precedente'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Question Analysis */}
      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-100 mb-4">Analisi Dettagliata delle Risposte</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {questions.map((question, index) => (
            <div key={index} className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${
                  result.answers[index]
                    ? 'text-lg font-semibold text-white dark:text-slate-100'
                    : 'text-lg font-semibold text-rose-950 dark:text-rose-300'
                }`}>
                  {result.answers[index] ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600" />
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-medium text-slate-950 dark:text-slate-100 mb-2"> 
                    Domanda {index + 1}
                  </h3>
                  <p className="text-slate-950 dark:text-slate-100 mb-4">{question.question_text}</p>

                  {/* Options */}
                  <div className="space-y-2 text-slate-950 dark:text-slate-900 mb-4">
                    {question.options.map((option: string, optionIndex: number) => (
                      <div
                        key={optionIndex}
                        className={`p-3 rounded-lg ${
                          optionIndex === question.correct_answer
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-gray-50 border border-gray-200'
                        }`}
                      >
                        {option}
                        {optionIndex === question.correct_answer && (
                          <span className="ml-2 text-emerald-600 text-sm">
                            (Risposta corretta)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Question Stats */}
                  <div className="flex items-center gap-6 text-sm text-slate-750 dark:text-slate-100 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Tempo: {formatTime(result.questionTimes[index])}
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
          ))}
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