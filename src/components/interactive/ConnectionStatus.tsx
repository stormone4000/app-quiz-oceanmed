import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  isConnected: boolean;
  onReconnect: () => void;
}

export function ConnectionStatus({ isConnected, onReconnect }: ConnectionStatusProps) {
  return (
    <div className={`fixed bottom-4 right-4 p-2 rounded-lg transition-colors ${
      isConnected ? 'bg-green-50' : 'bg-red-50'
    }`}>
      <button 
        onClick={onReconnect}
        className="flex items-center gap-2 text-sm"
      >
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-green-700">Connesso</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-600" />
            <span className="text-red-700">Riconnetti</span>
          </>
        )}
      </button>
    </div>
  );
}