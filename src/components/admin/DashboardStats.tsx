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

      // Eseguiamo la query direttamente invece di usare una vista
      const { data, error: queryError } = await supabase.rpc('get_dashboard_stats');

      if (queryError) throw queryError;
      setStats(data || []);
    } catch (error) {
      console.error('Errore durante il caricamento delle statistiche:', error);
      setError('Errore durante il caricamento delle statistiche');
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