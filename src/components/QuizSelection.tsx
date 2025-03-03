import React from 'react';
import { Book, GraduationCap, Users, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import type { QuizType } from '../types';

interface QuizSelectionProps {
  onSelectQuizType: (type: QuizType) => void;
  onShowDashboard: () => void;
}

export function QuizSelection({ onSelectQuizType, onShowDashboard }: QuizSelectionProps) {
  console.log("QuizSelection - Componente renderizzato");
  
  const handleSelectQuizType = (type: QuizType) => {
    console.log("QuizSelection - Tipo di quiz selezionato:", type);
    onSelectQuizType(type);
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-light text-white">Seleziona Tipo di Quiz</h2>
        <button
          onClick={onShowDashboard}
          className="text-white hover:text-blue-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna alla Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quiz di Esame */}
        <motion.div
          className="group relative rounded-xl bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 shadow-lg p-6 hover:scale-[1.02] transition-all"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg shadow-md">
              <GraduationCap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-light text-white dark:text-slate-100">Quiz di Esame</h2>
          </div>
          <p className="text-gray-200 dark:text-slate-300 mb-6">
            Simulazione d'esame con domande a tempo. Verifica la tua preparazione con quiz che simulano l'esame reale.
          </p>
          <button
            onClick={() => handleSelectQuizType('exam')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-all"
          >
            Inizia Quiz di Esame
          </button>
        </motion.div>

        {/* Moduli di Apprendimento */}
        <motion.div
          className="group relative rounded-xl bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 shadow-lg p-6 hover:scale-[1.02] transition-all"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg shadow-md">
              <Book className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-light text-white dark:text-slate-100">Moduli di Apprendimento</h2>
          </div>
          <p className="text-gray-200 dark:text-slate-300 mb-6">
            Quiz formativi su argomenti specifici. Impara e verifica le tue conoscenze con feedback immediato.
          </p>
          <button
            onClick={() => handleSelectQuizType('learning')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-all"
          >
            Esplora Moduli di Apprendimento
          </button>
        </motion.div>

        {/* Quiz Studenti */}
        <motion.div
          className="group relative rounded-xl bg-slate-800/10 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 shadow-lg p-6 hover:scale-[1.02] transition-all"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg shadow-md">
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-light text-white dark:text-slate-100">Quiz Studenti</h2>
          </div>
          <p className="text-gray-200 dark:text-slate-300 mb-6">
            Quiz interattivi creati da altri istruttori. Partecipa e metti alla prova le tue conoscenze in modo divertente. Qui troverai anche i quiz aggiunti tramite codice fornito dall'istruttore.
          </p>
          <button
            onClick={() => handleSelectQuizType('interactive')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg hover:opacity-90 transition-all"
          >
            Esplora Quiz Interattivi
          </button>
        </motion.div>
      </div>
    </div>
  );
}