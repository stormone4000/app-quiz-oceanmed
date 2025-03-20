import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { InstructorFilter } from './InstructorFilter';
import { convertYouTubeUrl } from '../../utils/videoUtils';

interface VideoCategory {
  id: string;
  title: string;
  icon: string;
  icon_color: string;
  videos: VideoItem[];
  creator_business_name?: string;
  creator_email?: string;
}

interface VideoItem {
  id: string;
  title: string;
  embed_url: string;
  publish_date: string;
  is_public: boolean;
  creator_business_name?: string;
  creator_email?: string;
}

interface Creator {
  business_name: string;
  email: string;
}

export function VideoList() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

  // Carica le categorie e i video
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Query di base per le categorie
        let categoryQuery = supabase
          .from('video_categories')
          .select('id, title, icon, icon_color, creator_id, creator:instructor_profiles(business_name, email)')
          .eq('is_public', true);

        // Applica il filtro per istruttore se selezionato
        if (selectedInstructorId) {
          categoryQuery = categoryQuery.eq('creator_id', selectedInstructorId);
        }

        const { data: categoriesData, error: categoriesError } = await categoryQuery;

        if (categoriesError) {
          setError('Errore nel caricamento delle categorie: ' + categoriesError.message);
          return;
        }

        // Query di base per i video
        let videoQuery = supabase
          .from('videos')
          .select('id, title, embed_url, publish_date, is_public, category_id, creator_id, creator:instructor_profiles(business_name, email)')
          .eq('is_public', true);

        // Applica il filtro per istruttore se selezionato
        if (selectedInstructorId) {
          videoQuery = videoQuery.eq('creator_id', selectedInstructorId);
        }

        const { data: videosData, error: videosError } = await videoQuery;

        if (videosError) {
          setError('Errore nel caricamento dei video: ' + videosError.message);
          return;
        }

        // Organizza i video per categoria
        const processedCategories = categoriesData.map((category: any) => {
          const categoryVideos = videosData.filter(
            (video: any) => video.category_id === category.id
          ).map((video: any) => ({
            id: video.id,
            title: video.title,
            embed_url: video.embed_url,
            publish_date: video.publish_date,
            is_public: video.is_public,
            creator_business_name: video.creator?.business_name || null,
            creator_email: video.creator?.email || null
          }));

          return {
            id: category.id,
            title: category.title,
            icon: category.icon,
            icon_color: category.icon_color,
            videos: categoryVideos,
            creator_business_name: category.creator?.business_name || null,
            creator_email: category.creator?.email || null
          };
        });

        // Filtra le categorie che hanno almeno un video
        const categoriesWithVideos = processedCategories.filter(
          (category) => category.videos.length > 0
        );

        setCategories(categoriesWithVideos);
      } catch (err) {
        setError('Errore imprevisto durante il caricamento dei contenuti');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, [selectedInstructorId]);

  // Gestisce il cambio di filtro istruttore
  const handleFilterChange = (instructorId: string | null) => {
    setSelectedInstructorId(instructorId);
    setExpandedCategory(null);
    setSelectedVideo(null);
  };

  // Gestisce l'espansione/collasso di una categoria
  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setSelectedVideo(null);
  };

  // Gestisce la selezione di un video
  const handleVideoClick = (video: VideoItem) => {
    setSelectedVideo(video);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Video Didattici</h1>
      
      {/* Filtro per istruttore */}
      <InstructorFilter 
        onFilterChange={handleFilterChange} 
        className="mb-6"
      />

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          {selectedInstructorId 
            ? "Nessun video disponibile per l'istruttore selezionato." 
            : "Nessun video disponibile."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Colonna delle categorie */}
          <div className="md:col-span-1 bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Categorie</h2>
            <ul className="space-y-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between ${
                      expandedCategory === category.id
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className={`mr-2 text-${category.icon_color}-500`}>
                        <i className={`fas fa-${category.icon}`}></i>
                      </span>
                      {category.title}
                    </span>
                    <span className="text-xs bg-gray-200 rounded-full px-2 py-1">
                      {category.videos.length}
                    </span>
                  </button>
                  {category.creator_business_name && (
                    <div className="text-xs text-gray-500 ml-3 mt-1">
                      {category.creator_business_name}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Colonna dei video */}
          <div className="md:col-span-2">
            {expandedCategory ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  {categories.find((c) => c.id === expandedCategory)?.title}
                </h2>
                <ul className="space-y-3">
                  {categories
                    .find((c) => c.id === expandedCategory)
                    ?.videos.map((video) => (
                      <li key={video.id}>
                        <button
                          onClick={() => handleVideoClick(video)}
                          className={`w-full text-left p-3 rounded-md border ${
                            selectedVideo?.id === video.id
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{video.title}</div>
                          {video.creator_business_name && (
                            <div className="text-xs text-gray-500 mt-1">
                              {video.creator_business_name}
                            </div>
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg p-8">
                <p className="text-gray-500">
                  Seleziona una categoria per visualizzare i video disponibili
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player video */}
      {selectedVideo && (
        <div className="mt-8 bg-black rounded-lg overflow-hidden">
          <div className="aspect-w-16 aspect-h-9">
            <iframe
              src={convertYouTubeUrl(selectedVideo.embed_url)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            ></iframe>
          </div>
          <div className="p-4 bg-gray-800 text-white">
            <h3 className="text-xl font-semibold">{selectedVideo.title}</h3>
            {selectedVideo.creator_business_name && (
              <p className="text-gray-300 text-sm mt-1">
                {selectedVideo.creator_business_name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 