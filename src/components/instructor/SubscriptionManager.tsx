import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, Clock, CheckCircle2, XCircle, Search, Filter, ArrowUpDown, Bell, AlertCircle, ChevronDown, ChevronUp, Loader2, History, Key, ArrowLeft, RefreshCw, CalendarIcon } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { PLAN_NAMES } from '../../config/stripe';

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'past_due':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    case 'canceled':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    case 'incomplete':
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300';
    case 'suspended':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300';
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'active':
      return 'Attivo';
    case 'past_due':
      return 'Scaduto';
    case 'canceled':
      return 'Cancellato';
    case 'incomplete':
      return 'Incompleto';
    case 'suspended':
      return 'Sospeso';
    default:
      return 'Sconosciuto';
  }
};

export function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    plan: '',
    dateRange: ''
  });
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          access_code:access_codes (
            id,
            code,
            expiration_date,
            is_active
          ),
          user:auth_users (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subs || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      setError('Errore durante il caricamento degli abbonamenti');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const filteredSubscriptions = subscriptions
    .filter(subscription =>
      (subscription.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       subscription.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       subscription.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filters.status || subscription.status === filters.status) &&
      (!filters.plan || subscription.plan_id.includes(filters.plan))
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return 0;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white dark:text-slate-100">Gestione Abbonamenti</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca abbonamenti..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti gli stati</option>
                <option value="active">Attivo</option>
                <option value="past_due">Scaduto</option>
                <option value="canceled">Cancellato</option>
                <option value="incomplete">Incompleto</option>
                <option value="suspended">Sospeso</option>
              </select>

              <select
                value={filters.plan}
                onChange={(e) => setFilters(prev => ({ ...prev, plan: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti i piani</option>
                {Object.entries(PLAN_NAMES).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('customer_email')}>
                    Utente
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Piano</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Stato</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('current_period_end')}>
                    Scadenza
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Codice</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium dark:text-slate-100">
                        {subscription.user?.first_name} {subscription.user?.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{subscription.customer_email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                      {PLAN_NAMES[subscription.plan_id] || 'Piano Sconosciuto'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-sm ${getStatusColor(subscription.status)}`}>
                      {getStatusText(subscription.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                    {formatDate(subscription.current_period_end)}
                  </td>
                  <td className="px-6 py-4">
                    {subscription.access_code ? (
                      <div>
                        <p className="font-medium dark:text-slate-100">{subscription.access_code.code}</p>
                        {subscription.access_code.expiration_date && (
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            Scade: {formatDate(subscription.access_code.expiration_date)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {/* TODO: Implement plan change */}}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Modifica Piano"
                      >
                        <CreditCard className="w-5 h-5" />
                      </button>

                      {subscription.status === 'suspended' ? (
                        <button
                          onClick={() => {/* TODO: Implement reactivation */}}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Riattiva Abbonamento"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {/* TODO: Implement suspension */}}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Sospendi Abbonamento"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
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