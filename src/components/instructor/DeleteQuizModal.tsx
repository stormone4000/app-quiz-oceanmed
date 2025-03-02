import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Elimina Quiz
            </h2>
            <p className="text-gray-600 mb-4">
              Sei sicuro di voler eliminare il quiz "{quiz.title}"? Questa azione non può essere annullata.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              {quiz.description}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isLoading}
              >
                Annulla
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Eliminazione...' : 'Elimina Quiz'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}