import React, { useState, useEffect } from 'react';
import { Icons, IconWrapper, CustomIcon } from '../../lib/icons';

export function IconExample() {
  const [customIconUrl, setCustomIconUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCustomIcon = async () => {
      setIsLoading(true);
      try {
        // Esempio: carica un'icona chiamata "logo.png" dal bucket "icons" di Supabase
        const iconUrl = await Icons.getCustomIcon('logo.png');
        setCustomIconUrl(iconUrl);
      } catch (error) {
        console.error("Errore nel caricamento dell'icona personalizzata:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomIcon();
  }, []);

  return (
    <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        Esempi di Icone
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Gruppo di icone Lucide */}
        <div className="space-y-4 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Icone da Lucide
          </h3>
          
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col items-center">
              <IconWrapper 
                icon={Icons.login} 
                className="h-8 w-8 text-blue-500" 
              />
              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">Login</span>
            </div>
            
            <div className="flex flex-col items-center">
              <IconWrapper 
                icon={Icons.student} 
                className="h-8 w-8 text-green-500" 
              />
              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">Studente</span>
            </div>
            
            <div className="flex flex-col items-center">
              <IconWrapper 
                icon={Icons.instructor} 
                className="h-8 w-8 text-purple-500" 
              />
              <span className="text-xs mt-1 text-gray-600 dark:text-gray-400">Istruttore</span>
            </div>
          </div>
        </div>
        
        {/* Icona personalizzata da Supabase */}
        <div className="space-y-4 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
            Icona Personalizzata
          </h3>
          
          <div className="flex flex-col items-center justify-center h-24">
            {isLoading ? (
              <IconWrapper 
                icon={Icons.loader} 
                className="h-8 w-8 text-blue-500 animate-spin" 
              />
            ) : customIconUrl ? (
              <CustomIcon 
                src={customIconUrl} 
                alt="Icona personalizzata" 
                className="h-16 w-16 object-contain" 
              />
            ) : (
              <div className="flex flex-col items-center text-center">
                <IconWrapper 
                  icon={Icons.alert} 
                  className="h-8 w-8 text-red-500" 
                />
                <p className="text-xs mt-2 text-red-500">
                  Icona non trovata
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
          Come utilizzare
        </h3>
        <pre className="bg-gray-100 dark:bg-slate-900 p-3 rounded text-xs overflow-x-auto">
          {`// Importa i componenti necessari
import { Icons, IconWrapper, CustomIcon } from '../../lib/icons';

// Usa un'icona da Lucide
<IconWrapper 
  icon={Icons.login} 
  className="h-5 w-5 text-blue-500" 
/>

// Carica e usa un'icona personalizzata da Supabase
const iconUrl = await Icons.getCustomIcon('nome-icona.png');
<CustomIcon 
  src={iconUrl} 
  alt="Descrizione icona" 
  className="h-5 w-5" 
/>`}
        </pre>
      </div>
    </div>
  );
}

export default IconExample; 