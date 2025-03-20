import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ActivationCodeManagerProps {
  instructorId: string;
}

export function ActivationCodeManager({ instructorId }: ActivationCodeManagerProps) {
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Carica il codice di attivazione dell'istruttore
  useEffect(() => {
    const loadActivationCode = async () => {
      if (!instructorId) {
        setError('ID istruttore non disponibile');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('instructor_profiles')
          .select('activation_code')
          .eq('id', instructorId)
          .single();

        if (error) {
          setError('Errore nel caricamento del codice di attivazione: ' + error.message);
          return;
        }

        setActivationCode(data.activation_code);
      } catch (err) {
        console.error('Errore imprevisto:', err);
        setError('Si è verificato un errore durante il caricamento del codice di attivazione');
      } finally {
        setLoading(false);
      }
    };

    loadActivationCode();
  }, [instructorId]);

  // Genera un nuovo codice di attivazione
  const generateNewCode = async () => {
    if (!instructorId) {
      setError('ID istruttore non disponibile');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      setCopied(false);

      // Genera un codice casuale
      const newCode = Array(8)
        .fill(0)
        .map(() => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          return chars.charAt(Math.floor(Math.random() * chars.length));
        })
        .join('');

      // Aggiorna il codice nel database
      const { error } = await supabase
        .from('instructor_profiles')
        .update({ activation_code: newCode })
        .eq('id', instructorId);

      if (error) {
        setError('Errore nell\'aggiornamento del codice di attivazione: ' + error.message);
        return;
      }

      setActivationCode(newCode);
      setSuccess('Nuovo codice di attivazione generato con successo!');
    } catch (err) {
      console.error('Errore durante la generazione del codice:', err);
      setError('Si è verificato un errore durante la generazione del nuovo codice');
    } finally {
      setGenerating(false);
    }
  };

  // Copia il codice negli appunti
  const copyToClipboard = () => {
    if (activationCode) {
      navigator.clipboard.writeText(activationCode)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(err => {
          console.error('Errore durante la copia negli appunti:', err);
          setError('Impossibile copiare il codice negli appunti');
        });
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Codice di Attivazione</h2>
      <p className="text-gray-600 mb-4">
        Condividi questo codice con i tuoi studenti per permettere loro di accedere ai tuoi contenuti.
      </p>

      {loading ? (
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="flex-1 bg-gray-100 p-3 rounded-md font-mono text-lg">
              {activationCode || 'Nessun codice disponibile'}
            </div>
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={!activationCode}
            >
              {copied ? 'Copiato!' : 'Copia'}
            </button>
          </div>

          <button
            type="button"
            onClick={generateNewCode}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={generating}
          >
            {generating ? 'Generazione in corso...' : 'Genera Nuovo Codice'}
          </button>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Attenzione: generando un nuovo codice, gli studenti che non hanno ancora attivato i tuoi contenuti dovranno utilizzare il nuovo codice. Gli studenti che hanno già attivato i tuoi contenuti non saranno influenzati.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 