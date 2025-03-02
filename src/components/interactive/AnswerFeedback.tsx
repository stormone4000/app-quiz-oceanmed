import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerFeedbackProps {
  status: 'submitting' | 'success' | 'error' | null;
  message?: string;
}

export function AnswerFeedback({ status, message }: AnswerFeedbackProps) {
  return (
    <AnimatePresence>
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg shadow-lg ${
            status === 'success' ? 'bg-green-50' :
            status === 'error' ? 'bg-red-50' :
            'bg-blue-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {status === 'submitting' && (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
            {status === 'error' && (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={
              status === 'success' ? 'text-green-700' :
              status === 'error' ? 'text-red-700' :
              'text-blue-700'
            }>
              {message || (
                status === 'submitting' ? 'Invio risposta...' :
                status === 'success' ? 'Risposta inviata!' :
                'Errore durante l\'invio'
              )}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}