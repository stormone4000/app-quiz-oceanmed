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
  
  // Chiave per localStorage
  const getLocalStorageKey = () => `notification_read_status_${studentEmail}`;

  useEffect(() => {
    loadNotifications();
    const subscription = subscribeToNotifications();
    return () => {
      subscription();
    };
  }, [studentEmail]);

  // Funzione per ottenere lo stato di lettura dal localStorage
  const getReadStatusFromLocalStorage = (): Record<string, boolean> => {
    try {
      const storedData = localStorage.getItem(getLocalStorageKey());
      return storedData ? JSON.parse(storedData) : {};
    } catch (error) {
      console.error('Errore nel recupero dello stato di lettura dal localStorage:', error);
      return {};
    }
  };

  // Funzione per salvare lo stato di lettura nel localStorage
  const saveReadStatusToLocalStorage = (notificationId: string, isRead: boolean) => {
    try {
      const currentStatus = getReadStatusFromLocalStorage();
      currentStatus[notificationId] = isRead;
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(currentStatus));
    } catch (error) {
      console.error('Errore nel salvare lo stato di lettura nel localStorage:', error);
    }
  };

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
      // Gestiamo il caso in cui la tabella notification_read_status non esiste o non ha la colonna student_email
      let readStatus: { notification_id: string; read_at: string | null }[] = [];
      let useLocalStorage = false;
      
      try {
        const { data, error } = await supabase
          .from('notification_read_status')
          .select('notification_id, read_at')
          .eq('student_email', studentEmail);
        
        if (!error) {
          readStatus = data || [];
        } else {
          console.warn('Errore nel recupero dello stato di lettura:', error);
          
          // Verifichiamo se l'errore è dovuto alla colonna mancante
          if (error.code === '42703' && error.message && error.message.includes('student_email does not exist')) {
            console.log('La colonna student_email non esiste nella tabella notification_read_status.');
            console.log('È necessario eseguire lo script SQL per aggiungere la colonna.');
            console.log('Nel frattempo, utilizzeremo localStorage come soluzione temporanea.');
            
            useLocalStorage = true;
          }
          
          // Continuiamo senza lo stato di lettura dal database
        }
      } catch (readError) {
        console.warn('Errore nel recupero dello stato di lettura:', readError);
        useLocalStorage = true;
      }

      // Se non possiamo usare il database, usiamo localStorage
      let readMap: Map<string, boolean>;
      
      if (useLocalStorage) {
        // Otteniamo lo stato di lettura dal localStorage
        const localReadStatus = getReadStatusFromLocalStorage();
        readMap = new Map(Object.entries(localReadStatus));
      } else {
        // Creiamo una mappa degli stati di lettura dal database
        readMap = new Map(
          readStatus?.map(status => [status.notification_id, !!status.read_at])
        );
      }

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
      // Aggiorniamo lo stato locale immediatamente per una migliore esperienza utente
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      // Salviamo lo stato nel localStorage come backup
      saveReadStatusToLocalStorage(notificationId, true);
      
      // Poi proviamo ad aggiornare il database
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

        if (error) {
          console.warn('Errore nel salvare lo stato di lettura:', error);
           
          // Verifichiamo se l'errore è dovuto alla colonna mancante
          if (error.code === '42703' && error.message && error.message.includes('student_email does not exist')) {
            console.log('La colonna student_email non esiste nella tabella notification_read_status.');
            console.log('È necessario eseguire lo script SQL per aggiungere la colonna.');
            console.log('Nel frattempo, utilizzeremo localStorage come soluzione temporanea.');
          }
        }
      } catch (dbError) {
        console.warn('Errore nel salvare lo stato di lettura:', dbError);
      }
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
    <div className="space-y-6 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Le tue Notifiche</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca notifiche..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
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

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Tutte le Notifiche</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSort('created_at')}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
              >
                <Calendar className="w-4 h-4" />
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {loading ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Caricamento notifiche...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              Nessuna notifica trovata
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <motion.div
                key={notification.id}
                initial={!notification.read ? { backgroundColor: 'rgba(59, 130, 246, 0.1)' } : {}}
                animate={{ backgroundColor: notification.read ? 'transparent' : 'rgba(59, 130, 246, 0.1)' }}
                transition={{ duration: 0.5 }}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      notification.is_important 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      <Bell className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-slate-800 dark:text-white flex items-center">
                          {notification.title}
                          {!notification.read && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full">
                              Nuovo
                            </span>
                          )}
                        </h4>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 space-y-2">
                        <p className="text-slate-600 dark:text-slate-300">{notification.content}</p>
                        
                        <div className="flex items-center gap-4 flex-wrap">
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
                            <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Scade il {formatDate(notification.expires_at)}
                            </span>
                          )}
                        </div>
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