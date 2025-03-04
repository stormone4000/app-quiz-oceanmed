import React, { useState } from 'react';
import { X, Calendar, Clock, Send } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AssignQuizProps {
  quiz: {
    id: string;
    title: string;
    description: string;
  };
  onClose: () => void;
  onAssignSuccess?: () => void;
}

export function AssignQuiz({ quiz, onClose, onAssignSuccess }: AssignQuizProps) {
  const [studentEmails, setStudentEmails] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleAssign = async () => {
    try {
      if (!studentEmails || !startDate || !deadline) {
        setError('Compila tutti i campi obbligatori');
        return;
      }

      const emails = studentEmails
        .split(',')
        .map(email => email.trim())
        .filter(email => email);

      const assignments = emails.map(email => ({
        quiz_id: quiz.id,
        student_email: email,
        start_date: new Date(startDate).toISOString(),
        deadline: new Date(deadline).toISOString(),
        deadline_type: 'fixed',
        status: 'pending',
        instructions: 'Completa il quiz entro la scadenza indicata.',
        attempt_limit: 1
      }));

      const { error: insertError } = await supabase
        .from('quiz_assignments')
        .insert(assignments);

      if (insertError) throw insertError;

      if (onAssignSuccess) {
        onAssignSuccess();
      }

      onClose();
    } catch (error) {
      console.error('Error assigning quiz:', error);
      setError('Errore durante l\'assegnazione del quiz');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Assegna Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-medium mb-2">{quiz.title}</h3>
            <p className="text-sm text-gray-600">{quiz.description}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email degli Studenti *
              </label>
              <textarea
                value={studentEmails}
                onChange={(e) => setStudentEmails(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Inserisci le email degli studenti, separate da virgola"
              />
              <p className="mt-1 text-sm text-gray-500">
                Es: studente1@email.com, studente2@email.com
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inizio *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scadenza *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleAssign}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
            Assegna Quiz
          </button>
        </div>
      </div>
    </div>
  );
}