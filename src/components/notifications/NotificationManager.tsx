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
      <h2 className="text-3xl font-light text-slate-900 dark:text-slate-50 mb-6">Gestione Notifiche</h2>
      
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca notifiche..."
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700/30 bg-white dark:bg-slate-800/10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 w-full"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 w-5 h-5" />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Nuova Notifica
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-slate-200 dark:border-slate-700/30 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('title')}>
                    Titolo
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('category')}>
                    Categoria
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('is_important')}>
                    Importante
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('created_at')}>
                    Data Creazione
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('expires_at')}>
                    Scadenza
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-800 dark:text-slate-100">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/30">
              {filteredNotifications.map(notification => (
                <tr key={notification.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Bell className={`w-5 h-5 ${
                        notification.is_important ? 'text-red-500' : 'text-blue-500'
                      }`} />
                      <span className="font-medium text-slate-800 dark:text-slate-100">{notification.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-sm rounded-full ${
                      notification.category === 'announcement'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-100/30 dark:text-blue-100'
                        : notification.category === 'event'
                        ? 'bg-green-100 text-green-800 dark:bg-green-100/30 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-100/30 dark:text-red-100'
                    }`}>
                      {notification.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {notification.is_important ? (
                      <span className="text-red-600 dark:text-red-400">Sì</span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                    {formatDate(notification.created_at)}
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
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
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Modifica notifica"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({
                          id: notification.id,
                          title: notification.title
                        })}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        title="Elimina notifica"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editingNotification ? 'Modifica Notifica' : 'Nuova Notifica'}
              </h3>
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
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
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
                    id="is_important"
                    checked={form.is_important}
                    onChange={(e) => setForm({ ...form, is_important: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="is_important" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Contrassegna come importante
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

            <div className="flex justify-end gap-3">
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
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title || !form.content}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  !form.title || !form.content
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                <Save className="w-5 h-5" />
                Salva
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