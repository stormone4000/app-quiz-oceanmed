import React, { useState, useEffect } from 'react';
import { Users, Target, Award, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface DashboardStat {
  tipo_utente: string;
  totale: number;
  attivi_ultimi_7_giorni: number;
  quiz_completati: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Tentativo di caricare statistiche dashboard con query dirette");

      // Invece di usare la funzione RPC, eseguiamo direttamente le query
      // 1. Otteniamo le statistiche degli istruttori
      const { data: instructorData, error: instructorError } = await supabase
        .from('auth_users')
        .select('count')
        .eq('is_instructor', true);
      
      if (instructorError) {
        console.error('Errore nel caricamento degli istruttori:', instructorError);
        throw instructorError;
      }

      // 2. Otteniamo le statistiche degli istruttori attivi negli ultimi 7 giorni
      const { data: activeInstructorData, error: activeInstructorError } = await supabase
        .from('auth_users')
        .select('count')
        .eq('is_instructor', true)
        .gte('last_login', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (activeInstructorError) {
        console.error('Errore nel caricamento degli istruttori attivi:', activeInstructorError);
        throw activeInstructorError;
      }

      // 3. Otteniamo le statistiche degli studenti
      const { data: studentData, error: studentError } = await supabase
        .from('auth_users')
        .select('count')
        .eq('is_instructor', false)
        .eq('is_master_admin', false);
      
      if (studentError) {
        console.error('Errore nel caricamento degli studenti:', studentError);
        throw studentError;
      }

      // 4. Otteniamo le statistiche degli studenti attivi negli ultimi 7 giorni
      const { data: activeStudentData, error: activeStudentError } = await supabase
        .from('auth_users')
        .select('count')
        .eq('is_instructor', false)
        .eq('is_master_admin', false)
        .gte('last_login', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      if (activeStudentError) {
        console.error('Errore nel caricamento degli studenti attivi:', activeStudentError);
        throw activeStudentError;
      }

      // 5. Otteniamo il numero totale di quiz completati
      const { data: quizData, error: quizError } = await supabase
        .from('results')
        .select('count');
      
      if (quizError) {
        console.error('Errore nel caricamento dei quiz completati:', quizError);
        throw quizError;
      }

      // Creiamo le statistiche
      const newStats: DashboardStat[] = [
          {
            tipo_utente: 'Istruttori Paganti',
          totale: instructorData?.[0]?.count || 0,
          attivi_ultimi_7_giorni: activeInstructorData?.[0]?.count || 0,
            quiz_completati: 0
          },
          {
            tipo_utente: 'Studenti Iscritti',
          totale: studentData?.[0]?.count || 0,
          attivi_ultimi_7_giorni: activeStudentData?.[0]?.count || 0,
          quiz_completati: quizData?.[0]?.count || 0
          }
        ];

      console.log("Statistiche caricate con successo:", newStats);
      setStats(newStats);
    } catch (error) {
      console.error('Errore durante il caricamento delle statistiche:', error);
      setError('Errore durante il caricamento delle statistiche');
      
      // In caso di errore, utilizziamo dati di esempio
      console.log("Errore nel caricamento, utilizzo dati mock");
      const mockStats: DashboardStat[] = [
        {
          tipo_utente: 'Istruttori Paganti',
          totale: 3,
          attivi_ultimi_7_giorni: 2,
          quiz_completati: 0
        },
        {
          tipo_utente: 'Studenti Iscritti',
          totale: 1,
          attivi_ultimi_7_giorni: 1,
          quiz_completati: 5
        }
      ];
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded relative mb-4">
        <strong className="font-bold">Errore!</strong>
        <span className="block sm:inline"> {error}</span>
      </div>
    );
  }

  // Se non ci sono dati, mostriamo statistiche di esempio
  if (!stats || stats.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Statistiche Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg shadow-inner dark:shadow-none">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Istruttori Paganti</h3>
            </div>
            <p className="text-3xl font-bold text-white">0</p>
            <div className="mt-2 flex justify-between text-sm text-white/70">
              <span>Attivi ultimi 7 giorni: 0</span>
            </div>
          </div>

          <div className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-inner dark:shadow-none">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Studenti Iscritti</h3>
            </div>
            <p className="text-3xl font-bold text-white">0</p>
            <div className="mt-2 flex justify-between text-sm text-white/70">
              <span>Attivi ultimi 7 giorni: 0</span>
              <span>Quiz completati: 0</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Statistiche Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat) => (
          <div key={stat.tipo_utente} className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 p-6 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 ${stat.tipo_utente === 'Istruttori Paganti' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'} rounded-lg shadow-inner dark:shadow-none`}>
                <Users className={`w-6 h-6 ${stat.tipo_utente === 'Istruttori Paganti' ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`} />
              </div>
              <h3 className="text-lg font-semibold text-white">{stat.tipo_utente}</h3>
            </div>
            <p className="text-3xl font-bold text-white">{stat.totale}</p>
            <div className="mt-2 flex justify-between text-sm text-white/70">
              <span>Attivi ultimi 7 giorni: {stat.attivi_ultimi_7_giorni}</span>
              {stat.tipo_utente === 'Studenti Iscritti' && (
                <span>Quiz completati: {stat.quiz_completati}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 