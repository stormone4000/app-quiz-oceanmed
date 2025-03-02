import React, { useState, useEffect } from 'react';
import { Video, Calendar, Search, ArrowLeft } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { COLORS } from '../instructor/QuizCreator';

interface VideoCategory {
  id: string;
  title: string;
  icon: string;
  icon_color: string;
  publish_date: string;
  videos: VideoItem[];
}

interface VideoItem {
  id: string;
  category_id: string;
  title: string;
  embed_url: string;
  publish_date: string;
}

export function VideoLessons() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('[VideoLessons] Tentativo di caricamento delle categorie video...');
      setLoading(true);
      setError(null);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('video_categories')
        .select(`
          *,
          videos (*)
        `)
        .order('publish_date', { ascending: false });

      if (categoriesError) throw categoriesError;
      
      console.log('[VideoLessons] Categorie caricate:', categoriesData?.length || 0);
      
      // Se non ci sono dati o c'è un errore, usiamo i dati mock
      if (!categoriesData || categoriesData.length === 0) {
        console.log('[VideoLessons] Nessuna categoria trovata, utilizzo dati mock');
        const mockCategories = getMockCategories();
        setCategories(mockCategories);
        setDebugInfo('Visualizzazione dati mock - nessun dato trovato nel database');
      } else {
        setCategories(categoriesData);
        setDebugInfo(`Dati caricati dal database: ${categoriesData.length} categorie`);
      }
    } catch (error) {
      console.error('[VideoLessons] Errore durante il caricamento delle categorie:', error);
      setError('Errore durante il caricamento delle video lezioni');
      
      // In caso di errore, usiamo i dati mock
      console.log('[VideoLessons] Utilizzo dati mock a causa dell\'errore');
      const mockCategories = getMockCategories();
      setCategories(mockCategories);
      setDebugInfo('Visualizzazione dati mock - errore di connessione al database');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per ottenere dati mock
  const getMockCategories = (): VideoCategory[] => {
    return [
      {
        id: '8a681940-d666-4987-8e04-e379f17b453d',
        title: 'Corleg 72',
        icon: 'video',
        icon_color: 'blue',
        publish_date: '2025-01-22T00:00:00+00:00',
        videos: [
          {
            id: '2086bb9c-3888-47c3-ba47-843e07e6cdda',
            category_id: '8a681940-d666-4987-8e04-e379f17b453d',
            title: 'Quiz Corleg',
            embed_url: 'https://go.screenpal.com/watch/crnfYhRHk0',
            publish_date: '2025-01-22T00:00:00+00:00'
          },
          {
            id: '480f607b-dde7-457a-ac9d-e6d1ef49be90',
            category_id: '8a681940-d666-4987-8e04-e379f17b453d',
            title: 'Fanali di Navigazione',
            embed_url: 'https://screenpal.com/player/cYl6XbNRuk?ff=1&title=0&width=100%&height=100%',
            publish_date: '2025-01-22T00:00:00+00:00'
          }
        ]
      },
      {
        id: '55e78da5-9d0a-43f4-89f9-9cd148e5169e',
        title: 'Navigazione',
        icon: 'video',
        icon_color: 'yellow',
        publish_date: '2025-01-22T00:00:00+00:00',
        videos: [
          {
            id: '38df9c27-a58e-448e-b57d-cd763f172ce6',
            category_id: '55e78da5-9d0a-43f4-89f9-9cd148e5169e',
            title: 'Bussola e Magnetismo',
            embed_url: 'https://screenpal.com/player/c3VwrbVDuSn?ff=1&title=0&width=100%&height=100%',
            publish_date: '2025-01-22T00:00:00+00:00'
          },
          {
            id: '65a3f467-1294-4eef-874f-2941de4ad2b8',
            category_id: '55e78da5-9d0a-43f4-89f9-9cd148e5169e',
            title: 'Lezione di Vela',
            embed_url: 'https://screenpal.com/player/cr12qDV1cRv?ff=1&title=0&width=100%&height=100%',
            publish_date: '2025-01-22T00:00:00+00:00'
          }
        ]
      },
      {
        id: '306ac72a-4713-46b0-be3a-ed8b47c21afb',
        title: 'Meteorologia',
        icon: 'video',
        icon_color: 'red',
        publish_date: '2025-01-22T00:00:00+00:00',
        videos: [
          {
            id: '1c984278-3b65-4c68-9f08-474ecbf94917',
            category_id: '306ac72a-4713-46b0-be3a-ed8b47c21afb',
            title: 'Lezione Meteo',
            embed_url: 'https://screenpal.com/player/crhqqbVfHh1?ff=1&title=0&width=100%&height=100%',
            publish_date: '2025-01-22T00:00:00+00:00'
          }
        ]
      }
    ];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const filteredCategories = categories.filter(category =>
    category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.videos.some(video =>
      video.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (selectedVideo) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedVideo(null)}
          className="text-white hover:text-blue-100 flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Torna all'elenco
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <h3 className="text-xl font-bold mb-2 dark:text-slate-100">{selectedVideo.title}</h3>
            <p className="text-gray-600 dark:text-slate-400">
              Pubblicato il {formatDate(selectedVideo.publish_date)}
            </p>
          </div>

          <div className="aspect-video">
            <iframe
              src={selectedVideo.embed_url}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Video Lezioni</h2>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cerca video..."
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      {debugInfo && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 p-4 rounded-lg mb-4">
          <p className="text-blue-700 dark:text-blue-400">{debugInfo}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-8">
          <p className="text-center text-gray-500 dark:text-slate-400">Caricamento video lezioni...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-8">
          <p className="text-center text-gray-500 dark:text-slate-400">
            {searchTerm ? 'Nessun risultato trovato' : 'Nessuna video lezione disponibile'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map(category => {
            const color = COLORS[category.icon_color as keyof typeof COLORS] || COLORS.blue;
            
            return (
              <div
                key={category.id}
                className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 ${color.bg} rounded-lg`}>
                      <Video className={`w-6 h-6 ${color.text}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg dark:text-slate-100">{category.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        {category.videos.length} video
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {category.videos.map(video => (
                      <button
                        key={video.id}
                        onClick={() => setSelectedVideo(video)}
                        className="w-full text-left p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <h4 className="font-medium mb-1 text-blue-600 dark:text-blue-400">{video.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(video.publish_date)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}