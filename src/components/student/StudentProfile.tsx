import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Star, Award, Target, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../../services/supabase';
import confetti from 'canvas-confetti';

interface LeaderboardEntry {
  id: string;
  pseudonym: string;
  firstName?: string;
  lastName?: string;
  xp: number;
  rank: number;
  previousRank: number;
  level: number;
}

interface StudentProfileProps {
  studentEmail: string;
}

export function StudentProfile({ studentEmail }: StudentProfileProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<{
    rank: number;
    totalParticipants: number;
    xp: number;
    level: number;
    xpToNextLevel: number;
    previousRank: number;
    firstName?: string;
    lastName?: string;
  }>({
    rank: 0,
    totalParticipants: 0,
    xp: 0,
    level: 1,
    xpToNextLevel: 1000,
    previousRank: 0
  });

  useEffect(() => {
    loadLeaderboardData();
  }, [studentEmail]);

  const loadLeaderboardData = async () => {
    try {
      console.log("Caricamento dati leaderboard per email:", studentEmail);
      
      // Otteniamo i dati dell'utente dal localStorage
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      
      let userData = { first_name: firstName, last_name: lastName };
      
      // Se non abbiamo i dati nel localStorage, proviamo a ottenerli dal database
      if (!firstName && !lastName) {
        // Get user details first
        const { data: dbUserData, error: userError } = await supabase
          .from('auth_users')
          .select('first_name, last_name')
          .eq('email', studentEmail)
          .maybeSingle();

        if (userError) {
          console.warn('Errore nel recupero dei dettagli utente:', userError);
          // Continuiamo senza dettagli utente
        } else if (!dbUserData) {
          console.log('Nessun dettaglio utente trovato per email:', studentEmail);
          // Continuiamo senza dettagli utente
        } else {
          console.log('Dettagli utente trovati:', dbUserData);
          userData = dbUserData;
          
          // Salviamo i dati nel localStorage per usi futuri
          if (dbUserData.first_name) localStorage.setItem('firstName', dbUserData.first_name);
          if (dbUserData.last_name) localStorage.setItem('lastName', dbUserData.last_name);
        }
      } else {
        console.log('Dettagli utente trovati nel localStorage:', { firstName, lastName });
      }

      // Get total XP for each student
      const { data: xpData, error: xpError } = await supabase
        .from('results')
        .select(`
          student_email,
          score,
          first_name,
          last_name
        `);

      if (xpError) {
        console.error('Errore nel recupero dei risultati:', xpError);
        // Impostiamo uno stato predefinito in caso di errore
        setLeaderboard([]);
        setUserStats({
          rank: 0,
          totalParticipants: 0,
          xp: 0,
          level: 1,
          xpToNextLevel: 1000,
          previousRank: 0,
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        });
        return; // Usciamo dalla funzione se non possiamo recuperare i risultati
      }

      console.log('Risultati recuperati:', xpData?.length || 0);

      // Se non ci sono risultati, impostiamo uno stato predefinito
      if (!xpData || xpData.length === 0) {
        console.log('Nessun risultato trovato nella tabella results');
        setLeaderboard([]);
        setUserStats({
          rank: 0,
          totalParticipants: 0,
          xp: 0,
          level: 1,
          xpToNextLevel: 1000,
          previousRank: 0,
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        });
        return;
      }

      // Calculate XP and rankings
      const xpMap = xpData.reduce((acc: { [key: string]: any }, curr) => {
        if (!curr.student_email) return acc; // Ignoriamo record senza email
        
        const xp = Math.round(curr.score * 1000);
        if (!acc[curr.student_email]) {
          acc[curr.student_email] = {
            xp: 0,
            firstName: curr.first_name,
            lastName: curr.last_name
          };
        }
        acc[curr.student_email].xp += xp;
        return acc;
      }, {});

      // Se non ci sono dati validi dopo il filtraggio
      if (Object.keys(xpMap).length === 0) {
        console.log('Nessun dato valido dopo il filtraggio');
        setLeaderboard([]);
        setUserStats({
          rank: 0,
          totalParticipants: 0,
          xp: 0,
          level: 1,
          xpToNextLevel: 1000,
          previousRank: 0,
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        });
        return;
      }

      // Convert to array and sort by XP
      const rankings = Object.entries(xpMap)
        .map(([email, data]: [string, any]) => ({
          id: email,
          pseudonym: `Studente${Math.floor(Math.random() * 1000)}`,
          firstName: data.firstName,
          lastName: data.lastName,
          xp: data.xp,
          rank: 0,
          previousRank: 0,
          level: Math.floor(data.xp / 1000) + 1
        }))
        .sort((a, b) => b.xp - a.xp);

      // Assign ranks
      rankings.forEach((entry, index) => {
        entry.rank = index + 1;
        entry.previousRank = entry.rank;
      });

      // Get user's stats
      const userRanking = rankings.find(r => r.id === studentEmail);
      if (userRanking) {
        const newRank = userRanking.rank;
        const oldRank = userStats.rank;

        if (oldRank > 0 && newRank < oldRank) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });

          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
          audio.play().catch(console.error);
        }

        setUserStats({
          rank: newRank,
          totalParticipants: rankings.length,
          xp: userRanking.xp,
          level: userRanking.level,
          xpToNextLevel: (userRanking.level + 1) * 1000 - userRanking.xp,
          previousRank: oldRank || newRank,
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        });
      } else {
        // L'utente non ha ancora risultati
        console.log('Utente non trovato nella leaderboard:', studentEmail);
        setUserStats({
          rank: 0,
          totalParticipants: rankings.length,
          xp: 0,
          level: 1,
          xpToNextLevel: 1000,
          previousRank: 0,
          firstName: userData.first_name || '',
          lastName: userData.last_name || ''
        });
      }

      // Anche se l'utente non ha risultati, mostriamo comunque la leaderboard
      setLeaderboard(rankings.slice(0, 10));
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      // In caso di errore, impostiamo stati predefiniti
      setLeaderboard([]);
      
      // Otteniamo i dati dell'utente dal localStorage per il fallback
      const firstName = localStorage.getItem('firstName') || '';
      const lastName = localStorage.getItem('lastName') || '';
      
      setUserStats({
        rank: 0,
        totalParticipants: 0,
        xp: 0,
        level: 1,
        xpToNextLevel: 1000,
        previousRank: 0,
        firstName: firstName,
        lastName: lastName
      });
    }
  };

  const getRankChangeIcon = (current: number, previous: number) => {
    if (current < previous) {
      return <TrendingUp className="w-5 h-5 text-green-500" />;
    } else if (current > previous) {
      return <TrendingDown className="w-5 h-5 text-red-500" />;
    }
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getOrdinalSuffix = (n: number) => {
    return `${n}°`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* User Stats Card */}
      <div className="bg-blue-100 dark:bg-violet-800/20 backdrop-blur-lg border border-blue-200 dark:border-violet-100/30 rounded-xl p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Posizione</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {getOrdinalSuffix(userStats.rank)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              su {userStats.totalParticipants} partecipanti
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Livello {userStats.level}</h3>
            </div>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-300">
                    {userStats.xp} XP
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-blue-600 dark:text-blue-300">
                    {userStats.xpToNextLevel} XP al prossimo livello
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200 dark:bg-blue-900/20">
                <div
                  style={{ width: `${(userStats.xp % 1000) / 10}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 dark:bg-blue-400 transition-all duration-500"
                />
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Traguardi</h3>
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {Math.floor(userStats.xp / 100)}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">Traguardi sbloccati</p>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-blue-100 dark:bg-violet-800/20 backdrop-blur-lg border border-blue-200 dark:border-violet-100/30 rounded-xl p-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
          </div>
          <span className="text-slate-800 dark:text-slate-100">Top 10 Classifica</span>
        </h2>

        <div className="space-y-4">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex items-center justify-between p-4 rounded-lg transition-colors border ${
                entry.id === studentEmail
                  ? 'bg-blue-200/50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  : 'hover:bg-blue-50 dark:hover:bg-slate-700/30 border-blue-100 dark:border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-slate-600 dark:text-slate-400 w-8">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {entry.id === studentEmail 
                      ? `${userStats.firstName} ${userStats.lastName}`
                      : entry.pseudonym}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Livello {entry.level}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{entry.xp} XP</p>
                  <div className="flex items-center justify-end gap-1 text-sm text-slate-600 dark:text-slate-400">
                    {getRankChangeIcon(entry.rank, entry.previousRank)}
                    <span>
                      {entry.rank === entry.previousRank
                        ? 'Nessun cambiamento'
                        : entry.rank < entry.previousRank
                        ? `Su di ${entry.previousRank - entry.rank}`
                        : `Giù di ${entry.rank - entry.previousRank}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {userStats.rank > 10 && (
          <div className="mt-6 p-4 border-t border-blue-200 dark:border-slate-700">
            <div className="flex items-center justify-between bg-blue-50 dark:bg-slate-800/50 p-4 rounded-lg border border-blue-200 dark:border-slate-700">
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-slate-600 dark:text-slate-400 w-8">
                  {userStats.rank}
                </span>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {userStats.firstName} {userStats.lastName}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Livello {userStats.level}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="font-medium text-slate-800 dark:text-slate-100">{userStats.xp} XP</p>
                  <div className="flex items-center justify-end gap-1 text-sm text-slate-600 dark:text-slate-400">
                    {getRankChangeIcon(userStats.rank, userStats.previousRank)}
                    <span>
                      {userStats.rank === userStats.previousRank
                        ? 'Nessun cambiamento'
                        : userStats.rank < userStats.previousRank
                        ? `Su di ${userStats.previousRank - userStats.rank}`
                        : `Giù di ${userStats.rank - userStats.previousRank}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}