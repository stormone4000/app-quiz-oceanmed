import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface StudentActivation {
  id: string;
  student_id: string;
  student_email: string;
  student_name: string;
  activation_date: string;
  content_type: 'video' | 'category';
  content_id: string;
  content_title: string;
}

export function StudentActivations({ instructorId }: { instructorId: string }) {
  const [activations, setActivations] = useState<StudentActivation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadActivations = async () => {
      if (!instructorId) {
        setError('ID istruttore non disponibile');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Carica le attivazioni video
        const { data: videoActivations, error: videoError } = await supabase
          .from('student_video_activations')
          .select(`
            id,
            student_id,
            activation_date,
            video_id,
            videos(id, title, creator_id),
            students(id, email, full_name)
          `)
          .eq('videos.creator_id', instructorId);

        if (videoError) {
          setError('Errore nel caricamento delle attivazioni video: ' + videoError.message);
          return;
        }

        // Carica le attivazioni categoria
        const { data: categoryActivations, error: categoryError } = await supabase
          .from('student_category_activations')
          .select(`
            id,
            student_id,
            activation_date,
            category_id,
            video_categories(id, title, creator_id),
            students(id, email, full_name)
          `)
          .eq('video_categories.creator_id', instructorId);

        if (categoryError) {
          setError('Errore nel caricamento delle attivazioni categoria: ' + categoryError.message);
          return;
        }

        // Formatta i dati delle attivazioni video
        const formattedVideoActivations = videoActivations.map((activation: any) => ({
          id: activation.id,
          student_id: activation.student_id,
          student_email: activation.students?.email || 'Email non disponibile',
          student_name: activation.students?.full_name || 'Nome non disponibile',
          activation_date: activation.activation_date,
          content_type: 'video' as const,
          content_id: activation.video_id,
          content_title: activation.videos?.title || 'Titolo non disponibile'
        }));

        // Formatta i dati delle attivazioni categoria
        const formattedCategoryActivations = categoryActivations.map((activation: any) => ({
          id: activation.id,
          student_id: activation.student_id,
          student_email: activation.students?.email || 'Email non disponibile',
          student_name: activation.students?.full_name || 'Nome non disponibile',
          activation_date: activation.activation_date,
          content_type: 'category' as const,
          content_id: activation.category_id,
          content_title: activation.video_categories?.title || 'Titolo non disponibile'
        }));

        // Combina e ordina le attivazioni per data (più recenti prima)
        const allActivations = [...formattedVideoActivations, ...formattedCategoryActivations]
          .sort((a, b) => new Date(b.activation_date).getTime() - new Date(a.activation_date).getTime());

        setActivations(allActivations);
      } catch (err) {
        setError('Errore imprevisto durante il caricamento delle attivazioni');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadActivations();
  }, [instructorId]);

  // Formatta la data in un formato leggibile
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Attivazioni Studenti</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : activations.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Nessuna attivazione trovata per i tuoi contenuti.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Studente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contenuto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Attivazione
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activations.map((activation) => (
                <tr key={activation.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{activation.student_name}</div>
                    <div className="text-sm text-gray-500">{activation.student_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{activation.content_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      activation.content_type === 'video' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {activation.content_type === 'video' ? 'Video' : 'Categoria'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(activation.activation_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 