import React, { useState, useEffect } from 'react';
import { Video, Calendar, Search, ArrowLeft, Plus, Settings, Edit, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { COLORS } from './QuizCreator';
import { DeleteModal } from '../common/DeleteModal';

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

interface VideoForm {
  title: string;
  embed_url: string;
  category_id: string;
  publish_date: string;
}

interface CategoryForm {
  title: string;
  icon_color: string;
  publish_date: string;
}

// Interfaccia per i dati restituiti dalla funzione RPC get_all_videos
interface VideoRPCResult {
  category_id: string;
  category_title: string;
  category_icon?: string;
  category_icon_color?: string;
  category_publish_date: string;
  video_id?: string;
  video_title?: string;
  video_embed_url?: string;
  video_publish_date?: string;
}

export function VideoManager() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ type: 'category' | 'video'; id: string; title: string } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [totalVideos, setTotalVideos] = useState<number>(0);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    title: '',
    icon_color: 'blue',
    publish_date: new Date().toISOString().split('T')[0]
  });
  const [videoForm, setVideoForm] = useState<VideoForm>({
    title: '',
    embed_url: '',
    category_id: '',
    publish_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      console.log('[VideoManager] Tentativo di caricamento delle categorie video...');
      setLoading(true);
      setError(null);

      // Prima verifichiamo quanti video ci sono nel database
      const { count: videoCount, error: countError } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('[VideoManager] Errore nel conteggio dei video:', countError);
      } else {
        console.log(`[VideoManager] Totale video nel database: ${videoCount || 0}`);
        setTotalVideos(videoCount || 0);
      }

      // Ora carichiamo le categorie con i video associati
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('video_categories')
        .select(`
          *,
          videos (*)
        `)
        .order('publish_date', { ascending: false });

      if (categoriesError) {
        console.error('[VideoManager] Errore nel caricamento delle categorie:', categoriesError);
        throw categoriesError;
      }
      
      // Contiamo il numero totale di video recuperati
      let retrievedVideosCount = 0;
      if (categoriesData) {
        categoriesData.forEach(category => {
          retrievedVideosCount += category.videos?.length || 0;
        });
      }
      
      console.log(`[VideoManager] Categorie caricate: ${categoriesData?.length || 0}, Video recuperati: ${retrievedVideosCount}/${videoCount || 0}`);
      
      // Se il numero di video recuperati è inferiore al totale, proviamo con la funzione RPC
      if (videoCount && retrievedVideosCount < videoCount) {
        console.log('[VideoManager] Tentativo di caricamento tramite RPC get_all_videos...');
        await loadCategoriesViaRPC();
        return;
      }
      
      // Se non ci sono dati o c'è un errore, usiamo i dati mock
      if (!categoriesData || categoriesData.length === 0) {
        console.log('[VideoManager] Nessuna categoria trovata, utilizzo dati mock');
        const mockCategories = getMockCategories();
        setCategories(mockCategories);
        setDebugInfo(`Visualizzazione dati mock - nessun dato trovato nel database. Totale video nel DB: ${videoCount || 0}`);
      } else {
        setCategories(categoriesData);
        setDebugInfo(`Dati caricati dal database: ${categoriesData.length} categorie, ${retrievedVideosCount}/${videoCount || 0} video`);
      }
    } catch (error) {
      console.error('[VideoManager] Errore durante il caricamento delle categorie:', error);
      setError('Errore durante il caricamento delle video lezioni');
      
      // Proviamo con la funzione RPC
      console.log('[VideoManager] Tentativo di caricamento tramite RPC get_all_videos dopo errore...');
      try {
        await loadCategoriesViaRPC();
        return;
      } catch (rpcError) {
        console.error('[VideoManager] Errore anche con RPC:', rpcError);
        
        // In caso di errore anche con RPC, usiamo i dati mock
        console.log('[VideoManager] Utilizzo dati mock a causa dell\'errore');
        const mockCategories = getMockCategories();
        setCategories(mockCategories);
        setDebugInfo(`Visualizzazione dati mock - errore di connessione al database. Totale video nel DB: ${totalVideos}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Funzione per caricare le categorie tramite RPC
  const loadCategoriesViaRPC = async () => {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_videos');
      
      if (rpcError) {
        console.error('[VideoManager] Errore nel caricamento tramite RPC:', rpcError);
        throw rpcError;
      }
      
      console.log('[VideoManager] Dati RPC ricevuti:', rpcData?.length || 0, 'record');
      
      if (!rpcData || rpcData.length === 0) {
        console.log('[VideoManager] Nessun dato RPC trovato, utilizzo dati mock');
        const mockCategories = getMockCategories();
        setCategories(mockCategories);
        setDebugInfo('Visualizzazione dati mock - nessun dato trovato tramite RPC');
        return;
      }
      
      // Trasformiamo i dati RPC nel formato richiesto
      const categoriesMap = new Map<string, any>();
      
      (rpcData as VideoRPCResult[]).forEach(item => {
        if (!item.category_id) return;
        
        // Se la categoria non esiste ancora nella mappa, la creiamo
        if (!categoriesMap.has(item.category_id)) {
          categoriesMap.set(item.category_id, {
            id: item.category_id,
            title: item.category_title,
            icon: item.category_icon || 'video',
            icon_color: item.category_icon_color || 'blue',
            publish_date: item.category_publish_date,
            videos: []
          });
        }
        
        // Aggiungiamo il video alla categoria se esiste
        if (item.video_id) {
          const category = categoriesMap.get(item.category_id);
          if (category) {
            category.videos.push({
              id: item.video_id,
              category_id: item.category_id,
              title: item.video_title || '',
              embed_url: item.video_embed_url || '',
              publish_date: item.video_publish_date || ''
            });
          }
        }
      });
      
      // Convertiamo la mappa in array
      const categoriesArray = Array.from(categoriesMap.values());
      console.log('[VideoManager] Categorie processate da RPC:', categoriesArray.length);
      
      // Contiamo il numero totale di video
      let totalVideosFromRPC = 0;
      categoriesArray.forEach(category => {
        totalVideosFromRPC += category.videos.length;
      });
      
      console.log('[VideoManager] Video totali da RPC:', totalVideosFromRPC);
      
      setCategories(categoriesArray);
      setDebugInfo(`Dati caricati tramite RPC: ${categoriesArray.length} categorie, ${totalVideosFromRPC} video`);
    } catch (error) {
      console.error('[VideoManager] Errore durante il caricamento tramite RPC:', error);
      throw error;
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

  const handleSaveCategory = async () => {
    try {
      console.log('[VideoManager] Tentativo di salvataggio categoria:', categoryForm);
      setLoading(true);
      setError(null);

      const { data: category, error: categoryError } = await supabase
        .from('video_categories')
        .insert([{
          title: categoryForm.title,
          icon_color: categoryForm.icon_color,
          publish_date: new Date(categoryForm.publish_date).toISOString()
        }])
        .select()
        .single();

      if (categoryError) throw categoryError;
      
      console.log('[VideoManager] Categoria salvata con successo');
      await loadCategories();
      setShowCategoryModal(false);
      setCategoryForm({
        title: '',
        icon_color: 'blue',
        publish_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('[VideoManager] Errore durante il salvataggio della categoria:', error);
      setError('Errore durante il salvataggio della categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVideo = async () => {
    try {
      console.log('[VideoManager] Tentativo di salvataggio video:', videoForm);
      setLoading(true);
      setError(null);

      const videoData = {
        title: videoForm.title,
        embed_url: videoForm.embed_url,
        category_id: videoForm.category_id,
        publish_date: new Date(videoForm.publish_date).toISOString()
      };

      if (editingVideo) {
        const { error: updateError } = await supabase
          .from('videos')
          .update(videoData)
          .eq('id', editingVideo.id);

        if (updateError) throw updateError;
        console.log('[VideoManager] Video aggiornato con successo');
      } else {
        const { error: insertError } = await supabase
          .from('videos')
          .insert([videoData]);

        if (insertError) throw insertError;
        console.log('[VideoManager] Nuovo video creato con successo');
      }

      await loadCategories();
      setShowVideoModal(false);
      setEditingVideo(null);
      setVideoForm({
        title: '',
        embed_url: '',
        category_id: '',
        publish_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('[VideoManager] Errore durante il salvataggio del video:', error);
      setError('Errore durante il salvataggio del video');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      console.log('[VideoManager] Tentativo di eliminazione video:', videoId);
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (deleteError) throw deleteError;

      console.log('[VideoManager] Video eliminato con successo');
      setCategories(prevCategories => 
        prevCategories.map(category => ({
          ...category,
          videos: category.videos.filter(video => video.id !== videoId)
        }))
      );

      setDeleteModal(null);
    } catch (error) {
      console.error('[VideoManager] Errore durante l\'eliminazione del video:', error);
      setError('Errore durante l\'eliminazione del video');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h2 className="text-3xl font-light text-white dark:text-slate-50">Video Lezioni</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca video..."
              className="pl-10 pr-4 py-2 rounded-lg border border-white/30 dark:border-slate-700/30 bg-white/10 dark:bg-slate-800/10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-400"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuova Categoria
          </button>
        </div>
      </div>

      {debugInfo && (
        <div className="bg-blue-50/20 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-700 p-4 rounded-lg mb-4">
          <p className="text-blue-700 dark:text-blue-400">{debugInfo}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50/20 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl shadow-lg p-8">
          <p className="text-center text-white dark:text-slate-400">Caricamento video lezioni...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl shadow-lg p-8">
          <p className="text-center text-white dark:text-slate-400">
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
                className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 ${color.bg} rounded-lg`}>
                        <Video className={`w-6 h-6 ${color.text}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white dark:text-slate-100">{category.title}</h3>
                        <p className="text-sm text-gray-300 dark:text-slate-400">
                          {category.videos.length} video • {formatDate(category.publish_date)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setVideoForm({
                            ...videoForm,
                            category_id: category.id
                          });
                          setShowVideoModal(true);
                        }}
                        className="text-white/70 hover:text-white dark:text-slate-400 dark:hover:text-white transition-colors"
                        title="Aggiungi video a questa categoria"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {category.videos.map(video => (
                      <div
                        key={video.id}
                        className="p-3 rounded-lg bg-white/10 dark:bg-slate-800/30 hover:bg-white/20 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-blue-300 dark:text-blue-400 group-hover:text-blue-200 dark:group-hover:text-blue-300 transition-colors">
                            {video.title}
                          </h4>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingVideo(video);
                                setVideoForm({
                                  title: video.title,
                                  embed_url: video.embed_url,
                                  category_id: video.category_id,
                                  publish_date: new Date(video.publish_date).toISOString().split('T')[0]
                                });
                                setShowVideoModal(true);
                              }}
                              className="text-white/70 hover:text-white dark:text-slate-400 dark:hover:text-white p-1"
                              title="Modifica video"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({
                                type: 'video',
                                id: video.id,
                                title: video.title
                              })}
                              className="text-white/70 hover:text-red-400 dark:text-slate-400 dark:hover:text-red-400 p-1"
                              title="Elimina video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300 dark:text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(video.publish_date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-xl shadow-xl max-w-lg w-full border border-white/30 dark:border-slate-700/30">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Nuova Categoria</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={categoryForm.title}
                  onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Inserisci il titolo della categoria"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Colore *
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {Object.entries(COLORS).map(([name, color]) => (
                    <button
                      key={name}
                      onClick={() => setCategoryForm({ ...categoryForm, icon_color: name })}
                      className={`p-4 rounded-lg border ${
                        categoryForm.icon_color === name
                          ? 'border-blue-500'
                          : 'border-gray-200 hover:border-blue-300'
                      } transition-colors flex flex-col items-center gap-2`}
                    >
                      <div className={`p-3 ${color.bg} rounded-lg`}>
                        <Video className={`w-6 h-6 ${color.text}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Data di Pubblicazione *
                </label>
                <input
                  type="date"
                  value={categoryForm.publish_date}
                  onChange={(e) => setCategoryForm({ ...categoryForm, publish_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSaveCategory}
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Salvataggio...' : 'Salva Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteModal 
          title={`Eliminare ${deleteModal.type === 'category' ? 'la categoria' : 'il video'} "${deleteModal.title}"?`}
          message={`Questa azione non può essere annullata.`}
          onConfirm={() => {
            if (deleteModal.type === 'video') {
              handleDeleteVideo(deleteModal.id);
            }
          }}
          onCancel={() => setDeleteModal(null)}
          isLoading={loading}
        />
      )}
    </div>
  );
}