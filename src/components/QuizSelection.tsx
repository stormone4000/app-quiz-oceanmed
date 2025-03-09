import React, { useEffect } from 'react';
import { Book, GraduationCap, Users, ArrowLeft, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import type { QuizType } from '../types';

interface QuizSelectionProps {
  onSelectQuizType: (type: QuizType) => void;
  onShowDashboard: () => void;
}

export function QuizSelection({ onSelectQuizType, onShowDashboard }: QuizSelectionProps) {
  console.log("QuizSelection - Componente renderizzato");
  
  // Rimuoviamo il reindirizzamento automatico ai quiz di esame
  // per mostrare la schermata completa con tutte le opzioni
  
  const handleSelectQuizType = (type: QuizType) => {
    console.log("QuizSelection - Tipo di quiz selezionato:", type);
    onSelectQuizType(type);
  };
  
  return (
    <div className="space-y-8 px-4 sm:px-6 md:px-8 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Quiz Disponibili</h2>
        <button
          onClick={onShowDashboard}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna alla Dashboard</span>
        </button>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-lg mb-6">
        <p className="text-slate-700 dark:text-slate-300 text-center font-medium">
          Seleziona una delle tre categorie principali di quiz impostate dall'Amministratore
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quiz di Esame */}
        <motion.div
          className="group relative rounded-xl bg-indigo-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/60 rounded-xl">
                <GraduationCap className="w-8 h-8 text-indigo-700 dark:text-indigo-300" />
              </div>
              <h2 className="text-xl font-bold text-indigo-900 dark:text-white">Quiz di Esame</h2>
            </div>
            <p className="text-indigo-950 dark:text-slate-200 mb-6 min-h-[80px] font-medium">
              Simulazione d'esame con domande a tempo. Verifica la tua preparazione con quiz che simulano l'esame reale.
            </p>
            <button
              onClick={() => handleSelectQuizType('exam')}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              Inizia Quiz di Esame
            </button>
          </div>
        </motion.div>

        {/* Moduli di Apprendimento */}
        <motion.div
          className="group relative rounded-xl bg-blue-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/60 rounded-xl">
                <Book className="w-8 h-8 text-blue-700 dark:text-blue-300" />
              </div>
              <h2 className="text-xl font-bold text-blue-900 dark:text-white">Moduli di Apprendimento</h2>
            </div>
            <p className="text-blue-950 dark:text-slate-200 mb-6 min-h-[80px] font-medium">
              Quiz formativi su argomenti specifici. Impara e verifica le tue conoscenze con feedback immediato.
            </p>
            <button
              onClick={() => handleSelectQuizType('learning')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              Esplora Moduli di Apprendimento
            </button>
          </div>
        </motion.div>

        {/* Quiz live */}
        <motion.div
          className="group relative rounded-xl bg-purple-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <div className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/60 rounded-xl">
                <Target className="w-8 h-8 text-purple-700 dark:text-purple-300" />
              </div>
              <h2 className="text-xl font-bold text-purple-900 dark:text-white">Quiz Studenti</h2>
            </div>
            <p className="text-purple-950 dark:text-slate-200 mb-6 min-h-[80px] font-medium">
              Quiz interattivi creati da altri istruttori. Partecipa e metti alla prova le tue conoscenze in modo divertente. Qui troverai anche i quiz aggiunti tramite codice fornito dall'istruttore.
            </p>
            <button
              onClick={() => handleSelectQuizType('interactive')}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 px-6 rounded-lg font-medium shadow-md hover:shadow-lg transition-all"
            >
              Esplora Quiz Interattivi
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}