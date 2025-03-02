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

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
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
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error loading video categories:', error);
      setError('Errore durante il caricamento delle video lezioni');
    } finally {
      setLoading(false);
    }
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