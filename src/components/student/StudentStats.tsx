import React from 'react';
import { Clock, Target, CheckCircle2, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { QuizDetailReport } from './QuizDetailReport';
import type { QuizResult } from '../../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { supabase } from '../../services/supabase';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface StudentStatsProps {
  results: QuizResult[];
  onBack: () => void;
  showFilters?: boolean;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  quiz_type: 'exam' | 'learning';
  category: string;
}

export function StudentStats({ results, onBack, showFilters = false }: StudentStatsProps) {
  const [selectedResult, setSelectedResult] = React.useState<QuizResult | null>(null);
  const [quizDetails, setQuizDetails] = React.useState<{ [key: string]: QuizDetails }>({});
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null);
  const [quizTypeFilter, setQuizTypeFilter] = React.useState<string | null>(null);
  const [dateFilter, setDateFilter] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadQuizDetails();
  }, [results]);

  const loadQuizDetails = async () => {
    try {
      const quizIds = [...new Set(results.map(r => r.quizId))].filter(Boolean);
      
      if (quizIds.length === 0) return;

      const { data, error } = await supabase
        .from('quiz_templates')
        .select('id, title, description, quiz_type, category')
        .in('id', quizIds);

      if (error) throw error;

      const detailsMap = (data || []).reduce((acc, quiz) => {
        acc[quiz.id] = quiz;
        return acc;
      }, {} as { [key: string]: QuizDetails });

      setQuizDetails(detailsMap);
    } catch (error) {
      console.error('Error loading quiz details:', error);
    }
  };

  // Filtra i risultati in base ai filtri selezionati
  const filteredResults = React.useMemo(() => {
    return results.filter(result => {
      // Filtra per categoria
      if (categoryFilter && result.category !== categoryFilter) {
        return false;
      }
      
      // Filtra per tipo di quiz
      if (quizTypeFilter && result.quizId) {
        const quizDetail = quizDetails[result.quizId];
        if (!quizDetail || quizDetail.quiz_type !== quizTypeFilter) {
          return false;
        }
      }
      
      // Filtra per data (mese/anno)
      if (dateFilter) {
        const resultDate = new Date(result.date);
        const filterDate = new Date(dateFilter);
        if (
          resultDate.getMonth() !== filterDate.getMonth() ||
          resultDate.getFullYear() !== filterDate.getFullYear()
        ) {
          return false;
        }
      }
      
      return true;
    });
  }, [results, categoryFilter, quizTypeFilter, dateFilter, quizDetails]);

  // Estrai le categorie uniche per il filtro
  const categories = React.useMemo(() => {
    return [...new Set(results.map(r => r.category))];
  }, [results]);

  // Estrai i tipi di quiz unici per il filtro
  const quizTypes = React.useMemo(() => {
    const types = new Set<string>();
    results.forEach(r => {
      if (r.quizId && quizDetails[r.quizId]) {
        types.add(quizDetails[r.quizId].quiz_type);
      }
    });
    return [...types];
  }, [results, quizDetails]);

  // Estrai le date uniche (mese/anno) per il filtro
  const dates = React.useMemo(() => {
    const uniqueDates = new Set<string>();
    results.forEach(r => {
      const date = new Date(r.date);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      uniqueDates.add(monthYear);
    });
    return [...uniqueDates].sort().reverse(); // Ordina dal più recente
  }, [results]);

  if (selectedResult) {
    const quizDetail = selectedResult.quizId ? quizDetails[selectedResult.quizId] : null;
    return (
      <QuizDetailReport
        result={selectedResult}
        onBack={() => setSelectedResult(null)}
        quizTitle={quizDetail ? quizDetail.title : selectedResult.category}
      />
    );
  }

  const totalAttempts = filteredResults.length;
  if (totalAttempts === 0) {
    return (
      <div className="space-y-6">
        {showFilters && (
          <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-white dark:text-slate-100 mb-4">Filtri</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white dark:text-slate-300 mb-1">Categoria</label>
                <select
                  className="w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={categoryFilter || ''}
                  onChange={(e) => setCategoryFilter(e.target.value || null)}
                >
                  <option value="">Tutte le categorie</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white dark:text-slate-300 mb-1">Tipo di Quiz</label>
                <select
                  className="w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={quizTypeFilter || ''}
                  onChange={(e) => setQuizTypeFilter(e.target.value || null)}
                >
                  <option value="">Tutti i tipi</option>
                  {quizTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === 'exam' ? 'Esame' : type === 'learning' ? 'Apprendimento' : type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white dark:text-slate-300 mb-1">Data (Mese/Anno)</label>
                <select
                  className="w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={dateFilter || ''}
                  onChange={(e) => setDateFilter(e.target.value || null)}
                >
                  <option value="">Tutte le date</option>
                  {dates.map((date) => {
                    const [year, month] = date.split('-');
                    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
                    return (
                      <option key={date} value={date}>
                        {monthNames[parseInt(month) - 1]} {year}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        )}
        
        <button
          onClick={onBack}
          className="text-white hover:text-blue-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna indietro
        </button>

        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-gray-600">
            {results.length === 0 
              ? "Non hai ancora completato nessun quiz." 
              : "Nessun quiz corrisponde ai filtri selezionati."}
          </p>
        </div>
      </div>
    );
  }

  const averageScore = filteredResults.reduce((acc, curr) => acc + curr.score, 0) / totalAttempts;
  const passedAttempts = filteredResults.filter(r => r.score >= 0.75).length;
  const failedAttempts = totalAttempts - passedAttempts;

  const pieData = {
    labels: ['Superati', 'Non Superati'],
    datasets: [
      {
        data: [passedAttempts, failedAttempts],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderColor: ['#16a34a', '#dc2626'],
        borderWidth: 1,
      },
    ],
  };

  const categoryResults = filteredResults.reduce((acc: { [key: string]: number[] }, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = [];
    }
    acc[curr.category].push(curr.score);
    return acc;
  }, {});

  const categoryAverages = Object.entries(categoryResults).map(([category, scores]) => ({
    category,
    average: scores.reduce((a, b) => a + b, 0) / scores.length
  }));

  const barData = {
    labels: categoryAverages.map(c => c.category),
    datasets: [
      {
        label: 'Media Punteggi per Categoria',
        data: categoryAverages.map(c => c.average * 100),
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1,
      },
    ],
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

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white dark:text-slate-100 mb-4">Filtri</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white dark:text-slate-300 mb-1">Categoria</label>
              <select
                className="w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={categoryFilter || ''}
                onChange={(e) => setCategoryFilter(e.target.value || null)}
              >
                <option value="">Tutte le categorie</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white dark:text-slate-300 mb-1">Tipo di Quiz</label>
              <select
                className="w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={quizTypeFilter || ''}
                onChange={(e) => setQuizTypeFilter(e.target.value || null)}
              >
                <option value="">Tutti i tipi</option>
                {quizTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === 'exam' ? 'Esame' : type === 'learning' ? 'Apprendimento' : type}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white dark:text-slate-300 mb-1">Data (Mese/Anno)</label>
              <select
                className="w-full rounded-md border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={dateFilter || ''}
                onChange={(e) => setDateFilter(e.target.value || null)}
              >
                <option value="">Tutte le date</option>
                {dates.map((date) => {
                  const [year, month] = date.split('-');
                  const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
                  return (
                    <option key={date} value={date}>
                      {monthNames[parseInt(month) - 1]} {year}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-white dark:text-slate-100">Quiz Completati</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{filteredResults.length}</p>
        </div>

        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-white dark:text-slate-100">Media Punteggi</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {filteredResults.length > 0 
              ? ((filteredResults.reduce((acc, curr) => acc + curr.score, 0) / filteredResults.length) * 100).toFixed(1)
              : '0.0'}%
          </p>
        </div>

        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-white dark:text-slate-100">Tasso di Successo</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">
            {filteredResults.length > 0
              ? ((filteredResults.filter(r => r.score >= 0.75).length / filteredResults.length) * 100).toFixed(1)
              : '0.0'}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white dark:text-slate-100">Distribuzione Risultati</h3>
          <div className="w-full max-w-xs mx-auto">
            <Pie 
              data={pieData} 
              options={{ 
                responsive: true,
                plugins: {
                  legend: {
                    labels: {
                      color: 'rgb(148 163 184)'
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-white dark:text-slate-100">Performance per Categoria</h3>
          <Bar
            data={barData}
            options={{
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  ticks: {
                    callback: value => `${value}%`,
                    color: 'rgb(148 163 184)'
                  }
                },
                x: {
                  ticks: {
                    color: 'rgb(148 163 184)'
                  }
                }
              }
            }}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold dark:text-slate-100">Cronologia Quiz</h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-slate-800">
          {filteredResults.map((result, index) => {
            const quizDetail = result.quizId ? quizDetails[result.quizId] : null;
            return (
              <div
                key={index}
                className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                onClick={() => setSelectedResult(result)}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {quizDetail?.quiz_type === 'exam' ? (
                        <GraduationCap className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-green-600" />
                      )}
                      <div>
                        <h4 className="font-medium dark:text-slate-100">
                          {quizDetail?.title || result.category}
                        </h4>
                        {quizDetail?.description && (
                          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                            {quizDetail.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {(result.score * 100).toFixed(1)}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {Math.floor(result.totalTime / 60)}:{(result.totalTime % 60).toString().padStart(2, '0')}
                      </span>
                      <span>
                        {formatDate(result.date)}
                      </span>
                      {quizDetail?.category && (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                          {quizDetail.category}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`px-3 py-1 rounded-full text-sm ${
                    result.score >= 0.75
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    {result.score >= 0.75 ? 'Superato' : 'Non Superato'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}