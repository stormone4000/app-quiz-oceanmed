import React, { useState, useEffect } from 'react';
import { Plus, Search, Calendar, AlertCircle, Bell, Trash2, Edit, Save, X, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DeleteModal } from '../common/DeleteModal';

interface Notification {
  id: string;
  title: string;
  content: string;
  category: 'announcement' | 'event' | 'alert';
  is_important: boolean;
  created_at: string;
  expires_at: string | null;
}

interface NotificationForm {
  title: string;
  content: string;
  category: 'announcement' | 'event' | 'alert';
  is_important: boolean;
  expires_at: string | null;
}

export function NotificationManager() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Notification;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });
  const [form, setForm] = useState<NotificationForm>({
    title: '',
    content: '',
    category: 'announcement',
    is_important: false,
    expires_at: null
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifError) throw notifError;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Errore durante il caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!form.title.trim()) {
        throw new Error('Il titolo è obbligatorio');
      }

      if (form.title.length > 100) {
        throw new Error('Il titolo non può superare i 100 caratteri');
      }

      const notificationData = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        is_important: form.is_important,
        expires_at: form.expires_at
      };

      if (editingNotification) {
        const { error: updateError } = await supabase
          .from('notifications')
          .update(notificationData)
          .eq('id', editingNotification.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert([notificationData]);

        if (insertError) throw insertError;
      }

      await loadNotifications();
      setShowModal(false);
      setEditingNotification(null);
      setForm({
        title: '',
        content: '',
        category: 'announcement',
        is_important: false,
        expires_at: null
      });
    } catch (error) {
      console.error('Error saving notification:', error);
      setError(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (deleteError) throw deleteError;

      await loadNotifications();
      setDeleteModal(null);
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError('Errore durante l\'eliminazione della notifica');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: keyof Notification) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
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

  const filteredNotifications = notifications
    .filter(notification =>
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.content.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-3xl font-light text-white dark:text-slate-50">Gestione Notifiche</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca notifiche..."
              className="pl-10 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-800/10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-400"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Notifica
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50/20 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-white dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('title')}>
                    Titolo
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('category')}>
                    Categoria
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('is_important')}>
                    Importante
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('created_at')}>
                    Data Creazione
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('expires_at')}>
                    Scadenza
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-white dark:text-slate-100">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 dark:divide-slate-700/30">
              {filteredNotifications.map(notification => (
                <tr key={notification.id} className="hover:bg-white/5 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Bell className={`w-5 h-5 ${
                        notification.is_important ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <span className="font-medium text-white dark:text-slate-100">{notification.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      notification.category === 'announcement'
                        ? 'bg-blue-100/30 text-blue-100'
                        : notification.category === 'event'
                        ? 'bg-green-100/30 text-green-100'
                        : 'bg-red-100/30 text-red-100'
                    }`}>
                      {notification.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {notification.is_important ? (
                      <span className="text-red-400">Sì</span>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-300 dark:text-slate-400">
                    {formatDate(notification.created_at)}
                  </td>
                  <td className="px-6 py-4 text-gray-300 dark:text-slate-400">
                    {notification.expires_at
                      ? formatDate(notification.expires_at)
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingNotification(notification);
                          setForm({
                            title: notification.title,
                            content: notification.content,
                            category: notification.category,
                            is_important: notification.is_important,
                            expires_at: notification.expires_at
                          });
                          setShowModal(true);
                        }}
                        className="p-2 text-white hover:bg-white/10 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          id: notification.id,
                          title: notification.title
                        })}
                        className="p-2 text-red-400 hover:bg-red-500/10 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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

      {/* Notification Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-xl shadow-xl max-w-2xl w-full border border-white/30 dark:border-slate-700/30">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                {editingNotification ? 'Modifica Notifica' : 'Nuova Notifica'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingNotification(null);
                  setForm({
                    title: '',
                    content: '',
                    category: 'announcement',
                    is_important: false,
                    expires_at: null
                  });
                }}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Inserisci il titolo della notifica"
                  maxLength={100}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  {form.title.length}/100 caratteri
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Contenuto *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  rows={4}
                  placeholder="Inserisci il contenuto della notifica"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Categoria *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({
                    ...form,
                    category: e.target.value as 'announcement' | 'event' | 'alert'
                  })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="announcement">Annuncio</option>
                  <option value="event">Evento</option>
                  <option value="alert">Avviso</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="important"
                    checked={form.is_important}
                    onChange={(e) => setForm({ ...form, is_important: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="important" className="text-sm text-gray-700 dark:text-slate-300">
                    Notifica Importante
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={form.expires_at?.split('T')[0] || ''}
                    onChange={(e) => setForm({
                      ...form,
                      expires_at: e.target.value ? new Date(e.target.value).toISOString() : null
                    })}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Salvataggio...' : 'Salva Notifica'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteModal
          title="Elimina Notifica"
          message={`Sei sicuro di voler eliminare la notifica "${deleteModal.title}"? Questa azione non può essere annullata.`}
          onConfirm={() => handleDelete(deleteModal.id)}
          onCancel={() => setDeleteModal(null)}
          isLoading={loading}
        />
      )}
    </div>
  );
}