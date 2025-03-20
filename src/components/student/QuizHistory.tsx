import React, { useState, useEffect } from 'react';
import { Clock, Target, ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { QuizDetailReport } from './QuizDetailReport';
import type { QuizResult } from '../../types';

interface QuizHistoryProps {
  results: QuizResult[];
  onBack: () => void;
}

interface QuizDetails {
  id: string;
  title: string;
  description: string;
  quiz_type: 'exam' | 'learning';
  category: string;
}

export function QuizHistory({ results, onBack }: QuizHistoryProps) {
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [quizDetails, setQuizDetails] = useState<{ [key: string]: QuizDetails }>({});
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [quizTypeFilter, setQuizTypeFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  useEffect(() => {
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
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          aria-label="Torna indietro"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna indietro
        </button>
        
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Visualizzazione di {filteredResults.length} quiz completati
        </div>
      </div>
      
      {/* Filtri */}
      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-gray-200 dark:border-violet-100/30 rounded-xl p-6 mb-6">
        <h3 className="text-xl font-semibold text-slate-950 dark:text-white mb-4">Filtri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="category-filter" className="block text-base font-medium text-slate-950 dark:text-white mb-2">Categoria</label>
            <select
              id="category-filter"
              className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              aria-label="Filtra per categoria"
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
            <label htmlFor="quiz-type-filter" className="block text-base font-medium text-slate-950 dark:text-white mb-2">Tipo di Quiz</label>
            <select
              id="quiz-type-filter"
              className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={quizTypeFilter || ''}
              onChange={(e) => setQuizTypeFilter(e.target.value || null)}
              aria-label="Filtra per tipo di quiz"
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
            <label htmlFor="date-filter" className="block text-base font-medium text-slate-950 dark:text-white mb-2">Data (Mese/Anno)</label>
            <select
              id="date-filter"
              className="w-full rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={dateFilter || ''}
              onChange={(e) => setDateFilter(e.target.value || null)}
              aria-label="Filtra per data"
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

      {/* Lista quiz completati */}
      {filteredResults.length === 0 ? (
        <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-gray-200 dark:border-violet-100/30 rounded-xl p-8 text-center">
          <p className="text-gray-600 dark:text-slate-400">
            {results.length === 0 
              ? "Non hai ancora completato nessun quiz." 
              : "Nessun quiz corrisponde ai filtri selezionati."}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-blue-200 dark:border-violet-100/30 rounded-xl p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">Cronologia Quiz Completati</h3>
          <div className="space-y-4">
            {filteredResults.map((result, index) => {
              const quizDetail = result.quizId ? quizDetails[result.quizId] : null;

              return (
                <div 
                  key={index} 
                  className="bg-white dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedResult(result)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Visualizza dettagli del quiz ${quizDetail?.title || result.category}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedResult(result);
                    }
                  }}
                >
                  <div className="p-4 flex justify-between items-center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          {quizDetail?.quiz_type === 'exam' ? (
                            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                          ) : quizDetail?.quiz_type === 'learning' ? (
                            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                          ) : (
                            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                          )}
                        </div>
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-white">
                          {quizDetail?.title || result.category}
                        </h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-slate-300">
                        <span className="flex items-center gap-1 font-medium">
                          <Target className="w-4 h-4" aria-hidden="true" />
                          {(result.score * 100).toFixed(1)}%
                        </span>
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-4 h-4" aria-hidden="true" />
                          {Math.floor(result.totalTime / 60)}:{(result.totalTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="font-medium">
                          {formatDate(result.date)}
                        </span>
                        {quizDetail?.category && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-bold">
                            {quizDetail.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                      result.score >= 0.75
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {result.score >= 0.75 ? 'Superato' : 'Non Superato'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 