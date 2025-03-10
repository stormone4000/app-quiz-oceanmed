import React, { useState } from 'react';
import { Calendar, CreditCard, ArrowRight, ArrowLeft, History, RefreshCw, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface SubscriptionChange {
  id: string;
  subscription_id: string;
  change_type: 'created' | 'updated' | 'canceled' | 'renewed';
  old_plan?: string;
  new_plan?: string;
  date: string;
}

interface SubscriptionHistoryProps {
  customerEmail: string;
  onClose: () => void;
}

export function SubscriptionHistory({ customerEmail, onClose }: SubscriptionHistoryProps) {
  const [history, setHistory] = useState<SubscriptionChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    loadHistory();
  }, [customerEmail]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: changes, error: changesError } = await supabase
        .from('subscription_changes')
        .select('*')
        .eq('customer_email', customerEmail)
        .order('date', { ascending: false });

      if (changesError) throw changesError;
      setHistory(changes || []);
    } catch (error) {
      console.error('Error loading subscription history:', error);
      setError('Errore durante il caricamento dello storico abbonamenti');
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

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'created': return 'Attivazione';
      case 'updated': return 'Modifica';
      case 'canceled': return 'Cancellazione';
      case 'renewed': return 'Rinnovo';
      default: return type;
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'text-green-600 bg-green-50';
      case 'updated': return 'text-blue-600 bg-blue-50';
      case 'canceled': return 'text-red-600 bg-red-50';
      case 'renewed': return 'text-purple-600 bg-purple-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Storico Abbonamento</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Torna indietro
          </button>
        </div>
        <p className="text-gray-600 mt-2">{customerEmail}</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Errore!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 px-4 py-8 rounded-lg text-center">
          <Calendar className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Nessuna cronologia disponibile</p>
          <p className="text-sm">Non sono stati trovati dati di abbonamento per questo utente.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800 text-left">
                <tr>
                  <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Data</th>
                  <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Piano</th>
                  <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Modifica</th>
                  <th className="px-6 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Scadenza</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {history.map((item) => (
                  <tr key={item.id} className="text-gray-700 dark:text-gray-300">
                    <td className="px-6 py-4 text-sm">
                      {new Date(item.created_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.plan_id || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        item.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : item.status === 'canceled' 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {item.status === 'active' ? 'Attivo' : 
                         item.status === 'canceled' ? 'Cancellato' : 
                         item.status === 'pending' ? 'In attesa' : 
                         item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.change_type === 'created' ? 'Creato' :
                       item.change_type === 'updated' ? (
                        <>
                          Aggiornato
                          {item.old_plan && item.new_plan && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 block">
                              da {item.old_plan} a {item.new_plan}
                            </span>
                          )}
                        </>
                       ) :
                       item.change_type === 'deleted' ? 'Cancellato' : 
                       item.change_type}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.expires_at ? new Date(item.expires_at).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}