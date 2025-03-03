import React, { useState } from 'react';
import { AuthScreen } from '../AuthScreen';
import { UnifiedLoginCard } from './UnifiedLoginCard';
import { motion } from 'framer-motion';
import type { UserRole } from '../../types';

interface LoginOptionsProps {
  onRoleSelect: (role: UserRole) => void;
}

export function LoginOptions({ onRoleSelect }: LoginOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  const handleOptionSelect = (option: number) => {
    setSelectedOption(option);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-light text-white text-center mb-8">
        Opzioni di Login
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* Opzione 1: Card Student (originale) */}
        <div 
          className={`relative ${selectedOption === 1 ? 'ring-4 ring-blue-500/50' : ''}`}
          onClick={() => handleOptionSelect(1)}
        >
          <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-t-lg">
            Opzione 1: Card Student
          </div>
          <AuthScreen mode="student" onRoleSelect={onRoleSelect} />
        </div>
        
        {/* Opzione 2: Card Instructor (originale) */}
        <div 
          className={`relative ${selectedOption === 2 ? 'ring-4 ring-blue-500/50' : ''}`}
          onClick={() => handleOptionSelect(2)}
        >
          <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-t-lg">
            Opzione 2: Card Instructor
          </div>
          <AuthScreen mode="instructor" onRoleSelect={onRoleSelect} />
        </div>
        
        {/* Opzione 3: Nuova Card Unificata */}
        <div 
          className={`relative md:col-span-2 ${selectedOption === 3 ? 'ring-4 ring-blue-500/50' : ''}`}
          onClick={() => handleOptionSelect(3)}
        >
          <div className="absolute -top-6 left-0 bg-green-600 text-white text-xs px-3 py-1 rounded-t-lg">
            Opzione 4: Login Unificato
          </div>
          <UnifiedLoginCard onRoleSelect={onRoleSelect} />
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto bg-slate-800/30 rounded-lg p-6 border border-white/20">
        <h2 className="text-xl text-white mb-4">Descrizione dell'Opzione 4: Login Unificato</h2>
        <ul className="space-y-2 text-white text-sm">
          <li className="flex items-start">
            <span className="inline-block w-4 h-4 bg-emerald-500 rounded-full mr-2 mt-1"></span>
            <span><strong>Login unificato:</strong> L'utente sceglie se accedere come "Studente" o "Istruttore".</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-4 h-4 bg-emerald-500 rounded-full mr-2 mt-1"></span>
            <span><strong>Logica backend:</strong> Per l'accesso dell'istruttore, il sistema verifica in maniera "interna" se i dati inseriti includono le credenziali master (ad esempio tramite un campo nascosto o una validazione specifica lato backend). Se il controllo va a buon fine, l'utente viene automaticamente reindirizzato alla dashboard dedicata al Master, senza che nella UI sia visibile l'opzione "Master".</span>
          </li>
          <li className="flex items-start">
            <span className="inline-block w-4 h-4 bg-emerald-500 rounded-full mr-2 mt-1"></span>
            <span><strong>Vantaggi:</strong></span>
            <ul className="ml-6 mt-2 space-y-2">
              <li className="flex items-start">
                <span className="inline-block w-3 h-3 border border-emerald-500 rounded-full mr-2 mt-1"></span>
                <span>Riduce la complessità della UI, evitando di confondere gli utenti con opzioni non necessarie.</span>
              </li>
              <li className="flex items-start">
                <span className="inline-block w-3 h-3 border border-emerald-500 rounded-full mr-2 mt-1"></span>
                <span>Mantiene un flusso di autenticazione lineare e intuitivo, lasciando che la distinzione tra istruttore e master sia gestita in background.</span>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
} 