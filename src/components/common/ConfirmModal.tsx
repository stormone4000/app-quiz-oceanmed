import React from 'react';
import { AlertTriangle, XCircle, CheckCircle2, Clock, Trash2 } from 'lucide-react';

type ActionType = 'delete' | 'suspend' | 'activate' | 'reset';

interface ConfirmModalProps {
  type: ActionType;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  details?: string;
}

export function ConfirmModal({ 
  type, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  isLoading,
  details 
}: ConfirmModalProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'suspend':
        return <XCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />;
      case 'activate':
        return <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'reset':
        return <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />;
    }
  };
  
  const getButtonColor = () => {
    switch (type) {
      case 'delete':
        return 'bg-red-600 hover:bg-red-700';
      case 'suspend':
        return 'bg-amber-600 hover:bg-amber-700';
      case 'activate':
        return 'bg-green-600 hover:bg-green-700';
      case 'reset':
        return 'bg-orange-600 hover:bg-orange-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };
  
  const getBackgroundColor = () => {
    switch (type) {
      case 'delete':
        return 'bg-red-100 dark:bg-red-900/30';
      case 'suspend':
        return 'bg-amber-100 dark:bg-amber-900/30';
      case 'activate':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'reset':
        return 'bg-orange-100 dark:bg-orange-900/30';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };
  
  const getButtonText = () => {
    if (isLoading) {
      switch (type) {
        case 'delete':
          return 'Eliminazione...';
        case 'suspend':
          return 'Sospensione...';
        case 'activate':
          return 'Attivazione...';
        case 'reset':
          return 'Reimpostazione...';
        default:
          return 'Elaborazione...';
      }
    } else {
      switch (type) {
        case 'delete':
          return 'Elimina';
        case 'suspend':
          return 'Sospendi';
        case 'activate':
          return 'Attiva';
        case 'reset':
          return 'Reimposta';
        default:
          return 'Conferma';
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 ${getBackgroundColor()} rounded-full`}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {message}
              {details && (
                <span className="block mt-2 p-2 bg-gray-100 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600 text-sm italic">
                  "{details.length > 100 
                    ? details.substring(0, 100) + '...' 
                    : details}"
                </span>
              )}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Annulla
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 ${getButtonColor()} text-white rounded-lg transition-colors disabled:opacity-50`}
                disabled={isLoading}
              >
                {getButtonText()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 