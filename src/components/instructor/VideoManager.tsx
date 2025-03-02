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

  const handleSaveCategory = async () => {
    try {
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

      await loadCategories();
      setShowCategoryModal(false);
      setCategoryForm({
        title: '',
        icon_color: 'blue',
        publish_date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error saving category:', error);
      setError('Errore durante il salvataggio della categoria');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVideo = async () => {
    try {
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
      } else {
        const { error: insertError } = await supabase
          .from('videos')
          .insert([videoData]);

        if (insertError) throw insertError;
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
      console.error('Error saving video:', error);
      setError('Errore durante il salvataggio del video');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (deleteError) throw deleteError;

      setCategories(prevCategories => 
        prevCategories.map(category => ({
          ...category,
          videos: category.videos.filter(video => video.id !== videoId)
        }))
      );

      setDeleteModal(null);
    } catch (error) {
      console.error('Error deleting video:', error);
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
              <div key={category.id} className="group relative rounded-xl border bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border-white/30 dark:border-slate-700/30 overflow-hidden hover:scale-[1.02] transition-all">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 ${color.bg} dark:${color.bg.replace('bg-', 'bg-')}/30 rounded-lg shadow-inner dark:shadow-none`}>
                      <Video className={`w-6 h-6 ${color.text} dark:text-opacity-90`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-white dark:text-slate-100">{category.title}</h3>
                      <p className="text-sm text-gray-200 dark:text-slate-300">
                        {category.videos.length} video
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {category.videos.map(video => (
                      <button
                        key={video.id}
                        onClick={() => setSelectedVideo(video)}
                        className="w-full text-left p-4 rounded-lg hover:bg-white/10 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <h4 className="font-medium mb-1 text-white dark:text-slate-100">{video.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-gray-200 dark:text-slate-400">
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
          title="Elimina Notifica"
          message={`Sei sicuro di voler eliminare la notifica "${deleteModal.title}"? Questa azione non può essere annullata.`}
          onConfirm={() => handleDelete(deleteModal.id)}
          onCancel={() => setDeleteModal(null)}
          isLoading={loading}
        />
      )}
    </div>
  );
}