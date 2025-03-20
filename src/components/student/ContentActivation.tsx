import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface ContentActivationProps {
  studentId: string;
  onActivationSuccess: () => void;
}

export function ContentActivation({ studentId, onActivationSuccess }: ContentActivationProps) {
  const [activationCode, setActivationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activationCode.trim()) {
      setError('Inserisci un codice di attivazione valido');
      return;
    }

    if (!studentId) {
      setError('ID studente non disponibile. Effettua il login per attivare i contenuti.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Verifica se il codice corrisponde a un istruttore
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructor_profiles')
        .select('id, business_name, email, activation_code')
        .eq('activation_code', activationCode)
        .single();

      if (instructorError || !instructorData) {
        setError('Codice di attivazione non valido o non trovato');
        return;
      }

      const instructorId = instructorData.id;
      const instructorName = instructorData.business_name || instructorData.email;

      // Ottieni tutte le categorie dell'istruttore
      const { data: categories, error: categoriesError } = await supabase
        .from('video_categories')
        .select('id')
        .eq('creator_id', instructorId);

      if (categoriesError) {
        setError('Errore nel recupero delle categorie: ' + categoriesError.message);
        return;
      }

      // Ottieni tutti i video dell'istruttore
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id')
        .eq('creator_id', instructorId);

      if (videosError) {
        setError('Errore nel recupero dei video: ' + videosError.message);
        return;
      }

      // Attiva tutte le categorie per lo studente
      for (const category of categories) {
        await supabase
          .from('student_category_activations')
          .upsert({
            student_id: studentId,
            category_id: category.id,
            activation_date: new Date().toISOString(),
            is_active: true
          }, {
            onConflict: 'student_id,category_id',
            ignoreDuplicates: false
          });
      }

      // Attiva tutti i video per lo studente
      for (const video of videos) {
        await supabase
          .from('student_video_activations')
          .upsert({
            student_id: studentId,
            video_id: video.id,
            activation_date: new Date().toISOString(),
            is_active: true
          }, {
            onConflict: 'student_id,video_id',
            ignoreDuplicates: false
          });
      }

      setSuccess(`Contenuti di "${instructorName}" attivati con successo! Hai attivato ${categories.length} categorie e ${videos.length} video.`);
      setActivationCode('');
      onActivationSuccess();
    } catch (err) {
      console.error('Errore durante l\'attivazione:', err);
      setError('Si è verificato un errore durante l\'attivazione dei contenuti');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Attiva Contenuti</h2>
      <p className="text-gray-600 mb-4">
        Inserisci il codice di attivazione fornito dal tuo istruttore per accedere ai suoi contenuti.
      </p>

      <form onSubmit={handleActivation} className="space-y-4">
        <div>
          <label htmlFor="activation-code" className="block text-sm font-medium text-gray-700">
            Codice di Attivazione
          </label>
          <input
            type="text"
            id="activation-code"
            value={activationCode}
            onChange={(e) => setActivationCode(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="Inserisci il codice"
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          {loading ? 'Attivazione in corso...' : 'Attiva Contenuti'}
        </button>
      </form>
    </div>
  );
} 