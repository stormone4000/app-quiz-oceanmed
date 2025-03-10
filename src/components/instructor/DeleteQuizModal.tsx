import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteQuizModalProps {
  quiz: {
    title: string;
    description: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function DeleteQuizModal({ quiz, onConfirm, onCancel, isLoading }: DeleteQuizModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 max-w-lg w-full p-6">
        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Conferma Eliminazione</h3>
        <p className="text-gray-700 dark:text-slate-300 mb-6">
          Sei sicuro di voler eliminare il quiz <span className="font-medium text-gray-900 dark:text-white">{quiz.title}</span>?
          <br />
          <span className="text-red-500 dark:text-red-400 mt-1 block font-medium">Questa azione non può essere annullata!</span>
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Eliminazione...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Elimina
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}