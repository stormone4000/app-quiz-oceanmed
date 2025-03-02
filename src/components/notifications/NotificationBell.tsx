import React, { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationBellProps {
  studentEmail: string;
  className?: string;
  onViewAll?: () => void;
}

interface Notification {
  id: string;
  title: string;
  category: string;
  is_important: boolean;
  created_at: string;
  read: boolean;
}

export function NotificationBell({ studentEmail, className, onViewAll }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    const subscription = subscribeToNotifications();
    return () => {
      subscription();
    };
  }, [studentEmail]);

  const loadNotifications = async () => {
    try {
      // Get all notifications
      const { data: notifs, error: notifsError } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (notifsError) throw notifsError;

      // Get read status for this student
      const { data: readStatus, error: readError } = await supabase
        .from('notification_read_status')
        .select('notification_id, read_at')
        .eq('student_email', studentEmail);

      if (readError) throw readError;

      // Create a map of read statuses
      const readMap = new Map(
        readStatus?.map(status => [status.notification_id, !!status.read_at])
      );

      // Combine notifications with their read status
      const formattedNotifs = (notifs || []).map(n => ({
        ...n,
        read: readMap.get(n.id) || false
      }));

      setNotifications(formattedNotifs);
      setUnreadCount(formattedNotifs.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
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
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (days > 0) return `${days}d fa`;
    if (hours > 0) return `${hours}h fa`;
    if (minutes > 0) return `${minutes}m fa`;
    return 'Adesso';
  };

  const handleViewAll = () => {
    setShowDropdown(false);
    if (onViewAll) {
      onViewAll();
    }
  };

  return (
    <div className="relative">
      <div
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
      >
        <AnimatePresence>
          {unreadCount > 0 ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full"
            >
              {unreadCount}
            </motion.div>
          ) : null}
        </AnimatePresence>
        {unreadCount > 0 ? (
          <BellRing className={`w-6 h-6 ${className || 'text-blue-600'}`} />
        ) : (
          <Bell className={`w-6 h-6 ${className || ''}`} />
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Mobile overlay */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setShowDropdown(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="fixed inset-x-0 top-0 mt-16 mx-auto p-4 lg:p-0 lg:absolute lg:top-full lg:right-0 lg:mt-2 lg:inset-x-auto z-50"
            >
              <div className="bg-white rounded-xl shadow-xl max-w-[calc(100vw-2rem)] lg:w-80 lg:max-w-none overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Notifiche</h3>
                </div>

                <div className="max-h-[60vh] lg:max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      Nessuna notifica
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {notifications.map(notification => (
                        <motion.div
                          key={notification.id}
                          initial={!notification.read ? { backgroundColor: '#f0f9ff' } : {}}
                          animate={{ backgroundColor: '#ffffff' }}
                          transition={{ duration: 0.5 }}
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${
                              notification.is_important ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              <BellRing className={`w-4 h-4 ${
                                notification.is_important ? 'text-red-600' : 'text-blue-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  notification.category === 'announcement'
                                    ? 'bg-blue-100 text-blue-800'
                                    : notification.category === 'event'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {notification.category === 'announcement' ? 'Annuncio' :
                                   notification.category === 'event' ? 'Evento' : 'Avviso'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDate(notification.created_at)}
                                </span>
                              </div>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleViewAll}
                    className="w-full text-center text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    Vedi tutte le notifiche
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}