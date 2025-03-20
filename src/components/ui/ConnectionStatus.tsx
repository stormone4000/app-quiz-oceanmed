import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';

export const ConnectionStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setIsChecking(true);
        const { error } = await supabase
          .from('videos')
          .select('count(*)', { count: 'exact' })
          .limit(1);
        
        setIsConnected(!error);
        setLastUpdate(new Date());
      } catch {
        setIsConnected(false);
        setLastUpdate(new Date());
      } finally {
        setIsChecking(false);
      }
    };

    // Verifica iniziale
    checkConnection();

    const channel = supabase
      .channel('connection-status')
      .subscribe((status) => {
        console.log('Status connessione Supabase:', status);
        setIsConnected(status === 'SUBSCRIBED');
        setLastUpdate(new Date());
      });

    // Verifica periodica della connessione
    const interval = setInterval(checkConnection, 30000); // Verifica ogni 30 secondi

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s fa`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m fa`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h fa`;
  };

  return (
    <div 
      className={`fixed bottom-4 right-4 flex items-center gap-2 p-2 rounded-full shadow-lg transition-all duration-300 ${
        isConnected 
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
          : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
      }`}
    >
      <div className="relative">
        {isConnected ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        {isChecking && (
          <div className="absolute inset-0 animate-ping opacity-75">
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium">
          {isConnected ? 'Connesso' : 'Disconnesso'}
        </span>
        <span className="text-[10px] opacity-75">
          Ultimo aggiornamento: {getTimeAgo()}
        </span>
      </div>
    </div>
  );
}; 