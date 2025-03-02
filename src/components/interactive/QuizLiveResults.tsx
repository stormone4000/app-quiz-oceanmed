import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Calendar, Users, Target, Clock, Trophy, Download, BarChart, Filter, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Bar } from 'react-chartjs-2';

interface QuizResult {
  id: string;
  session_id: string;
  quiz_id: string;
  host_email: string;
  total_participants: number;
  average_score: number;
  completion_rate: number;
  duration_minutes: number;
  created_at: string;
  quiz: {
    title: string;
    description: string;
  };
  session: {
    participants: {
      nickname: string;
      score: number;
      answers: any[];
    }[];
  };
}

interface QuizLiveResultsProps {
  onBack: () => void;
  hostEmail: string;
}

export function QuizLiveResults({ onBack, hostEmail }: QuizLiveResultsProps) {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof QuizResult;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => {
    loadResults();
  }, [hostEmail]);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading results for host:', hostEmail);

      const { data, error: resultsError } = await supabase
        .from('live_quiz_results')
        .select(`
          *,
          quiz:interactive_quiz_templates!left(
            title,
            description
          ),
          session:live_quiz_sessions!left(
            participants:live_quiz_participants(
              nickname,
              score,
              answers
            )
          )
        `)
        .eq('host_email', hostEmail)
        .order('created_at', { ascending: false });

      if (resultsError) {
        console.error('Error fetching results:', resultsError);
        throw resultsError;
      }

      console.log('Fetched results:', data);
      setResults(data || []);
    } catch (error) {
      console.error('Error loading quiz results:', error);
      setError('Errore durante il caricamento dei risultati');
    } finally {
      setLoading(false);
    }
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

  const handleSort = (key: keyof QuizResult) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredResults = results
    .filter(result =>
      result.quiz?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.quiz_id?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

  const renderDetailView = (result: QuizResult) => {
    const participantScores = result.session.participants.map(p => ({
      nickname: p.nickname,
      score: p.score,
      answers: p.answers || [],
      correctAnswers: p.answers.filter(a => a.isCorrect).length,
      totalAnswers: p.answers.length
    }));

    const scoreDistribution = Array(10).fill(0);
    participantScores.forEach(p => {
      const bucket = Math.min(9, Math.floor(p.score / 10));
      scoreDistribution[bucket]++;
    });

    const chartData = {
      labels: ['0-10%', '11-20%', '21-30%', '31-40%', '41-50%', '51-60%', '61-70%', '71-80%', '81-90%', '91-100%'],
      datasets: [{
        label: 'Distribuzione Punteggi',
        data: scoreDistribution,
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        borderWidth: 1
      }]
    };

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedResult(null)}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna alla lista
        </button>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-2">{result.quiz.title}</h2>
          <p className="text-gray-600 mb-6">{result.quiz.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium">Partecipanti</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {result.total_participants}
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-green-600" />
                <h3 className="font-medium">Media Punteggi</h3>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {result.average_score.toFixed(1)}%
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-5 h-5 text-purple-600" />
                <h3 className="font-medium">Completamento</h3>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {result.completion_rate.toFixed(1)}%
              </p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium">Durata</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-600">
                {result.duration_minutes} min
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Distribuzione Punteggi</h3>
              <div className="h-64">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Numero di Partecipanti'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Dettaglio Partecipanti</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Posizione</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Nickname</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Punteggio</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Risposte Corrette</th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Dettaglio Risposte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {participantScores
                      .sort((a, b) => b.score - a.score)
                      .map((participant, index) => (
                        <tr key={participant.nickname} className="hover:bg-gray-50 group">
                          <td className="px-6 py-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-50 text-blue-800'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium">{participant.nickname}</td>
                          <td className="px-6 py-4">{participant.score}%</td>
                          <td className="px-6 py-4">
                            {participant.correctAnswers}/{participant.totalAnswers}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1">
                              {participant.answers.map((answer, answerIndex) => (
                                <div
                                  key={answerIndex}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border ${
                                    answer.isCorrect
                                      ? 'bg-green-100 border-green-200 text-green-700'
                                      : 'bg-red-100 border-red-200 text-red-700'
                                  } group-hover:scale-110 transition-transform`}
                                  title={`Domanda ${answerIndex + 1}: ${answer.isCorrect ? 'Corretta' : 'Errata'} - ${(answer.timeMs / 1000).toFixed(1)}s`}
                                >
                                  {answerIndex + 1}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (selectedResult) {
    return renderDetailView(selectedResult);
  }
  
  if (showLeaderboard && selectedSession) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setShowLeaderboard(false);
            setSelectedSession(null);
          }}
          className="text-white hover:text-blue-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna ai Risultati
        </button>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Classifica Quiz
          </h2>

          <div className="space-y-4">
            {selectedSession.session.participants
              .sort((a: any, b: any) => (b.score || 0) - (a.score || 0))
              .map((participant: any, index: number) => (
                <div
                  key={participant.nickname}
                  className={`p-4 rounded-lg ${
                    index === 0 ? 'bg-yellow-50 border border-yellow-200' :
                    index === 1 ? 'bg-gray-50 border border-gray-200' :
                    index === 2 ? 'bg-amber-50 border border-amber-200' :
                    'bg-white border border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-800' :
                        index === 2 ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-50 text-blue-800'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{participant.nickname}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Target className="w-4 h-4" />
                            {participant.score || 0}%
                          </span>
                          {participant.answers?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {Math.round(participant.answers.reduce((acc: number, curr: any) => 
                                acc + curr.timeMs, 0) / 1000)}s
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="text-white hover:text-blue-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna a Quiz Live
        </button>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca quiz..."
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Risultati Quiz Live</h2>
            <button
              onClick={() => {/* TODO: Export results */}}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Esporta Risultati
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('created_at')}>
                    Data
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Quiz</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('total_participants')}>
                    Partecipanti
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('average_score')}>
                    Media
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('completion_rate')}>
                    Completamento
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredResults.map((result) => (
                <tr key={result.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500">
                    {formatDate(result.created_at)}
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium">
                        {result.quiz?.title || `Quiz ID: ${result.quiz_id}`}
                      </p>
                      {result.quiz?.description && (
                        <p className="text-sm text-gray-600">{result.quiz.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>{result.total_participants}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-blue-600">
                      {result.average_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-green-600">
                      {result.completion_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedResult(result)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Visualizza dettagli"
                    >
                      <BarChart className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSession(result);
                        setShowLeaderboard(true);
                      }}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors ml-2"
                      title="Visualizza classifica"
                    >
                      <Trophy className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}