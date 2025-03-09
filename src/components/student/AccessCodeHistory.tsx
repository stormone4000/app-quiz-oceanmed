import React, { useState, useEffect } from 'react';
import { Key, Calendar, AlertCircle, CheckCircle, XCircle, User } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AccessCodeHistoryItem {
  id: string;
  code_id: string;
  used_at: string;
  student_email: string;
  first_name: string | null;
  last_name: string | null;
  instructor_email: string | null;
  access_code: {
    id: string;
    code: string;
    type: 'master' | 'one_time';
    expiration_date: string | null;
    is_active: boolean;
    created_by: string | null;
  };
  creatorName: string | null;
}

interface AccessCodeHistoryProps {
  studentEmail: string;
}

export function AccessCodeHistory({ studentEmail }: AccessCodeHistoryProps) {
  const [codeHistory, setCodeHistory] = useState<AccessCodeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccessCodeHistory();
  }, [studentEmail]);

  const loadAccessCodeHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Otteniamo i dati di utilizzo dei codici
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select(`
          id,
          code_id,
          used_at,
          student_email,
          first_name,
          last_name,
          instructor_email
        `)
        .eq('student_email', studentEmail)
        .order('used_at', { ascending: false });

      if (usageError) throw usageError;

      // Per ogni utilizzo, otteniamo i dettagli del codice di accesso
      const historyWithCodes = await Promise.all(usageData.map(async (usage) => {
        // Otteniamo i dettagli del codice di accesso
        const { data: codeData, error: codeError } = await supabase
          .from('access_codes')
          .select('id, code, type, expiration_date, is_active, created_by')
          .eq('id', usage.code_id)
          .single();

        if (codeError) {
          console.error('Errore nel recupero del codice di accesso:', codeError);
          return {
            ...usage,
            access_code: {
              id: usage.code_id,
              code: 'Codice non disponibile',
              type: 'one_time' as const,
              expiration_date: null,
              is_active: false,
              created_by: null
            },
            creatorName: null
          };
        }

        return {
          ...usage,
          access_code: codeData,
          creatorName: null // Lo popoleremo dopo
        };
      }));

      // Raccogliamo tutte le email degli istruttori
      const instructorEmails = historyWithCodes
        .map(item => item.access_code.created_by || item.instructor_email)
        .filter(email => email !== null && email !== undefined) as string[];

      // Recuperiamo i nomi degli istruttori
      const instructorNames = await getInstructorNames(instructorEmails);

      // Aggiungiamo i nomi degli istruttori
      const completeHistory = historyWithCodes.map(item => {
        const creatorEmail = item.access_code.created_by || item.instructor_email;
        console.log('Dati istruttore per codice', item.access_code.code, ':', { 
          creatorEmail, 
          created_by: item.access_code.created_by,
          instructor_email: item.instructor_email 
        });
        
        let creatorName = null;
        if (creatorEmail) {
          creatorName = instructorNames[creatorEmail] || creatorEmail;
          console.log('Nome istruttore trovato:', creatorName);
        } else {
          console.log('Nessun email istruttore trovata per questo codice');
        }
        
        return {
          ...item,
          creatorName
        };
      });

      console.log('Storia completa con nomi istruttori:', completeHistory);
      setCodeHistory(completeHistory);
    } catch (error) {
      console.error('Error loading access code history:', error);
      setError('Errore durante il caricamento della cronologia dei codici');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per recuperare i nomi degli istruttori dalle loro email
  const getInstructorNames = async (emails: string[]): Promise<Record<string, string>> => {
    if (!emails.length) return {};
    
    console.log('Emails degli istruttori da cercare:', emails);
    
    try {
      // Tentiamo di accedere alla tabella auth_users (senza prefisso schema)
      const { data, error } = await supabase
        .from('auth_users')
        .select('email, first_name, last_name')
        .in('email', emails);
      
      if (error) {
        console.error('Errore nell\'accesso alla tabella auth_users:', error);
        console.log('Utilizzo il metodo alternativo per generare i nomi...');
        
        // Metodo alternativo: generare nomi dall'email
        return generateNamesFromEmails(emails);
      }
      
      console.log('Dati recuperati da auth_users:', data);
      
      if (data && data.length > 0) {
        // Creiamo un oggetto con email come chiave e nome completo come valore
        return data.reduce((acc, user) => {
          const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
          acc[user.email] = fullName || user.email;
          return acc;
        }, {} as Record<string, string>);
      } else {
        console.log('Nessun dato trovato nella tabella auth_users, utilizzo il metodo alternativo');
        return generateNamesFromEmails(emails);
      }
    } catch (error) {
      console.error('Error fetching instructor names:', error);
      return generateNamesFromEmails(emails);
    }
  };

  // Funzione di utilità per generare nomi dalle email
  const generateNamesFromEmails = (emails: string[]): Record<string, string> => {
    console.log('Generazione nomi dalle email:', emails);
    return emails.reduce((acc, email) => {
      // Estraiamo il nome dall'email (parte prima della @)
      const namePart = email.split('@')[0];
      // Formattiamo il nome (sostituiamo i punti con spazi e capitalizziamo)
      const formattedName = namePart
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      
      acc[email] = formattedName;
      return acc;
    }, {} as Record<string, string>);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-slate-400">Caricamento cronologia codici...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (codeHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-slate-400">Nessun codice di accesso utilizzato.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl">
      <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
        <Key className="w-6 h-6 text-emerald-500" />
        Cronologia Codici di Accesso
      </h2>
      
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 mb-4">
          {error}
        </div>
      ) : codeHistory.length === 0 ? (
        <div className="text-slate-600 dark:text-slate-400 p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 mb-4">
          Non hai ancora utilizzato nessun codice di accesso.
        </div>
      ) : (
        <div className="space-y-4">
          {codeHistory.map((item) => (
            <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-full ${item.access_code.is_active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    <Key className={`w-5 h-5 ${item.access_code.is_active ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {item.access_code.code}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.access_code.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                    {item.access_code.is_active ? 'Attivo' : 'Scaduto'}
                  </span>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formatDate(item.used_at)}
                </span>
              </div>
              
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Tipo:</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                      {item.access_code.type === 'master' ? 'Codice Master' : 'Codice Monouso'}
                    </span>
                  </div>
                  
                  {item.access_code.expiration_date && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Scadenza:</span>
                      <span>{formatDate(item.access_code.expiration_date)}</span>
                    </div>
                  )}
                  
                  {item.creatorName && (
                    <div className="flex items-center gap-1 mt-1 text-indigo-700 dark:text-indigo-300 font-medium">
                      <User className="w-4 h-4" />
                      <span>Fornito da:</span>
                      <span>{item.creatorName}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}