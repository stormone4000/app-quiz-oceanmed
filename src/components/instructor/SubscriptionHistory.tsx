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
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
        <div className="p-6 text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="mt-2 text-gray-500">Caricamento storico...</p>
        </div>
      ) : error ? (
        <div className="p-6 text-center text-red-500">
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          Nessuna modifica trovata per questo abbonamento
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-8 w-0.5 bg-gray-200" />
          <div className="divide-y divide-gray-200">
            {history.map((change, index) => (
              <div key={change.id} className="p-6 relative">
                <div className="flex items-start gap-4">
                  <div className={`relative z-10 p-2 rounded-full ${getChangeTypeColor(change.change_type)}`}>
                    {change.change_type === 'created' && <CreditCard className="w-5 h-5" />}
                    {change.change_type === 'updated' && <RefreshCw className="w-5 h-5" />}
                    {change.change_type === 'canceled' && <Clock className="w-5 h-5" />}
                    {change.change_type === 'renewed' && <ArrowRight className="w-5 h-5" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {getChangeTypeLabel(change.change_type)}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatDate(change.date)}
                      </span>
                    </div>

                    {change.old_plan && change.new_plan && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                        <span>{change.old_plan}</span>
                        <ArrowRight className="w-4 h-4" />
                        <span>{change.new_plan}</span>
                      </div>
                    )}

                    {change.change_type === 'renewed' && (
                      <p className="mt-2 text-sm text-gray-600">
                        Abbonamento rinnovato automaticamente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}