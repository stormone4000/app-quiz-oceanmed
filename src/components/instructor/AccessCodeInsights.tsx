import React, { useState, useEffect } from 'react';
import { Key, Users, CheckCircle2, XCircle, Calendar, Search, ArrowUpDown, Activity, CheckSquare } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

interface AccessCodeStats {
  totalCodes: number;
  usedCodes: number;
  unusedCodes: number;
  usageByMonth: {
    [key: string]: number;
  };
  usageByInstructor: {
    [key: string]: number;
  };
}

// Importo l'interfaccia CodeUsage
interface CodeUsage {
  code: string;
  type: 'master' | 'one_time';
  used_at: string;
  expires_at?: string;
  is_active?: boolean;
}

export function AccessCodeInsights() {
  const [stats, setStats] = useState<AccessCodeStats>({
    totalCodes: 0,
    usedCodes: 0,
    unusedCodes: 0,
    usageByMonth: {},
    usageByInstructor: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all access codes
      const { data: codes, error: codesError } = await supabase
        .from('access_codes')
        .select(`
          *,
          usage:access_code_usage(*)
        `);

      if (codesError) throw codesError;

      // Calculate statistics
      const stats: AccessCodeStats = {
        totalCodes: codes?.length || 0,
        usedCodes: 0,
        unusedCodes: 0,
        usageByMonth: {},
        usageByInstructor: {}
      };

      codes?.forEach(code => {
        const usageCount = code.usage?.length || 0;
        if (usageCount > 0) {
          stats.usedCodes++;
          
          // Count usage by month
          code.usage.forEach((use: CodeUsage) => {
            const month = new Date(use.used_at).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
            stats.usageByMonth[month] = (stats.usageByMonth[month] || 0) + 1;
          });

          // Count usage by instructor
          if (code.created_by) {
            stats.usageByInstructor[code.created_by] = (stats.usageByInstructor[code.created_by] || 0) + usageCount;
          }
        } else {
          stats.unusedCodes++;
        }
      });

      setStats(stats);
    } catch (error) {
      console.error('Error loading access code stats:', error);
      setError('Errore durante il caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  };

  const pieData = {
    labels: ['Utilizzati', 'Non Utilizzati'],
    datasets: [{
      data: [stats.usedCodes, stats.unusedCodes],
      backgroundColor: ['#22c55e', '#ef4444'],
      borderColor: ['#16a34a', '#dc2626'],
      borderWidth: 1
    }]
  };

  const barData = {
    labels: Object.keys(stats.usageByMonth),
    datasets: [{
      label: 'Codici Utilizzati per Mese',
      data: Object.values(stats.usageByMonth),
      backgroundColor: '#3b82f6'
    }]
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Statistiche Codici di Accesso</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Codici Totali</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalCodes}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Tasso di Utilizzo</h3>
          </div>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {stats.totalCodes > 0 
              ? `${((stats.usedCodes / stats.totalCodes) * 100).toFixed(1)}%`
              : '0%'
            }
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Codici Attivi</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.unusedCodes}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribuzione Utilizzo</h3>
          <div className="h-64">
            <Pie 
              data={pieData} 
              options={{ 
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#334155'
                    }
                  }
                } 
              }} 
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Trend Utilizzo Mensile</h3>
          <div className="h-64">
            <Bar 
              data={barData} 
              options={{
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                      color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                    },
                    grid: {
                      color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                  },
                  x: {
                    ticks: {
                      color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                    },
                    grid: {
                      color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                  }
                },
                plugins: {
                  legend: {
                    labels: {
                      color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#334155'
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}