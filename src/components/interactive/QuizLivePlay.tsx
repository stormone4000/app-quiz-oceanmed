import React from 'react';
import { useParams } from 'react-router-dom';

export function QuizLivePlay() {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <div className="min-h-screen bg-navy-900 p-4 flex items-center justify-center">
      <div className="bg-navy-800 rounded-xl p-6 max-w-lg w-full border border-navy-700">
        <h2 className="text-2xl font-bold text-white mb-4 text-center">Quiz in corso</h2>
        <p className="text-gray-400 text-center mb-4">
          Questo componente verrà implementato in dettaglio nella fase successiva.
        </p>
        <div className="bg-navy-700 p-4 rounded-lg">
          <p className="text-sm text-gray-400">ID Sessione: {sessionId}</p>
        </div>
      </div>
    </div>
  );
} 