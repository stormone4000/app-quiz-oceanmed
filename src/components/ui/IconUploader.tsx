import React, { useState, useRef, useEffect } from 'react';
import { Icons, IconWrapper } from '../../lib/icons';
import { uploadIcon, listIcons, deleteIcon } from '../../utils/uploadIcons';

interface IconUploaderProps {
  onIconSelected?: (iconUrl: string) => void;
}

export function IconUploader({ onIconSelected }: IconUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [icons, setIcons] = useState<{ name: string; url: string }[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carica la lista delle icone
  const loadIcons = async () => {
    setMessage({ text: 'Caricamento icone...', type: 'info' });
    const iconsList = await listIcons();
    setIcons(iconsList);
    setMessage(null);
  };

  // Carica le icone all'avvio del componente
  useEffect(() => {
    loadIcons();
  }, []);

  // Gestisce il clic sul pulsante di caricamento
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Gestisce l'eliminazione di un'icona
  const handleDeleteIcon = async (iconName: string) => {
    if (confirm(`Sei sicuro di voler eliminare l'icona "${iconName}"?`)) {
      setMessage({ text: 'Eliminazione in corso...', type: 'info' });
      const success = await deleteIcon(iconName);
      
      if (success) {
        setMessage({ text: 'Icona eliminata con successo!', type: 'success' });
        // Aggiorna la lista delle icone
        loadIcons();
      } else {
        setMessage({ text: 'Errore durante l\'eliminazione dell\'icona', type: 'error' });
      }
      
      // Nascondi il messaggio dopo 3 secondi
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  // Gestisce il caricamento del file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Controlla se il file è un'immagine
    if (!file.type.startsWith('image/')) {
      setMessage({ text: 'Seleziona un file immagine valido', type: 'error' });
      return;
    }
    
    // Carica l'icona
    setUploading(true);
    setMessage({ text: 'Caricamento in corso...', type: 'info' });
    
    try {
      const iconUrl = await uploadIcon(file);
      
      if (iconUrl) {
        setMessage({ text: 'Icona caricata con successo!', type: 'success' });
        // Aggiorna la lista delle icone
        loadIcons();
        // Notifica il componente padre se necessario
        if (onIconSelected) {
          onIconSelected(iconUrl);
        }
      } else {
        setMessage({ text: 'Errore durante il caricamento dell\'icona', type: 'error' });
      }
    } catch (error) {
      console.error('Errore nel caricamento:', error);
      setMessage({ text: 'Si è verificato un errore durante il caricamento', type: 'error' });
    } finally {
      setUploading(false);
      // Resetta il campo di input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Nascondi il messaggio dopo 3 secondi
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  // Gestisce la selezione di un'icona esistente
  const handleIconSelect = (iconUrl: string) => {
    if (onIconSelected) {
      onIconSelected(iconUrl);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        Gestione Icone
      </h2>
      
      {/* Pulsante di caricamento */}
      <div className="mb-6">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        <button
          onClick={handleUploadClick}
          disabled={uploading}
          className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <IconWrapper icon={Icons.loader} className="h-5 w-5 animate-spin" />
          ) : (
            <IconWrapper icon={Icons.refresh} className="h-5 w-5" />
          )}
          {uploading ? 'Caricamento...' : 'Carica Nuova Icona'}
        </button>
      </div>
      
      {/* Messaggi di stato */}
      {message && (
        <div 
          className={`p-3 mb-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' :
            message.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
          }`}
        >
          {message.text}
        </div>
      )}
      
      {/* Griglia di icone */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">
          Icone Disponibili
        </h3>
        
        {icons.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 italic">
            Nessuna icona trovata. Carica la tua prima icona!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {icons.map((icon) => (
              <div 
                key={icon.name} 
                className="group relative bg-gray-50 dark:bg-slate-700 rounded-lg p-3 flex flex-col items-center border border-gray-200 dark:border-gray-600 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors cursor-pointer"
                onClick={() => handleIconSelect(icon.url)}
              >
                <img 
                  src={icon.url} 
                  alt={icon.name}
                  className="h-12 w-12 object-contain mb-2" 
                />
                <p className="text-xs text-center text-gray-600 dark:text-gray-300 truncate w-full">
                  {icon.name}
                </p>
                
                {/* Pulsante elimina */}
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteIcon(icon.name);
                  }}
                  title="Elimina icona"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default IconUploader; 