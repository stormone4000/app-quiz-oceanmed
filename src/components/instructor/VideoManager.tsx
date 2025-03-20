import React, { useState, useEffect, useMemo } from 'react';
import { Video, Calendar, Search, ArrowLeft, Plus, Settings, Edit, Trash2, X, Save, Eye, EyeOff, Filter, User, UserCog, PlusCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase-client';
import { initializeRealtimeConnection } from '../../lib/supabase-client';
import { COLORS } from './QuizCreator';
import { DeleteModal } from '../common/DeleteModal';
import { convertYouTubeUrl } from '../../utils/videoUtils';
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { AlertCircle } from "lucide-react";
import { ConnectionStatus } from '../ui/ConnectionStatus';

interface VideoCategory {
  id: string;
  title: string;
  icon: string;
  icon_color: string;
  publish_date: string;
  videos: VideoItem[];
  creator_business_name?: string;
  creator_email?: string;
  creator_id?: string;
}

interface VideoItem {
  id: string;
  category_id: string;
  title: string;
  embed_url: string;
  publish_date: string;
  is_public: boolean;
  creator_business_name?: string;
  creator_email?: string;
  creator_id?: string;
}

interface VideoForm {
  title: string;
  embed_url: string;
  category_id: string;
  publish_date: string;
  is_public: boolean;
}

interface CategoryForm {
  title: string;
  icon_color: string;
  publish_date: string;
}

// Aggiorniamo le interfacce per le query di Supabase per renderle più flessibili
interface VideoCategoryResult {
  id: string;
  title: string;
  icon?: string;
  icon_color?: string;
  publish_date?: string;
}

interface VideoResult {
  id: string;
  title: string;
  embed_url: string;
  publish_date: string;
  is_public: boolean;
  category_id: string;
  video_categories?: VideoCategoryResult;
}

interface InstructorProfileResult {
  id: string;
  email: string;
  business_name?: string;
}

interface VideoJoinResult {
  video_id: string;
  videos?: {
    id: string;
    title: string;
    embed_url: string;
    publish_date: string;
    is_public: boolean;
    category_id: string;
    video_categories?: VideoCategoryResult;
  };
  instructor_profiles?: InstructorProfileResult;
}

interface ProcessedVideoData {
  category_id: string;
  category_title: string;
  category_icon: string;
  category_icon_color: string;
  category_publish_date?: string;
  creator_business_name?: string | null;
  creator_email?: string | null;
  creator_id?: string | null;
  video_id: string;
  video_title: string;
  video_embed_url: string;
  video_publish_date: string;
  video_is_public: boolean;
  is_admin_video?: boolean;
}

// Interfaccia per i dati restituiti dalla funzione RPC get_all_videos
interface VideoRPCResult {
  category_id: string;
  category_title: string;
  category_icon?: string;
  category_icon_color?: string;
  category_publish_date: string;
  category_is_public?: boolean;
  video_id?: string;
  video_title?: string;
  video_embed_url?: string;
  video_publish_date?: string;
  video_is_public?: boolean;
}

interface VideoManagerProps {
  userEmail?: string;
}

export function VideoManager({ userEmail }: VideoManagerProps) {
  // Dichiarazione degli stati del componente
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<VideoCategory[]>([]);
  const [totalVideos, setTotalVideos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ type: 'category' | 'video'; id: string; title: string } | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>({
    title: '',
    icon_color: 'blue',
    publish_date: new Date().toISOString().split('T')[0]
  });
  const [videoForm, setVideoForm] = useState<VideoForm>({
    title: '',
    embed_url: '',
    category_id: '',
    publish_date: new Date().toISOString().split('T')[0],
    is_public: true
  });
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [showAddVideoForm, setShowAddVideoForm] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [videoFilter, setVideoFilter] = useState<'all' | 'admin' | 'my'>('all');
  
  // Aggiungiamo un nuovo stato per il form di categoria inline
  const [showInlineCategoryForm, setShowInlineCategoryForm] = useState(false);
  const [inlineCategoryForm, setInlineCategoryForm] = useState<CategoryForm>({
    title: '',
    icon_color: 'blue',
    publish_date: new Date().toISOString().split('T')[0]
  });
  const [authError, setAuthError] = useState<string | null>(null);

  // Carica l'ID dell'istruttore e verifica se è un amministratore
  useEffect(() => {
    const loadInstructorInfo = async () => {
      try {
        // Prima verifichiamo se c'è una sessione attiva
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.debug('[VideoManager] Errore nel recupero della sessione:', sessionError.message);
          return;
        }

        if (!session) {
          console.debug('[VideoManager] Nessuna sessione attiva');
          return;
        }

        // Se abbiamo una sessione valida, procediamo con il caricamento del profilo
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.debug('[VideoManager] Errore nel recupero dell\'utente:', userError.message);
          return;
        }

        if (!user) {
          console.debug('[VideoManager] Utente non trovato');
          return;
        }

        // Carica il profilo dell'istruttore usando l'email dell'utente autenticato
        const { data: instructorData, error: instructorError } = await supabase
          .from('instructor_profiles')
          .select('id, master_code, email, business_name')
          .eq('email', user.email)
          .single();

        if (instructorError) {
          console.debug('[VideoManager] Errore nel caricamento del profilo istruttore:', instructorError.message);
          return;
        }

        if (instructorData) {
          console.debug('[VideoManager] Profilo istruttore caricato:', instructorData);
          setInstructorId(instructorData.id);
          setIsAdmin(!!instructorData.master_code);
          setAuthError(null);
          
          // Carica le categorie e i video
          await loadCategories();
        } else {
          console.debug('[VideoManager] Nessun profilo istruttore trovato');
          setAuthError('Profilo istruttore non trovato. Contatta l\'amministratore.');
        }
      } catch (error) {
        console.error('[VideoManager] Errore generico:', error);
        setAuthError('Si è verificato un errore. Riprova più tardi.');
      }
    };

    // Sottoscrizione agli eventi di autenticazione
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.debug('[VideoManager] Evento auth:', event, 'Sessione:', session?.user?.email);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadInstructorInfo();
      }
    });

    // Carica le informazioni all'avvio
    loadInstructorInfo();

    // Pulizia della sottoscrizione
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      try {
        // Inizializza la connessione realtime
        initializeRealtimeConnection();

        // Configura i listener per gli aggiornamenti
        const channel = supabase
          .channel('video-changes')
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'videos' 
            }, 
            () => {
              // Ricarica i video quando ci sono cambiamenti
              loadCategories();
            }
          )
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'video_categories'
            },
            () => {
              // Ricarica le categorie quando ci sono cambiamenti
              loadCategories();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Errore nella configurazione realtime:', error);
      }
    };

    setupRealtimeSubscription();
  }, []);

  // Effetto per filtrare le categorie in base alla ricerca
  useEffect(() => {
    // Controllo difensivo per evitare cicli infiniti
    if (!Array.isArray(categories)) {
      console.warn('[VideoManager] categories non è un array:', categories);
      setFilteredCategories([]);
        return;
    }
    
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    // Funzione per verificare se un video corrisponde alla ricerca
    const videoMatches = (video: VideoItem) => {
      if (!video) return false;
      return (
        (video.title && video.title.toLowerCase().includes(searchTermLower)) ||
        (video.embed_url && video.embed_url.toLowerCase().includes(searchTermLower))
      );
    };
    
    // Filtra le categorie che hanno video corrispondenti o il cui titolo corrisponde
    const filtered = categories
      .map(category => {
        if (!category) return null;
        
        // Se il titolo della categoria corrisponde, includi l'intera categoria
        if (category.title && category.title.toLowerCase().includes(searchTermLower)) {
          return category;
        }
        
        // Altrimenti, filtra i video che corrispondono
        if (Array.isArray(category.videos)) {
          const matchingVideos = category.videos.filter(videoMatches);
          
          if (matchingVideos.length > 0) {
            // Crea una nuova categoria con solo i video corrispondenti
            return {
              ...category,
              videos: matchingVideos
            };
          }
        }
        
        // Se non ci sono corrispondenze, non includere questa categoria
        return null;
      })
      .filter(Boolean) as VideoCategory[]; // Filtra le categorie null
    
    setFilteredCategories(filtered);
  }, [categories, searchTerm]);
  
  // Monitora i cambiamenti allo stato videoForm per debugging
  useEffect(() => {
    // Controllo difensivo per evitare cicli infiniti
    const categoryId = videoForm.category_id;
    if (!categoryId) return;
    
    // Controllo che la categoria esista nella lista
    if (Array.isArray(categories) && categories.length > 0) {
      const categoryExists = categories.some(c => c && c.id === categoryId);
      if (!categoryExists) {
        console.warn(`[VideoManager] Categoria con ID ${categoryId} non trovata nell'elenco delle categorie`);
      } else {
        console.log(`[VideoManager] Form video aggiornato con categoria valida: ${categoryId}`);
      }
    }
  }, [videoForm.category_id, categories]);

  // Log dello stato iniziale
  useEffect(() => {
    console.log('VideoManager stato iniziale:');
    console.log('- userEmail:', userEmail);
    console.log('- isAdmin:', isAdmin);
    console.log('- instructorId:', instructorId);
    console.log('- videoFilter:', videoFilter);
  }, [userEmail, isAdmin, instructorId, videoFilter]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      console.debug('[VideoManager] Caricamento categorie e video...');

      // Verifica la sessione
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessione non valida');
      }

      // Carica il profilo dell'istruttore
      const { data: instructorData, error: instructorError } = await supabase
        .from('instructor_profiles')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (instructorError) throw instructorError;
      if (!instructorData) throw new Error('Profilo istruttore non trovato');

      setInstructorId(instructorData.id);
      setIsAdmin(instructorData.is_admin || false);

      // Carica tutte le categorie
      const { data: categories, error: categoriesError } = await supabase
        .from('video_categories')
        .select('*')
        .order('title', { ascending: true });

      if (categoriesError) throw categoriesError;

      // Carica i video in base al ruolo
      let videosQuery = supabase
        .from('videos')
        .select(`
          id,
          title,
          embed_url,
          category_id,
          publish_date,
          is_public,
          creator_id
        `)
        .order('title', { ascending: true });

      // Se non è admin, filtra solo i video dell'istruttore
      if (!instructorData.is_admin) {
        videosQuery = videosQuery.eq('creator_id', instructorData.id);
      }

      const { data: videos, error: videosError } = await videosQuery;

      if (videosError) throw videosError;

      // Log per debugging
      console.debug('[VideoManager] Dati caricati:', {
        instructorId: instructorData.id,
        isAdmin: instructorData.is_admin,
        categoriesCount: categories?.length || 0,
        videosCount: videos?.length || 0
      });

      // Organizza i video per categoria
      const processedCategories = categories.map(category => ({
        ...category,
        videos: videos.filter(video => video.category_id === category.id) || []
      }));

      // Filtra le categorie vuote se non è admin
      const finalCategories = instructorData.is_admin 
        ? processedCategories 
        : processedCategories.filter(cat => cat.videos.length > 0);

      setCategories(finalCategories);
      setFilteredCategories(finalCategories);
      setTotalVideos(videos.length);
      setError(null);
    } catch (error) {
      console.error('[VideoManager] Errore nel caricamento:', error);
      setError('Errore nel caricamento dei contenuti. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const processRpcData = (rpcData: ProcessedVideoData[]): VideoCategory[] => {
    try {
      // Controllo difensivo all'inizio
      if (!rpcData || !Array.isArray(rpcData)) {
        console.error('[VideoManager] processRpcData: rpcData non valido', rpcData);
        return [];
      }
      
      // Trasformare i dati RPC in categorie organizzate
      const categoriesMap = new Map<string, VideoCategory>();
      
      // Prima passiamo attraverso tutti i record per creare le categorie
      rpcData.forEach((item) => {
        // Controllo difensivo per ogni item
        if (!item || !item.category_id) return;
        
        if (!categoriesMap.has(item.category_id)) {
          categoriesMap.set(item.category_id, {
            id: item.category_id,
            title: item.category_title || 'Categoria senza nome',
            icon: item.category_icon || 'book',
            icon_color: item.category_icon_color || 'blue',
            publish_date: item.category_publish_date || '',
            videos: [],
            creator_business_name: item.creator_business_name || undefined,
            creator_email: item.creator_email || undefined,
            creator_id: item.creator_id || undefined
          });
        }
      });
      
      // Poi aggiungiamo i video alle categorie con controlli difensivi
      rpcData.forEach((item) => {
        if (!item || !item.video_id || !item.category_id) return;
        
          const category = categoriesMap.get(item.category_id);
        if (!category) return;
        
        // Controlliamo che il video non sia già presente nella categoria
        // Utilizziamo un controllo difensivo anche per l'array videos
        if (!Array.isArray(category.videos)) {
          category.videos = [];
        }
        
        const videoExists = category.videos.some(v => v && v.id === item.video_id);
        if (videoExists) return;
        
            category.videos.push({
              id: item.video_id,
              category_id: item.category_id,
          title: item.video_title || 'Video senza titolo',
              embed_url: item.video_embed_url || '',
          publish_date: item.video_publish_date || new Date().toISOString(),
          is_public: !!item.video_is_public,
          creator_business_name: item.creator_business_name || undefined,
          creator_email: item.creator_email || undefined,
          creator_id: item.creator_id || undefined
        });
      });
      
      // Convertiamo la mappa in un array e ordiniamo le categorie per titolo
      const result = Array.from(categoriesMap.values())
        .filter(category => !!category) // Filtro aggiuntivo di sicurezza
        .sort((a, b) => {
          // Controlli difensivi per il sort
          const titleA = a.title || '';
          const titleB = b.title || '';
          return titleA.localeCompare(titleB);
        });
      
      console.log(`[VideoManager] Dati processati: ${result.length} categorie`);
      
      // Restituiamo i dati processati
      return result;
    } catch (err) {
      console.error('[VideoManager] Errore durante il processing dei dati RPC:', err);
      return []; // Restituiamo un array vuoto in caso di errore
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
            publish_date: '2025-01-22T00:00:00+00:00',
            is_public: true,
            creator_business_name: 'Business Name 1',
            creator_email: 'business1@example.com'
          },
          {
            id: '480f607b-dde7-457a-ac9d-e6d1ef49be90',
            category_id: '8a681940-d666-4987-8e04-e379f17b453d',
            title: 'Fanali di Navigazione',
            embed_url: 'https://screenpal.com/player/cYl6XbNRuk?ff=1&title=0&width=100%&height=100%',
            publish_date: '2025-01-22T00:00:00+00:00',
            is_public: true,
            creator_business_name: 'Business Name 2',
            creator_email: 'business2@example.com'
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
            publish_date: '2025-01-22T00:00:00+00:00',
            is_public: true,
            creator_business_name: 'Business Name 3',
            creator_email: 'business3@example.com'
          },
          {
            id: '65a3f467-1294-4eef-874f-2941de4ad2b8',
            category_id: '55e78da5-9d0a-43f4-89f9-9cd148e5169e',
            title: 'Lezione di Vela',
            embed_url: 'https://screenpal.com/player/cr12qDV1cRv?ff=1&title=0&width=100%&height=100%',
            publish_date: '2025-01-22T00:00:00+00:00',
            is_public: true,
            creator_business_name: 'Business Name 4',
            creator_email: 'business4@example.com'
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
            publish_date: '2025-01-22T00:00:00+00:00',
            is_public: true,
            creator_business_name: 'Business Name 5',
            creator_email: 'business5@example.com'
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

      // Verifica che l'ID istruttore sia disponibile
      if (!instructorId) {
        console.error('[VideoManager] ID istruttore non disponibile. Impossibile salvare la categoria.');
        setError('ID istruttore non disponibile. Impossibile salvare la categoria.');
        setLoading(false);
        return;
      }

      // Validazione dei campi richiesti
      if (!categoryForm.title.trim()) {
        setError("Il titolo della categoria è obbligatorio");
        setLoading(false);
        return;
      }

      const categoryData = {
        title: categoryForm.title.trim(),
        icon_color: categoryForm.icon_color,
        publish_date: new Date(categoryForm.publish_date).toISOString(),
        creator_id: instructorId,  // Imposto esplicitamente il creator_id
        icon: 'video',
        is_public: true
      };

      console.log('[VideoManager] Dati categoria da salvare:', categoryData);

      const { data: category, error: categoryError } = await supabase
        .from('video_categories')
        .insert([categoryData])
        .select()
        .single();

      if (categoryError) {
        console.error('[VideoManager] Errore nel salvare la categoria:', categoryError);
        throw categoryError;
      }
      
      console.log('[VideoManager] Categoria salvata con successo:', category);
      
      // Aggiungi immediatamente la nuova categoria all'elenco senza ricaricare
      if (category) {
        const newCategory: VideoCategory = {
          id: category.id,
          title: category.title,
          icon: category.icon || 'video',
          icon_color: category.icon_color || 'blue',
          publish_date: category.publish_date,
          videos: [],
          creator_id: category.creator_id,
          creator_email: userEmail,
          creator_business_name: 'Istruttore'
        };
        
        setCategories(prevCategories => [...prevCategories, newCategory]);
        setFilteredCategories(prevFilteredCategories => [...prevFilteredCategories, newCategory]);
      }
      
      // Ricarica comunque tutte le categorie per sicurezza
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
      setLoading(true);
      setFormError(null);

      // Validazione dei campi obbligatori
      if (!videoForm.title || !videoForm.embed_url || !videoForm.category_id || !videoForm.publish_date) {
        setFormError('Tutti i campi contrassegnati con * sono obbligatori.');
        setLoading(false);
        return;
      }

      // Verifica che l'ID istruttore sia disponibile
      if (!instructorId) {
        console.error('[VideoManager] ID istruttore non disponibile. Impossibile salvare il video.');
        setFormError('ID istruttore non disponibile. Impossibile salvare il video.');
        setLoading(false);
        return;
      }

      // Preparazione dei dati del form
      const formData = {
        title: videoForm.title.trim(),
        embed_url: videoForm.embed_url.trim(),
        category_id: videoForm.category_id,
        publish_date: videoForm.publish_date,
        is_public: videoForm.is_public,
        creator_id: instructorId  // Imposto esplicitamente il creator_id
      };

      console.log(`[VideoManager] Salvando video: ${JSON.stringify(formData)}`);

      // Inserimento o aggiornamento del video
      let result;
      let videoId;

      if (editingVideo) {
        // Aggiornamento di un video esistente
        result = await supabase
          .from('videos')
          .update({
            title: formData.title,
            embed_url: formData.embed_url,
            category_id: formData.category_id,
            publish_date: formData.publish_date,
            is_public: formData.is_public,
            creator_id: instructorId  // Imposto esplicitamente il creator_id
          })
          .eq('id', editingVideo.id);

        videoId = editingVideo.id;
      } else {
        // Creazione di un nuovo video
        result = await supabase
          .from('videos')
          .insert([{
            title: formData.title,
            embed_url: formData.embed_url,
            category_id: formData.category_id,
            publish_date: formData.publish_date,
            is_public: formData.is_public,
            creator_id: instructorId  // Imposto esplicitamente il creator_id
          }])
          .select();

        videoId = result.data && result.data[0] ? result.data[0].id : null;
      }

      if (result.error) {
        console.error('[VideoManager] Errore nel salvare il video:', result.error);
        setFormError(`Errore nel salvare il video: ${result.error.message}`);
        setLoading(false);
        return;
      }

      console.log(`[VideoManager] Video salvato con successo, ID: ${videoId}`);

      // Chiudi il modale e aggiorna la lista
      setShowVideoModal(false);
      setEditingVideo(null);
      resetVideoForm();
      
      // Aggiorna i dati dopo il salvataggio
      await loadCategories();

      setLoading(false);
    } catch (err) {
      console.error('[VideoManager] Errore durante il salvataggio del video:', err);
      setFormError(`Si è verificato un errore: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
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

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      console.log('[VideoManager] Tentativo di eliminazione categoria:', categoryId);
      setLoading(true);
      setError(null);

      // Prima verifichiamo se ci sono video nella categoria
      const categoryToDelete = categories.find(cat => cat.id === categoryId);
      
      if (categoryToDelete && categoryToDelete.videos.length > 0) {
        setError('Impossibile eliminare la categoria: contiene ancora dei video. Rimuovi prima tutti i video dalla categoria.');
        setDeleteModal(null);
        return;
      }

      // Eliminiamo la categoria
      const { error: deleteError } = await supabase
        .from('video_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;

      console.log('[VideoManager] Categoria eliminata con successo');
      
      // Aggiorniamo lo stato locale rimuovendo la categoria
      setCategories(prevCategories => 
        prevCategories.filter(category => category.id !== categoryId)
      );

      setDeleteModal(null);
    } catch (error) {
      console.error('[VideoManager] Errore durante l\'eliminazione della categoria:', error);
      setError('Errore durante l\'eliminazione della categoria');
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

  const handleVideoClick = (video: VideoItem) => {
    console.log('[VideoManager] Video cliccato:', video);
    setSelectedVideo(video);
  };

  const handleSaveInlineCategory = async () => {
    try {
      setLoading(true);
      setFormError(null);

      // Validazione dei campi richiesti
      if (!inlineCategoryForm.title.trim()) {
        setFormError("Il titolo della categoria è obbligatorio");
        setLoading(false);
        return;
      }

      if (!inlineCategoryForm.icon_color) {
        setFormError("Seleziona un colore per la categoria");
        setLoading(false);
        return;
      }

      // Verifica che l'ID istruttore sia disponibile
      if (!instructorId) {
        console.error('[VideoManager] ID istruttore non disponibile. Impossibile salvare la categoria inline.');
        setFormError('ID istruttore non disponibile. Impossibile salvare la categoria.');
        setLoading(false);
        return;
      }

      const categoryData = {
        title: inlineCategoryForm.title.trim(),
        icon: 'video', // Icona predefinita
        icon_color: inlineCategoryForm.icon_color,
        publish_date: new Date().toISOString(),
        creator_id: instructorId,  // Imposto esplicitamente il creator_id
        is_public: true
      };

      console.log('[VideoManager] Dati categoria inline da salvare:', categoryData);

      // Salvataggio della categoria in Supabase
      const { data: newCategory, error: categoryError } = await supabase
        .from('video_categories')
        .insert([categoryData])
        .select()
        .single();

      if (categoryError) {
        console.error('[VideoManager] Errore nel salvare la categoria inline:', categoryError);
        throw categoryError;
      }

      console.log('[VideoManager] Categoria inline salvata con successo:', newCategory);

      // Aggiorna la lista delle categorie immediatamente senza ricaricare dal database
      if (newCategory) {
        // Crea un nuovo oggetto categoria nel formato corretto
        const newCategoryObj: VideoCategory = {
          id: newCategory.id,
          title: newCategory.title,
          icon: newCategory.icon || 'video',
          icon_color: newCategory.icon_color || 'blue',
          publish_date: newCategory.publish_date,
          videos: [],
          creator_id: newCategory.creator_id,
          creator_email: userEmail,
          creator_business_name: 'Istruttore'
        };

        // Aggiorna lo stato delle categorie aggiungendo la nuova categoria
        setCategories(prevCategories => {
          // Verifica se la categoria esiste già per evitare duplicati
          const categoryExists = prevCategories.some(c => c.id === newCategory.id);
          if (categoryExists) {
            return prevCategories;
          }
          return [...prevCategories, newCategoryObj];
        });

        // Aggiorna anche le categorie filtrate
        setFilteredCategories(prevFilteredCategories => {
          const categoryExists = prevFilteredCategories.some(c => c.id === newCategory.id);
          if (categoryExists) {
            return prevFilteredCategories;
          }
          return [...prevFilteredCategories, newCategoryObj];
        });

        // Imposta la categoria nel form del video
        setVideoForm({
          ...videoForm,
          category_id: newCategory.id
        });

        // Resetta il form della categoria e chiudi il form inline
        setInlineCategoryForm({
          title: '',
          icon_color: 'blue',
          publish_date: new Date().toISOString().split('T')[0]
        });
        setShowInlineCategoryForm(false);
      }

      setLoading(false);
    } catch (err) {
      console.error('[VideoManager] Errore durante il salvataggio della categoria:', err);
      setFormError(`Si è verificato un errore: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
      setLoading(false);
    }
  };

  const resetVideoForm = () => {
    setVideoForm({
      title: '',
      embed_url: '',
      category_id: '',
      publish_date: new Date().toISOString().split('T')[0],
      is_public: true
    });
  };

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

        <div className="bg-white/20 dark:bg-slate-800/20 backdrop-blur-lg border border-white/30 dark:border-slate-700/30 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/20 dark:border-slate-700/30">
            <h3 className="text-xl font-bold mb-2 text-white">{selectedVideo.title}</h3>
            <p className="text-gray-300">
              Pubblicato il {formatDate(selectedVideo.publish_date)}
            </p>
          </div>

          <div className="aspect-video">
            <iframe
              src={convertYouTubeUrl(selectedVideo.embed_url)}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ConnectionStatus />
      {authError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore di Autenticazione</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Video Didattici
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            Gestisci i video didattici disponibili per gli utenti
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              setVideoForm({
                ...videoForm,
                title: '',
                embed_url: '',
                category_id: '',
                publish_date: new Date().toISOString().split('T')[0],
                is_public: true
              });
              setEditingVideo(null);
              setShowVideoModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Video className="w-4 h-4" />
            <span>Aggiungi Video</span>
          </button>
          <button
            onClick={() => setShowAddCategoryForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Aggiungi Categoria</span>
          </button>
        </div>
      </div>
      
      {/* Search bar */}
      <div className="mb-8">
        <div className="relative max-w-xl mx-auto">
            <input
              type="text"
            placeholder="Cerca video per titolo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
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
        <div className="bg-violet-800/10 dark:bg-violet-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl p-8">
          <p className="text-center text-slate-900 dark:text-slate-100">Caricamento video lezioni...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="bg-violet-800/10 dark:bg-violet-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl p-8">
          <p className="text-center text-slate-900 dark:text-slate-100">
            {searchTerm ? 'Nessun risultato trovato' : 'Nessuna video lezione disponibile'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCategories.map(category => {
            // Controllo difensivo per categoria
            if (!category || !category.id) return null;
            
            const color = category.icon_color && COLORS[category.icon_color as keyof typeof COLORS] 
              ? COLORS[category.icon_color as keyof typeof COLORS] 
              : COLORS.blue;
            
            return (
              <div
                key={category.id}
                className="bg-violet-800/10 dark:bg-violet-800/20 backdrop-blur-lg border border-white/30 dark:border-violet-100/30 rounded-xl overflow-hidden transition-all"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-3 ${color.bg} rounded-lg`}>
                        <Video className={`w-6 h-6 ${color.text}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{category.title || 'Categoria senza nome'}</h3>
                        <p className="text-sm text-slate-700 dark:text-slate-400">
                          {Array.isArray(category.videos) ? category.videos.length : 0} video • {formatDate(category.publish_date || '')}
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
                        className="text-white/70 hover:text-white dark:text-slate-400 dark:hover:text-white transition-colors p-1.5 bg-blue-600/20 dark:bg-blue-600/30 hover:bg-blue-600/40 rounded-full"
                        title="Aggiungi video a questa categoria"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => setDeleteModal({ type: 'category', id: category.id, title: category.title })}
                        className="text-white/70 hover:text-white dark:text-slate-400 dark:hover:text-white transition-colors p-1.5 bg-red-600/20 dark:bg-red-600/30 hover:bg-red-600/40 rounded-full"
                        title="Elimina questa categoria"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {category.videos && Array.isArray(category.videos) && category.videos.length > 0 ? (
                      category.videos.map(video => {
                        // Controllo difensivo per video
                        if (!video || !video.id) return null;
                        
                        return (
                        <div
                          key={video.id}
                          className="flex items-center justify-between p-4 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <div>
                              <h4 className="font-medium mb-1 text-slate-900 dark:text-white">{video.title || 'Video senza titolo'}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-white/70">
                              <Calendar className="w-4 h-4" />
                                <span>{formatDate(video.publish_date || '')}</span>
                                {/* Indicatore visibilità */}
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  video.is_public
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                                }`}>
                                  {video.is_public ? (
                                    <>
                                      <Eye className="w-3 h-3 inline mr-1" />
                                      Pubblico
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3 inline mr-1" />
                                      Privato
                                    </>
                                  )}
                                </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVideoClick(video)}
                              className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                              aria-label="Visualizza video"
                            >
                              <Video className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingVideo(video);
                                setVideoForm({
                                  title: video.title,
                                  embed_url: video.embed_url,
                                  category_id: video.category_id,
                                    publish_date: new Date(video.publish_date).toISOString().split('T')[0],
                                    is_public: video.is_public
                                });
                                setShowVideoModal(true);
                              }}
                                className="p-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white"
                              aria-label="Modifica video"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setDeleteModal({ type: 'video', id: video.id, title: video.title })}
                              className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                              aria-label="Elimina video"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        );
                      })
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 text-sm italic p-4">
                        Nessun video in questa categoria
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      {showAddCategoryForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-xl border border-white/30 dark:border-slate-700/30 max-w-lg w-full">
            <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Nuova Categoria</h2>
              <button
                onClick={() => {
                  setShowAddCategoryForm(false);
                  setCategoryForm({
                    title: '',
                    icon_color: 'blue',
                    publish_date: new Date().toISOString().split('T')[0]
                  });
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Chiudi"
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

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddCategoryForm(false);
                  setCategoryForm({
                    title: '',
                    icon_color: 'blue',
                    publish_date: new Date().toISOString().split('T')[0]
                  });
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-all transform hover:scale-105"
              >
                Annulla
              </button>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-xl border border-white/30 dark:border-slate-700/30 max-w-lg w-full">
            <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Conferma Eliminazione
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-700 dark:text-white">
                Sei sicuro di voler eliminare {deleteModal.type === 'category' ? 'la categoria' : 'il video'} "{deleteModal.title}"?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    if (deleteModal.type === 'video') {
                      handleDeleteVideo(deleteModal.id);
                    } else if (deleteModal.type === 'category') {
                      handleDeleteCategory(deleteModal.id);
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Elimina
                </button>
                <button
                  onClick={() => setDeleteModal(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg rounded-xl border border-white/30 dark:border-slate-700/30 max-w-lg w-full">
            <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingVideo ? 'Modifica Video' : 'Nuovo Video'}
              </h2>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setEditingVideo(null);
                  setFormError(null);
                  setVideoForm({
                    title: '',
                    embed_url: '',
                    category_id: '',
                    publish_date: new Date().toISOString().split('T')[0],
                    is_public: true
                  });
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Chiudi"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-4">
                I campi contrassegnati con un asterisco (*) sono obbligatori.
              </p>
              
              {/* Messaggio di errore */}
              {formError && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-4 rounded">
                  <p className="text-red-700 dark:text-red-400">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Titolo *
                </label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Inserisci il titolo del video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  URL Embed *
                </label>
                <input
                  type="text"
                  value={videoForm.embed_url}
                  onChange={(e) => setVideoForm({ ...videoForm, embed_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Inserisci l'URL di embed del video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Categoria *
                </label>
                <div className="flex flex-col gap-2">
                  {!showInlineCategoryForm ? (
                    <>
                      <div className="flex gap-2">
                <select
                  value={videoForm.category_id}
                  onChange={(e) => setVideoForm({ ...videoForm, category_id: e.target.value })}
                          className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="">Seleziona una categoria</option>
                          {Array.isArray(categories) && categories.map(category => (
                            // Controllo difensivo per la categoria
                            category && category.id ? (
                    <option key={category.id} value={category.id}>
                                {category.title || 'Categoria senza nome'}
                    </option>
                            ) : null
                  ))}
                </select>
                        <button
                          type="button"
                          onClick={() => setShowInlineCategoryForm(true)}
                          className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Nuova</span>
                        </button>
              </div>
                    </>
                  ) : (
                    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-gray-50 dark:bg-slate-900/50">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-white mb-3 flex items-center justify-between">
                        <span>Crea nuova categoria</span>
                        <button 
                          onClick={() => setShowInlineCategoryForm(false)} 
                          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">
                            Titolo categoria *
                          </label>
                          <input
                            type="text"
                            value={inlineCategoryForm.title}
                            onChange={(e) => setInlineCategoryForm({ ...inlineCategoryForm, title: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
                            placeholder="Inserisci il titolo della categoria"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-slate-400 mb-1">
                            Colore *
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries(COLORS).map(([name, color]) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setInlineCategoryForm({ ...inlineCategoryForm, icon_color: name })}
                                className={`p-2 rounded-lg border ${
                                  inlineCategoryForm.icon_color === name
                                    ? 'border-blue-500 ring-2 ring-blue-200'
                                    : 'border-gray-200 hover:border-blue-300'
                                } transition-colors flex items-center justify-center`}
                              >
                                <div className={`p-1.5 ${color.bg} rounded-md`}>
                                  <Video className={`w-3 h-3 ${color.text}`} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleSaveInlineCategory}
                            disabled={loading}
                            className="bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition-all flex items-center gap-1 text-sm disabled:opacity-50 disabled:pointer-events-none"
                          >
                            <Save className="w-3.5 h-3.5" />
                            {loading ? 'Salvando...' : 'Crea categoria'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Data di Pubblicazione *
                </label>
                <input
                  type="date"
                  value={videoForm.publish_date}
                  onChange={(e) => setVideoForm({ ...videoForm, publish_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Pubblico *
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={videoForm.is_public}
                    onChange={(e) => setVideoForm({ ...videoForm, is_public: e.target.checked })}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
                  />
                  <label className="ml-2 text-sm text-gray-700 dark:text-slate-300">
                    {videoForm.is_public ? 'Video pubblico (visibile a tutti)' : 'Video privato (visibile solo ai tuoi studenti)'}
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleSaveVideo}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="animate-spin">
                      <Loader2 className="w-4 h-4" />
                    </span>
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{editingVideo ? 'Aggiorna Video' : 'Salva Video'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}