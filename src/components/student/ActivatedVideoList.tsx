import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Filter, Video, List, Search, X } from 'lucide-react';
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

interface ActivatedVideoListProps {
  studentId: string;
}

export function ActivatedVideoList({ studentId }: ActivatedVideoListProps) {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<VideoCategory[]>([]);
  const [filterInstructor, setFilterInstructor] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<{id: string, name: string}[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [hasQuizAccess, setHasQuizAccess] = useState(false);
  const [checkingQuizAccess, setCheckingQuizAccess] = useState(true);

  // Verifica se lo studente ha un codice QUIZ attivato
  useEffect(() => {
    const checkQuizAccess = async () => {
      if (!studentId) return;
      
      try {
        setCheckingQuizAccess(true);
        
        // Usa direttamente l'email dell'utente da localStorage
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) {
          console.error('Email utente non disponibile in localStorage');
          setCheckingQuizAccess(false);
          return;
        }
        
        // Verifica se c'è un codice di accesso QUIZ attivato
        const { data: accessCodeData, error: accessCodeError } = await supabase
          .from('access_code_usage')
          .select(`
            code_id,
            access_codes:code_id(
              code,
              type
            )
          `)
          .eq('student_email', userEmail);
          
        if (accessCodeError) {
          console.error('Errore durante la verifica dei codici di accesso:', accessCodeError);
          setCheckingQuizAccess(false);
          return;
        }
        
        console.log('Codici di accesso trovati:', accessCodeData);
        
        // Verifica più precisa: il codice deve iniziare esattamente con "QUIZ"
        // e non deve essere un altro tipo di codice (come istruttore, ecc.)
        const hasQuiz = accessCodeData?.some((usage: any) => {
          const code = usage.access_codes?.code || '';
          // Verifichiamo che inizi proprio con "QUIZ" e non con altre sequenze
          return code.match(/^QUIZ[^a-zA-Z]/i) !== null;
        });
        
        console.log('Utente ha codice QUIZ attivato:', hasQuiz);
        setHasQuizAccess(!!hasQuiz);
      } catch (err) {
        console.error('Errore durante la verifica dell\'accesso QUIZ:', err);
      } finally {
        setCheckingQuizAccess(false);
      }
    };
    
    checkQuizAccess();
  }, [studentId]);

  // Carica le categorie e i video attivati per lo studente
  useEffect(() => {
    const loadActivatedVideos = async () => {
      if (!studentId) {
        setError('ID studente non disponibile. Effettua il login per vedere i contenuti.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Ottieni le attivazioni delle categorie per lo studente
        const { data: categoryActivations, error: categoryError } = await supabase
          .from('student_category_activations')
          .select(`
            category_id,
            video_categories(
              id, 
              title, 
              icon, 
              icon_color, 
              creator_id,
              creator:instructor_profiles(id, business_name, email)
            )
          `)
          .eq('student_id', studentId)
          .eq('is_active', true);

        if (categoryError) {
          console.error('Errore nel caricamento delle categorie attivate:', categoryError);
          setError('Errore nel caricamento delle categorie attivate');
          setLoading(false);
          return;
        }

        // Ottieni le attivazioni dei video per lo studente
        const { data: videoActivations, error: videoError } = await supabase
          .from('student_video_activations')
          .select(`
            video_id,
            videos(
              id, 
              title, 
              embed_url, 
              publish_date, 
              is_public, 
              category_id,
              creator_id,
              creator:instructor_profiles(id, business_name, email)
            )
          `)
          .eq('student_id', studentId)
          .eq('is_active', true);

        if (videoError) {
          console.error('Errore nel caricamento dei video attivati:', videoError);
          setError('Errore nel caricamento dei video attivati');
          setLoading(false);
          return;
        }

        // Estrai le categorie uniche e i loro creatori
        const uniqueCategories = new Map<string, VideoCategory>();
        const uniqueInstructors = new Map<string, {id: string, name: string}>();
        
        // Processa le categorie attivate
        categoryActivations.forEach((activation: any) => {
          const category = activation.video_categories;
          if (category) {
            const creatorId = category.creator_id;
            const creatorInfo = category.creator || {};
            
            uniqueCategories.set(category.id, {
              id: category.id,
              title: category.title || 'Categoria senza nome',
              icon: category.icon || 'video',
              icon_color: category.icon_color || 'blue',
              videos: [],
              creator_business_name: creatorInfo.business_name,
              creator_email: creatorInfo.email
            });

            // Aggiungi l'istruttore alla lista
            if (creatorId && !uniqueInstructors.has(creatorId)) {
              uniqueInstructors.set(creatorId, {
                id: creatorId,
                name: creatorInfo.business_name || creatorInfo.email || 'Istruttore sconosciuto'
              });
            }
          }
        });

        // Processa i video attivati
        videoActivations.forEach((activation: any) => {
          const video = activation.videos;
          if (video && video.category_id) {
            const categoryId = video.category_id;
            const creatorId = video.creator_id;
            const creatorInfo = video.creator || {};

            // Se la categoria non esiste ancora, creala
            if (!uniqueCategories.has(categoryId)) {
              uniqueCategories.set(categoryId, {
                id: categoryId,
                title: 'Categoria sconosciuta',
                icon: 'video',
                icon_color: 'blue',
                videos: [],
                creator_business_name: creatorInfo.business_name,
                creator_email: creatorInfo.email
              });
            }

            // Aggiungi il video alla categoria
            const category = uniqueCategories.get(categoryId);
            if (category) {
              category.videos.push({
                id: video.id,
                title: video.title,
                embed_url: video.embed_url,
                publish_date: video.publish_date,
                is_public: video.is_public,
                creator_business_name: creatorInfo.business_name,
                creator_email: creatorInfo.email
              });
            }

            // Aggiungi l'istruttore alla lista
            if (creatorId && !uniqueInstructors.has(creatorId)) {
              uniqueInstructors.set(creatorId, {
                id: creatorId,
                name: creatorInfo.business_name || creatorInfo.email || 'Istruttore sconosciuto'
              });
            }
          }
        });

        // Filtra le categorie senza video
        const categoriesArray = Array.from(uniqueCategories.values())
          .filter(category => category.videos.length > 0)
          .sort((a, b) => a.title.localeCompare(b.title));

        // Imposta le categorie e gli istruttori
        setCategories(categoriesArray);
        setFilteredCategories(categoriesArray);
        setInstructors(Array.from(uniqueInstructors.values())
          .sort((a, b) => a.name.localeCompare(b.name)));
        
      } catch (err) {
        console.error('Errore durante il caricamento dei contenuti attivati:', err);
        setError('Si è verificato un errore durante il caricamento dei contenuti');
      } finally {
        setLoading(false);
      }
    };

    loadActivatedVideos();
  }, [studentId]);

  // Filtra le categorie in base alla ricerca e all'istruttore selezionato
  useEffect(() => {
    let filtered = [...categories];
    
    // Filtra per istruttore
    if (filterInstructor) {
      filtered = filtered.filter(category => {
        // Trova l'id dell'istruttore dalla categoria
        const videos = category.videos.filter(video => {
          // Controlla se l'id dell'istruttore corrisponde
          const videoCreatorId = video.creator_business_name || video.creator_email;
          return videoCreatorId === filterInstructor;
        });
        
        if (videos.length > 0) {
          return {
            ...category,
            videos
          };
        }
        return false;
      });
    }
    
    // Filtra per termine di ricerca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.map(category => {
        // Se il titolo della categoria contiene il termine di ricerca, mantieni tutti i suoi video
        if (category.title.toLowerCase().includes(searchLower)) {
          return category;
        }
        
        // Altrimenti, filtra i video che contengono il termine di ricerca
        const filteredVideos = category.videos.filter(video => 
          video.title.toLowerCase().includes(searchLower)
        );
        
        if (filteredVideos.length > 0) {
          return {
            ...category,
            videos: filteredVideos
          };
        }
        
        return null;
      }).filter(Boolean) as VideoCategory[];
    }
    
    setFilteredCategories(filtered);
  }, [categories, searchTerm, filterInstructor]);

  // Gestisce l'espansione/collasso di una categoria
  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setSelectedVideo(null);
  };

  // Gestisce la selezione di un video
  const handleVideoClick = (video: VideoItem) => {
    setSelectedVideo(video);
  };

  // Resetta tutti i filtri
  const resetFilters = () => {
    setSearchTerm('');
    setFilterInstructor(null);
    setShowFilters(false);
  };

  // Formatta la data
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('it-IT', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">I Miei Video Didattici</h1>
      
      {/* Barra di ricerca e filtri */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Cerca nei video..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Nascondi filtri' : 'Mostra filtri'}
          </button>
          
          {(searchTerm || filterInstructor) && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
              Reset
            </button>
          )}
        </div>
      </div>
      
      {/* Pannello filtri */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filtri</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Istruttore
              </label>
              <select
                value={filterInstructor || ''}
                onChange={(e) => setFilterInstructor(e.target.value || null)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti gli istruttori</option>
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading || checkingQuizAccess ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-lg">
          {categories.length === 0 
            ? (hasQuizAccess 
                ? "Hai un codice QUIZ attivato, ma i video non sono ancora disponibili. Controlla più tardi o contatta il tuo istruttore."
                : "Non hai ancora attivato nessun video. Usa un codice di attivazione per accedere ai contenuti.")
            : "Nessun video corrisponde ai filtri selezionati."}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonna sinistra con l'elenco delle categorie */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
                <List className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Categorie
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
                {filteredCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      expandedCategory === category.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {category.title}
                        </h3>
                        {category.creator_business_name && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            {category.creator_business_name}
                          </p>
                        )}
                      </div>
                      <span className="bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 text-xs px-2 py-1 rounded-full">
                        {category.videos.length}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Colonna centrale e destra */}
          <div className="lg:col-span-2">
            {selectedVideo ? (
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-medium flex items-center gap-1 mb-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Torna alla lista
                  </button>
                  
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedVideo.title}
                  </h2>
                  
                  {selectedVideo.creator_business_name && (
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                      Creato da: {selectedVideo.creator_business_name}
                    </p>
                  )}
                  
                  <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                    Pubblicato il: {formatDate(selectedVideo.publish_date)}
                  </p>
                </div>
                
                <div className="aspect-video w-full">
                  <iframe
                    src={convertYouTubeUrl(selectedVideo.embed_url)}
                    className="w-full h-full"
                    allowFullScreen
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                </div>
              </div>
            ) : expandedCategory ? (
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {filteredCategories.find(c => c.id === expandedCategory)?.title}
                  </h2>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-4">
                    {filteredCategories
                      .find(c => c.id === expandedCategory)
                      ?.videos.map(video => (
                        <button
                          key={video.id}
                          onClick={() => handleVideoClick(video)}
                          className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                              <Video className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                                {video.title}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-slate-400">
                                {formatDate(video.publish_date)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 shadow-md rounded-lg p-8 flex flex-col items-center justify-center h-full">
                <Video className="w-16 h-16 text-blue-500 mb-4" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                  Seleziona una categoria
                </h3>
                <p className="text-gray-500 dark:text-slate-400 text-center">
                  Scegli una categoria dalla lista per visualizzare i video disponibili
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 