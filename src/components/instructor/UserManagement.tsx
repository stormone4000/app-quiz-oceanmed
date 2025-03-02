import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, Search, Filter, ArrowUpDown, Trash2, AlertCircle, Bell, Eye, XCircle, RefreshCw, Download, FileDown, Clock, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DeleteModal } from '../common/DeleteModal';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_instructor: boolean;
  account_status: 'active' | 'suspended';
  subscription_status: string;
  last_login: string;
  created_at: string;
}

// Estendi il tipo SupabaseUser per includere banned_until
interface AdminUser extends SupabaseUser {
  banned_until?: string | null;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Utilizziamo la funzione RPC sicura
      const { data: users, error: usersError } = await supabase
        .rpc('get_all_users');

      if (usersError) {
        console.error('Errore RPC:', usersError);
        throw usersError;
      }
      
      if (!users || users.length === 0) {
        // Se non ci sono utenti dalla funzione RPC, proviamo a caricarli direttamente
        const { data: directUsers, error: directError } = await supabase
          .from('auth.users')
          .select('*');
          
        if (directError) {
          console.error('Errore caricamento diretto:', directError);
          throw directError;
        }
        
        if (directUsers && directUsers.length > 0) {
          // Trasformiamo i dati nel formato atteso
          const formattedUsers = directUsers.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.raw_user_meta_data?.first_name || '',
            last_name: user.raw_user_meta_data?.last_name || '',
            is_instructor: user.raw_app_meta_data?.is_instructor || false,
            account_status: user.banned_until ? 'suspended' as const : 'active' as const,
            subscription_status: 'inactive',
            last_login: user.last_sign_in_at || user.created_at,
            created_at: user.created_at
          }));
          
          setUsers(formattedUsers);
        } else {
          setUsers([]);
        }
      } else {
        setUsers(users);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Errore durante il caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get user email first
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Utente non trovato');
      }

      // Utilizziamo la funzione RPC sicura
      const { error: deleteError } = await supabase
        .rpc('delete_user', { user_id: userId });

      if (deleteError) throw deleteError;

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      setShowDeleteModal(null);

      // Show success message
      setError('Utente eliminato con successo');
      setTimeout(() => setError(null), 3000);

    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'eliminazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      setLoading(true);
      setError(null);

      // Utilizziamo la funzione RPC sicura
      const { error: updateError } = await supabase
        .rpc('toggle_user_suspension', { 
          user_id: userId,
          suspend: suspend
        });

      if (updateError) throw updateError;

      // Aggiorniamo lo stato locale
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, account_status: suspend ? 'suspended' : 'active' }
          : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Errore durante l\'aggiornamento dello stato dell\'utente');
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

  const filteredUsers = users
    .filter(user =>
      (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filters.role || (filters.role === 'instructor' ? user.is_instructor : !user.is_instructor)) &&
      (!filters.status || user.account_status === filters.status)
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortConfig.direction === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      
      return 0;
    });

  const handleSort = (key: keyof User) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white dark:text-slate-100">Gestione Utenti</h2>
        <button 
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {error && (
        <div className={`p-4 rounded-lg ${error.includes('successo') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          <div className="flex items-center gap-2">
            {error.includes('successo') ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca utenti..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti i ruoli</option>
                <option value="instructor">Istruttori</option>
                <option value="student">Studenti</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti gli stati</option>
                <option value="active">Attivo</option>
                <option value="suspended">Sospeso</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('email')}>
                    Utente
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Ruolo</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Stato</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('last_login')}>
                    Ultimo Accesso
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium dark:text-slate-100">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_instructor
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {user.is_instructor ? 'Istruttore' : 'Studente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.account_status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.account_status === 'active' ? 'Attivo' : 'Sospeso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                    {formatDate(user.last_login)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSuspendUser(user.id, user.account_status === 'active')}
                        className={`p-2 ${
                          user.account_status === 'active'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        } rounded-lg transition-colors`}
                        title={user.account_status === 'active' ? 'Sospendi Account' : 'Riattiva Account'}
                      >
                        {user.account_status === 'active' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => setShowDeleteModal({ id: user.id, name: `${user.first_name} ${user.last_name}` })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Elimina Account"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {loading && users.length === 0 && (
        <div className="flex justify-center items-center p-8">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-500 dark:text-slate-400">Caricamento utenti in corso...</p>
          </div>
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="flex justify-center items-center p-8">
          <div className="flex flex-col items-center gap-4">
            <User className="w-8 h-8 text-gray-400" />
            <p className="text-gray-500 dark:text-slate-400">Nessun utente trovato</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          title="Elimina Account Utente"
          message={`Sei sicuro di voler eliminare l'account di ${showDeleteModal.name}? Questa azione non può essere annullata.`}
          onConfirm={() => handleDeleteUser(showDeleteModal.id)}
          onCancel={() => setShowDeleteModal(null)}
          isLoading={loading}
        />
      )}
    </div>
  );
}