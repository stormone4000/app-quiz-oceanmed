import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, Link } from 'react-router-dom';
import { Target, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { QuizLiveManager } from './QuizLiveManager';
import { QuizLiveJoin } from './QuizLiveJoin';
import { QuizLiveWaiting } from './QuizLiveWaiting';
import { QuizLivePlay } from './QuizLivePlay';
import { QuizLiveResults } from './QuizLiveResults';

interface QuizLiveMainProps {
  userEmail?: string;
  userRole?: string;
}

export function QuizLiveMain({ userEmail, userRole }: QuizLiveMainProps) {
  const navigate = useNavigate();
  const [isInstructor, setIsInstructor] = useState(false);
  
  useEffect(() => {
    if (userRole === 'instructor' || userRole === 'admin') {
      setIsInstructor(true);
    }
  }, [userRole]);

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Quiz Live</h1>
        <p className="text-slate-700 dark:text-slate-300">
          {isInstructor 
            ? 'Gestisci sessioni di quiz interattive in tempo reale' 
            : 'Partecipa a sessioni di quiz interattive in tempo reale'}
        </p>
      </div>
      
      <Routes>
        {/* Homepage Quiz Live */}
        <Route path="/" element={
          isInstructor ? (
            // @ts-ignore
            <QuizLiveManager hostEmail={userEmail} />
          ) : (
            <QuizLiveIntro />
          )
        } />
        
        {/* Pagina di accesso per studenti */}
        <Route path="join" element={
          <QuizLiveJoin studentEmail={userEmail} />
        } />
        
        {/* Sala d'attesa */}
        <Route path="waiting/:sessionId" element={
          <QuizLiveWaiting />
        } />
        
        {/* Pagina di gioco */}
        <Route path="play/:sessionId" element={
          <QuizLivePlay />
        } />
        
        {/* Risultati di una sessione */}
        <Route path="results/:sessionId" element={
          // @ts-ignore
          <QuizLiveResults sessionId="" />
        } />
      </Routes>
    </div>
  );
}

// Componente introduttivo per gli studenti
function QuizLiveIntro() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <div className="mb-8">
        <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/60 dark:text-purple-300 flex items-center justify-center mb-4">
          <Target size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Partecipa a una sessione Quiz Live</h1>
        <p className="text-slate-700 dark:text-slate-300 mb-6">
          Entra in una sessione usando il PIN fornito dal tuo istruttore e competi con altri studenti 
          per ottenere il miglior punteggio. Le risposte rapide e corrette ti garantiranno più punti!
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white dark:bg-slate-900/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Come funziona</h3>
          <ul className="text-left text-slate-700 dark:text-slate-300 space-y-3">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs mt-0.5">1</span>
              <span>Attendi che l'istruttore condivida un PIN</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs mt-0.5">2</span>
              <span>Inserisci il PIN e il tuo nickname</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs mt-0.5">3</span>
              <span>Attendi che l'istruttore avvii la sessione</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs mt-0.5">4</span>
              <span>Rispondi rapidamente alle domande per ottenere più punti</span>
            </li>
          </ul>
        </div>
        
        <div className="bg-white dark:bg-slate-900/80 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Vantaggi</h3>
          <ul className="text-left text-slate-700 dark:text-slate-300 space-y-3">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Partecipa da qualsiasi dispositivo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Visualizza i risultati in tempo reale</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Competi con altri partecipanti</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Ottieni feedback immediato sulle tue risposte</span>
            </li>
          </ul>
        </div>
      </div>
      
      <button
        onClick={() => navigate('join')}
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-lg transition duration-200"
      >
        Partecipa a un Quiz Live
      </button>
    </motion.div>
  );
} 