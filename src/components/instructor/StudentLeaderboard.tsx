import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Star, Award, Target, Clock, ArrowRight, Search, Users, Eye, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LeaderboardEntry {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  xp: number;
  rank: number;
  previousRank: number;
  level: number;
  quizzesTaken: number;
  averageScore: number;
  pseudonym: string;
}

export function StudentLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof LeaderboardEntry;
    direction: 'asc' | 'desc';
  }>({ key: 'rank', direction: 'asc' });

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Ottieni l'email dell'istruttore corrente
      const instructorEmail = localStorage.getItem('userEmail');
      if (!instructorEmail) {
        setError('Email dell\'istruttore non trovata');
        return;
      }

      // Ottieni gli studenti associati all'istruttore corrente
      const { data: studentInstructorData, error: studentInstructorError } = await supabase
        .from('student_instructor')
        .select('student_email')
        .eq('instructor_email', instructorEmail);

      if (studentInstructorError) {
        console.error('Errore nel caricamento degli studenti associati:', studentInstructorError);
        throw studentInstructorError;
      }

      // Se non ci sono studenti associati, mostra un messaggio e termina
      if (!studentInstructorData || studentInstructorData.length === 0) {
        console.log('Nessuno studente associato a questo istruttore');
        setLeaderboard([]);
        setTotalStudents(0);
        setLoading(false);
        return;
      }

      // Estrai le email degli studenti
      const studentEmails = studentInstructorData.map(record => record.student_email);
      console.log(`Trovati ${studentEmails.length} studenti associati all'istruttore ${instructorEmail}`);

      // Ottieni i risultati dei quiz solo per gli studenti associati
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .in('student_email', studentEmails)
        .eq('is_instructor_attempt', false)
        .order('date', { ascending: false });

      if (resultsError) throw resultsError;

      if (!results || results.length === 0) {
        console.log('Nessun risultato trovato per gli studenti associati');
        setLeaderboard([]);
        setTotalStudents(0);
        setLoading(false);
        return;
      }

      const quizIds = [...new Set(results.map(r => r.quizId))].filter(Boolean);
      
      if (quizIds.length === 0) {
        setTotalStudents(0);
        return;
      }

      const studentStats = results.reduce((acc: { [key: string]: any }, curr) => {
        if (!acc[curr.student_email]) {
          acc[curr.student_email] = {
            email: curr.student_email,
            firstName: curr.first_name || '',
            lastName: curr.last_name || '',
            totalScore: 0,
            quizzesTaken: 0,
            xp: 0
          };
        }

        acc[curr.student_email].totalScore += curr.score;
        acc[curr.student_email].quizzesTaken += 1;
        acc[curr.student_email].xp += Math.round(curr.score * 1000);

        return acc;
      }, {});

      const rankings = Object.values(studentStats)
        .map((student: any) => ({
          id: student.email,
          email: student.email,
          pseudonym: student.firstName && student.lastName 
            ? `${student.firstName} ${student.lastName}`
            : `Studente${Math.floor(Math.random() * 1000)}`,
          firstName: student.firstName,
          lastName: student.lastName,
          xp: student.xp,
          quizzesTaken: student.quizzesTaken,
          averageScore: student.quizzesTaken > 0 ? student.totalScore / student.quizzesTaken : 0,
          level: Math.floor(student.xp / 1000) + 1,
          rank: 0,
          previousRank: 0
        }))
        .sort((a, b) => b.xp - a.xp);

      rankings.forEach((entry, index) => {
        entry.rank = index + 1;
        entry.previousRank = entry.rank;
      });

      setLeaderboard(rankings);
      setTotalStudents(rankings.length);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setError('Errore durante il caricamento della classifica');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof LeaderboardEntry) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedLeaderboard = React.useMemo(() => {
    const sorted = [...leaderboard].sort((a, b) => {
      if (sortConfig.key === 'rank' || sortConfig.key === 'level' || sortConfig.key === 'quizzesTaken') {
        return sortConfig.direction === 'asc' 
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      }
      
      if (sortConfig.key === 'averageScore') {
        return sortConfig.direction === 'asc'
          ? a.averageScore - b.averageScore
          : b.averageScore - a.averageScore;
      }

      const aValue = String(a[sortConfig.key]);
      const bValue = String(b[sortConfig.key]);
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });

    return sorted.filter(student => 
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [leaderboard, sortConfig, searchTerm]);

  const getRankChangeIcon = (current: number, previous: number) => {
    if (current < previous) {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    } else if (current > previous) {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getRankChangeText = (current: number, previous: number) => {
    if (current === previous) return '0';
    const diff = Math.abs(previous - current);
    return current < previous ? `+${diff}` : `-${diff}`;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Caricamento classifica...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="text-slate-900 dark:text-slate-100">Classifica Studenti</span>
        </h2>
        <div className="w-full sm:w-auto">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca studente..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-800/10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-400"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 dark:bg-slate-800/10 border border-white/30 dark:border-slate-700/30 rounded-lg p-4 hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Studenti Totali</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalStudents}</p>
        </div>

        <div className="bg-white/10 dark:bg-slate-800/10 border border-white/30 dark:border-slate-700/30 rounded-lg p-4 hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Media XP</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {Math.round(leaderboard.reduce((acc, curr) => acc + curr.xp, 0) / leaderboard.length)}
          </p>
        </div>

        <div className="bg-white/10 dark:bg-slate-800/10 border border-white/30 dark:border-slate-700/30 rounded-lg p-4 hover:scale-[1.02] transition-all">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-slate-900 dark:text-slate-100" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Livello Medio</h3>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {Math.round(leaderboard.reduce((acc, curr) => acc + curr.level, 0) / leaderboard.length)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('rank')}>
                  Posizione
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('firstName')}>
                  Nome
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hidden sm:table-cell">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('email')}>
                  Email
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('level')}>
                  Livello
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hidden md:table-cell">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('xp')}>
                  XP
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100 hidden lg:table-cell">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('averageScore')}>
                  Media
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-900 dark:text-slate-100">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 dark:divide-slate-700/30">
            {sortedLeaderboard.map((student) => (
              <tr key={student.id} className="hover:bg-white/5 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      student.rank <= 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.rank}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{student.pseudonym}</span>
                    <span className="text-sm text-gray-300 dark:text-slate-400 sm:hidden">{student.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell text-slate-900 dark:text-slate-100">
                  <span className="truncate">{student.email}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-slate-900 dark:text-slate-100">{student.level}</span>
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell text-slate-900 dark:text-slate-100">
                  <span>{student.xp.toLocaleString()}</span>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell text-slate-900 dark:text-slate-100">
                  <span>{(student.averageScore * 100).toFixed(1)}%</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {getRankChangeIcon(student.rank, student.previousRank)}
                    <span className="text-sm text-gray-300 dark:text-slate-400">
                      {getRankChangeText(student.rank, student.previousRank)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}