import React, { useState, useEffect } from 'react';
import { Bell, Search, Calendar, ArrowUpDown } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion } from 'framer-motion';

interface NotificationListProps {
  studentEmail: string;
}

interface Notification {
  id: string;
  title: string;
  content: string;
  category: string;
  is_important: boolean;
  created_at: string;
  expires_at: string | null;
  read: boolean;
}

export function NotificationList({ studentEmail }: NotificationListProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Notification;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });

  useEffect(() => {
    loadNotifications();
    const subscription = subscribeToNotifications();
    return () => {
      subscription();
    };
  }, [studentEmail]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prima otteniamo tutte le notifiche
      const { data: allNotifs, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifsError) throw notifsError;

      // Poi otteniamo lo stato di lettura per questo studente
      const { data: readStatus, error: readError } = await supabase
        .from('notification_read_status')
        .select('notification_id, read_at')
        .eq('student_email', studentEmail);

      if (readError) throw readError;

      // Creiamo una mappa degli stati di lettura
      const readMap = new Map(
        readStatus?.map(status => [status.notification_id, !!status.read_at])
      );

      // Combiniamo le notifiche con il loro stato di lettura
      const formattedNotifs = (allNotifs || []).map(n => ({
        ...n,
        read: readMap.get(n.id) || false
      }));

      setNotifications(formattedNotifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Errore durante il caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        loadNotifications();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_read_status')
        .upsert([{
          notification_id: notificationId,
          student_email: studentEmail,
          read_at: new Date().toISOString()
        }], {
          onConflict: 'notification_id,student_email'
        });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
      (notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       notification.content.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!selectedCategory || notification.category === selectedCategory)
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

  const categories = Array.from(new Set(notifications.map(n => n.category)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Le tue Notifiche</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none dark:text-slate-100">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca notifiche..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          >
            <option value="">Tutte le categorie</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'announcement' ? 'Annunci' :
                 category === 'event' ? 'Eventi' : 'Avvisi'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold dark:text-slate-100">Tutte le Notifiche</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSort('created_at')}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-grey-600">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Caricamento notifiche...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nessuna notifica trovata
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={!notification.read ? { backgroundColor: '#f0f9ff' } : {}}
                animate={{ backgroundColor: '#ffffff' }}
                transition={{ duration: 0.5 }}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-slate-800 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start flex-1 bg-slate-100/10 dark:bg-slate-950 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6 min-w-0 gap-4">
                  <div className={`p-3 rounded-full ${
                    notification.is_important ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <Bell className={`w-5 h-5 ${
                      notification.is_important ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>

                  <div className="flex-1 bg-slate-100/10 dark:bg-slate-950 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-medium dark:text-slate-100">
                        {notification.title}
                        {!notification.read && (
                          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                            Nuovo
                          </span>
                        )}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {formatDate(notification.created_at)}
                      </span>
                    </div>

                    <div className="mt-2 space-y-2">
                      <p className="text-gray-600 dark:text-slate-400">{notification.content}</p>
                      
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          notification.category === 'announcement'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            : notification.category === 'event'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {notification.category === 'announcement' ? 'Annuncio' :
                           notification.category === 'event' ? 'Evento' : 'Avviso'}
                        </span>

                        {notification.expires_at && (
                          <span className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Scade il {formatDate(notification.expires_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}