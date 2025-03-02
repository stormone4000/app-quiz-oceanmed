import React, { useState, useEffect } from 'react';
import { Search, Book, Key, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface QuizSelectorProps {
  onQuizSelect: (quizId: string) => void;
}

interface QuizCategory {
  id: string;
  name: string;
  count: number;
}

export function QuizSelector({ onQuizSelect }: QuizSelectorProps) {
  const [quizCode, setQuizCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!quizCode.trim()) {
        throw new Error('Inserisci un codice quiz');
      }

      // Verify quiz code
      const { data: quiz, error: quizError } = await supabase
        .from('quiz_templates')
        .select('id, title')
        .eq('quiz_code', quizCode.trim())
        .single();

      if (quizError || !quiz) {
        throw new Error('Codice quiz non valido');
      }
      
      // Store the quiz code in localStorage
      localStorage.setItem('quizCode', quizCode.trim());
      
      // Determine quiz type based on quiz data
      const quizType = quiz.quiz_type || 'learning';
      const category = quiz.category;

      setSuccess('Codice verificato con successo!');
      setTimeout(() => {
        // Pass quiz type to parent component
        if (quizType === 'exam') {
          navigate('/dashboard', { 
            state: { 
              quizType: 'exam',
              quizId: quiz.id,
              category: category 
            }
          });
        } else {
          onQuizSelect(quiz.id);
        }
      }, 1000);

    } catch (error) {
      console.error('Error verifying quiz code:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Quiz Code Input */}
      <div className="bg-emerald-600/30 dark:bg-emerald-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Key className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white dark:text-slate-100">Aggiungi Codice Quiz</h3>
            <p className="text-gray-300 dark:text-slate-400">Inserisci il codice fornito dall'istruttore per aggiungerlo</p>
          </div>
        </div>

        <form onSubmit={handleCodeSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 text-lg tracking-wider font-mono rounded-lg border border-white/30 dark:border-slate-700/30 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/10 dark:bg-slate-800/10 text-white dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
              placeholder="Inserisci il codice quiz"
              maxLength={8}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                {error}
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full bg-emerald-400 text-black py-3 px-4 rounded-lg hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" />
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || !quizCode.trim()}
            className="w-full bg-emerald-400 text-black py-3 px-4 rounded-lg hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifica in corso...
              </>
            ) : (
              <>
                <ArrowRight className="w-5 h-5" />
                Accedi ai Quiz
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}