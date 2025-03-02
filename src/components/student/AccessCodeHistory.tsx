import React, { useState, useEffect } from 'react';
import { Key, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AccessCodeHistory {
  code: {
    id: string;
    code: string;
    type: 'master' | 'one_time';
    expiration_date: string | null;
    is_active: boolean;
  };
  usage: {
    used_at: string;
    student_email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

interface AccessCodeHistoryProps {
  studentEmail: string;
}

export function AccessCodeHistory({ studentEmail }: AccessCodeHistoryProps) {
  const [codeHistory, setCodeHistory] = useState<AccessCodeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccessCodeHistory();
  }, [studentEmail]);

  const loadAccessCodeHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select(`
          code_id,
          used_at,
          student_email,
          first_name,
          last_name,
          access_codes (
            id,
            code,
            type,
            expiration_date,
            is_active
          )
        `)
        .eq('student_email', studentEmail)
        .order('used_at', { ascending: false });

      if (usageError) throw usageError;

      const history = usageData.map(usage => ({
        code: usage.access_codes,
        usage: {
          used_at: usage.used_at,
          student_email: usage.student_email,
          first_name: usage.first_name,
          last_name: usage.last_name
        }
      }));

      setCodeHistory(history);
    } catch (error) {
      console.error('Error loading access code history:', error);
      setError('Errore durante il caricamento della cronologia dei codici');
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-4">
      {codeHistory.map((history, index) => (
        <div
          key={index}
          className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${
                history.code.is_active 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                <Key className="w-6 h-6" />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold dark:text-slate-100">{history.code.code}</h3>
                  {history.code.is_active ? (
                    <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Attivo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      Disattivato
                    </span>
                  )}
                </div>
                
                <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Utilizzato il: {formatDate(history.usage.used_at)}
                  </p>
                  
                  <p>
                    Tipo: {history.code.type === 'master' ? 'Codice Master' : 'Codice Monouso'}
                  </p>
                  
                  {history.code.expiration_date && (
                    <p>
                      Scadenza: {formatDate(history.code.expiration_date)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}