import React, { useState } from 'react';
import { IconUploader } from '../ui/IconUploader';
import { IconExample } from '../ui/IconExample';
import { ensureIconsBucketExists } from '../../utils/uploadIcons';

export function IconManager() {
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleInitializeBucket = async () => {
    setMessage('Inizializzazione del bucket...');
    const success = await ensureIconsBucketExists();
    if (success) {
      setMessage('Bucket "icons" inizializzato con successo!');
    } else {
      setMessage('Errore durante l\'inizializzazione del bucket "icons"');
    }
    
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const handleIconSelected = (iconUrl: string) => {
    setSelectedIcon(iconUrl);
    setMessage(`Icona selezionata: ${iconUrl}`);
    
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        Gestione Icone
      </h1>
      
      {/* Messaggio informativo */}
      <div className="mb-8 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-2">
          Come gestire le icone nell'applicazione
        </h2>
        <p className="text-blue-700 dark:text-blue-200 mb-4">
          Qui puoi caricare, gestire e utilizzare icone personalizzate nell'applicazione. Le icone vengono archiviate in modo sicuro su Supabase Storage.
        </p>
        
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleInitializeBucket}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
          >
            Inizializza Bucket Icons
          </button>
        </div>
        
        {message && (
          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300">
            {message}
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Componente per il caricamento delle icone */}
        <div>
          <IconUploader onIconSelected={handleIconSelected} />
        </div>
        
        {/* Componente di esempio per mostrare l'utilizzo delle icone */}
        <div>
          <IconExample />
          
          {/* Anteprima dell'icona selezionata */}
          {selectedIcon && (
            <div className="mt-8 p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
                Icona Selezionata
              </h2>
              
              <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-slate-700 rounded-lg">
                <img
                  src={selectedIcon}
                  alt="Icona selezionata"
                  className="max-h-32 max-w-full object-contain"
                />
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL dell'icona
                </h3>
                <input
                  type="text"
                  value={selectedIcon}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Puoi copiare questo URL e utilizzarlo dove necessario nell'applicazione.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IconManager; 