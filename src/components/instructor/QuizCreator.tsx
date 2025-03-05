import React, { useState, useEffect } from 'react';
import { X, Plus, Save, AlertCircle, Image as ImageIcon, Loader2, Compass, Shield, CloudSun, Book, GraduationCap, Wrench, Anchor, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../services/supabase';

interface QuizCreatorProps {
  quizType: 'exam' | 'learning' | 'interactive';
  editQuiz?: {
    id: string;
    title: string;
    description: string;
    quiz_type: 'exam' | 'learning' | 'interactive';
    category: string;
    question_count: number;
    duration_minutes: number;
    icon: string;
    icon_color: string;
    quiz_code?: string;
    visibility?: string;
    created_by?: string;
    quiz_format?: string;
    questions?: Array<{
      question_text: string;
      options: string[];
      correct_answer: number;
      explanation?: string;
      image_url?: string;
    }>;
  };
  hostEmail?: string;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

interface Question {
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  image_url?: string;
}

const AVAILABLE_ICONS = [
  { name: 'compass', icon: Compass, label: 'Bussola' },
  { name: 'shield', icon: Shield, label: 'Scudo' },
  { name: 'cloud-sun', icon: CloudSun, label: 'Meteo' },
  { name: 'book', icon: Book, label: 'Libro' },
  { name: 'graduation-cap', icon: GraduationCap, label: 'Laurea' },
  { name: 'wrench', icon: Wrench, label: 'Strumenti' },
  { name: 'anchor', icon: Anchor, label: 'Ancora' },
  { name: 'ship', icon: Ship, label: 'Nave' },
  { name: 'navigation', icon: Navigation, label: 'Navigazione' },
  { name: 'map', icon: Map, label: 'Mappa' },
  { name: 'waves', icon: Waves, label: 'Onde' },
  { name: 'wind', icon: Wind, label: 'Vento' },
  { name: 'thermometer', icon: Thermometer, label: 'Temperatura' },
  { name: 'life-buoy', icon: LifeBuoy, label: 'Salvagente' }
];

export const COLORS = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', hover: 'hover:bg-blue-50', border: 'border-blue-200', accent: 'bg-blue-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600', hover: 'hover:bg-green-50', border: 'border-green-200', accent: 'bg-green-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600', hover: 'hover:bg-red-50', border: 'border-red-200', accent: 'bg-red-600' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', hover: 'hover:bg-yellow-50', border: 'border-yellow-200', accent: 'bg-yellow-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', hover: 'hover:bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', hover: 'hover:bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-600' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', hover: 'hover:bg-pink-50', border: 'border-pink-200', accent: 'bg-pink-600' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', hover: 'hover:bg-teal-50', border: 'border-teal-200', accent: 'bg-teal-600' }
};

const COLOR_OPTIONS = [
  { name: 'blue', label: 'Blu' },
  { name: 'green', label: 'Verde' },
  { name: 'red', label: 'Rosso' },
  { name: 'yellow', label: 'Giallo' },
  { name: 'purple', label: 'Viola' },
  { name: 'indigo', label: 'Indaco' },
  { name: 'pink', label: 'Rosa' },
  { name: 'teal', label: 'Turchese' }
];

export function QuizCreator({ quizType, editQuiz, hostEmail, onClose, onSaveSuccess }: QuizCreatorProps) {
  const [title, setTitle] = useState<string>(editQuiz?.title || '');
  const [description, setDescription] = useState<string>(editQuiz?.description || '');
  const [category, setCategory] = useState<string>(editQuiz?.category || '');
  const [icon, setIcon] = useState<string>(editQuiz?.icon || 'compass');
  const [iconColor, setIconColor] = useState<string>(editQuiz?.icon_color || 'blue');
  const [questionCount, setQuestionCount] = useState<number>(editQuiz?.question_count || getDefaultQuestionCount());
  const [duration, setDuration] = useState<number>(editQuiz?.duration_minutes || getDefaultDuration());
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<{ [key: number]: boolean }>({});
  const [imagePreview, setImagePreview] = useState<{ [key: number]: string }>({});
  const [visibility, setVisibility] = useState<string>(editQuiz?.visibility || 'private');
  const [quizFormat, setQuizFormat] = useState<string>(editQuiz?.quiz_format || 'multiple_choice');
  const [loading, setLoading] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  function getDefaultQuestionCount() {
    switch (quizType) {
      case 'exam': return 20;
      default: return 5;
    }
  }

  function getDefaultDuration() {
    switch (quizType) {
      case 'exam': return 30;
      default: return 15;
    }
  }

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    setUserEmail(email);

    if (editQuiz) {
      console.log('Initializing edit mode with quiz:', editQuiz);
      
      // Initialize form data from editQuiz
      
      // Initialize form data from editQuiz
      setTitle(editQuiz.title || '');
      setDescription(editQuiz.description || '');
      setCategory(editQuiz.category || '');
      setIcon(editQuiz.icon || 'compass');
      setIconColor(editQuiz.icon_color || 'blue');
      setQuestionCount(editQuiz.question_count || getDefaultQuestionCount());
      setDuration(editQuiz.duration_minutes || getDefaultDuration());
      setVisibility(editQuiz.visibility || 'private');
      setQuizFormat(editQuiz.quiz_format || 'multiple_choice');
      
      // If quiz has questions directly in the object, initialize them
      if (editQuiz.questions && editQuiz.questions.length > 0) {
        console.log('Initializing questions from quiz object:', editQuiz.questions);
        const formattedQuestions = editQuiz.questions.map(q => ({
          question_text: q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          image_url: q.image_url
        }));
        setQuestions(formattedQuestions);
        
        // Set image previews for existing images
        const previews: { [key: number]: string } = {};
        formattedQuestions.forEach((q, index) => {
          if (q.image_url) {
            previews[index] = q.image_url;
          }
        });
        setImagePreview(previews);
      } else {
        // If no questions in object, load from database
        loadQuestions();
      }
      
      console.log('Loading questions for quiz:', editQuiz.id);
    }
  }, [editQuiz]);

  const loadQuestions = async () => {
    try {
      console.log('Fetching questions from database...');
      setError('');
      
      if (!editQuiz?.id) {
        console.log('No quiz ID provided for editing');
        return;
      }

      const { data, error } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          question_text,
          options,
          correct_answer,
          explanation,
          image_url
        `)
        .eq('quiz_id', editQuiz.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      console.log('Questions loaded from DB:', data);

      // Transform data to match our Question interface
      const formattedQuestions = data?.map(q => ({
        question_text: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        image_url: q.image_url
      })) || [];

      console.log('Formatted questions:', formattedQuestions);
      setQuestions(formattedQuestions);
      
      // Set image previews for existing images
      const previews: { [key: number]: string } = {};
      formattedQuestions.forEach((q, index) => {
        if (q.image_url) {
          previews[index] = q.image_url;
        }
      });
      setImagePreview(previews);
      
      console.log('Questions set in state:', formattedQuestions);
    } catch (error: unknown) {
      console.error('Error loading questions:', error);
      setError('Errore durante il caricamento delle domande');
    }
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_text: '',
        options: [''],
        correct_answer: 0,
        explanation: ''
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: keyof Question, value: string | string[] | number | undefined) => {
    const updatedQuestions = [...questions];
    if (field === 'options') {
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        options: value as string[]
      };
    } else {
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value
      };
    }
    setQuestions(updatedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.push('');
    setQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.splice(optionIndex, 1);
    setQuestions(updatedQuestions);
  };

  const handleImageUpload = async (questionIndex: number, file: File) => {
    try {
      setUploadingImage(prev => ({ ...prev, [questionIndex]: true }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `quiz-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('quiz-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('quiz-images')
        .getPublicUrl(filePath);

      const updatedQuestions = [...questions];
      updatedQuestions[questionIndex] = {
        ...updatedQuestions[questionIndex],
        image_url: publicUrl
      };
      setQuestions(updatedQuestions);
      setImagePreview(prev => ({ ...prev, [questionIndex]: publicUrl }));

    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      setError('Errore durante il caricamento dell\'immagine');
    } finally {
      setUploadingImage(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const removeImage = async (questionIndex: number) => {
    try {
      const question = questions[questionIndex];
      if (question.image_url) {
        const filePath = question.image_url.split('/').pop();
        if (filePath) {
          await supabase.storage
            .from('quiz-images')
            .remove([`quiz-images/${filePath}`]);
        }

        const updatedQuestions = [...questions];
        delete updatedQuestions[questionIndex].image_url;
        setQuestions(updatedQuestions);
        
        const newImagePreview = { ...imagePreview };
        delete newImagePreview[questionIndex];
        setImagePreview(newImagePreview);
      }
    } catch (error: unknown) {
      console.error('Error removing image:', error);
      setError('Errore durante la rimozione dell\'immagine');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Email utente non trovata nel localStorage');
      }

      // Ottieni l'ID dell'utente basato sull'email
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (userError) {
        console.error('Errore nel recuperare l\'ID utente:', userError);
        throw new Error(`Errore nel recuperare l'ID utente: ${userError.message}`);
      }

      if (!userData) {
        throw new Error('Utente non trovato nel database');
      }

      const userId = userData.id;
      console.log('ID utente per la creazione del quiz:', userId);
      
      // Preparazione dei dati del quiz
      const quizData = {
        title,
        description,
        quiz_type: quizType,
        visibility,
        quiz_format: quizFormat || null,
        question_count: questionCount,
        duration_minutes: duration,
        icon,
        icon_color: iconColor,
        created_by: userId // Utilizzo l'ID utente invece dell'email
      };

      // Aggiungi host_email solo per i quiz interattivi
      if (quizType === 'interactive') {
        Object.assign(quizData, {
          host_email: hostEmail || userEmail
        });
      }

      console.log(`Quiz template data for ${quizType} quiz:`, quizData);
      let quizId;
      
      // Determina la tabella corretta in base al tipo di quiz
      const tableName = quizType === 'interactive' ? 'interactive_quiz_templates' : 'quiz_templates';
      console.log(`Using table: ${tableName} for quiz type: ${quizType}`);
      
      if (editQuiz) {
        console.log('Updating existing quiz:', editQuiz.id);
        const { error: updateError } = await supabaseAdmin
          .from(tableName)
          .update(quizData)
          .eq('id', editQuiz.id);

        if (updateError) {
          console.error('Errore nell\'aggiornamento del quiz:', updateError);
          throw new Error(`Errore nell'aggiornamento del quiz: ${updateError.message}`);
        }
        quizId = editQuiz.id;

        console.log('Deleting old questions for quiz:', quizId);
        // Determina la tabella corretta per le domande in base al tipo di quiz
        const questionsTableName = quizType === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
        console.log(`Using questions table for deletion: ${questionsTableName} for quiz type: ${quizType}`);
        
        const { error: deleteError } = await supabaseAdmin
          .from(questionsTableName)
          .delete()
          .eq('quiz_id', quizId);

        if (deleteError) {
          console.error('Errore nell\'eliminazione delle domande esistenti:', deleteError);
          throw new Error(`Errore nell'eliminazione delle domande esistenti: ${deleteError.message}`);
        }
      } else {
        console.log('Creating new quiz');
        const { data: newQuiz, error: insertError } = await supabaseAdmin
          .from(tableName)
          .insert([quizData])
          .select()
          .single();

        if (insertError) {
          console.error('Errore nella creazione del quiz:', insertError);
          throw new Error(`Errore nella creazione del quiz: ${insertError.message}`);
        }
        if (!newQuiz) throw new Error('Nessun dato restituito dopo l\'inserimento del quiz');
        quizId = newQuiz.id;
        console.log('New quiz created with ID:', quizId);
      }
      
      if (questions.length > 0) {
        console.log('Saving questions for quiz:', quizId);
        const questionsData = questions.map(q => ({
          quiz_id: quizId,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          image_url: q.image_url
        }));

        console.log('Questions data:', questionsData);
        
        // Determina la tabella corretta per le domande in base al tipo di quiz
        const questionsTableName = quizType === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
        console.log(`Using questions table: ${questionsTableName} for quiz type: ${quizType}`);
        
        const { error: questionsError } = await supabaseAdmin
          .from(questionsTableName)
          .insert(questionsData);

        if (questionsError) {
          console.error('Errore nel salvataggio delle domande:', questionsError);
          throw new Error(`Errore nel salvataggio delle domande: ${questionsError.message}`);
        }
        console.log('Questions saved successfully');
      }

      // Verify questions were saved
      // Determina la tabella corretta per la verifica in base al tipo di quiz
      const verifyTableName = quizType === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
      const { data: savedQuestions, error: verifyError } = await supabase
        .from(verifyTableName)
        .select('*')
        .eq('quiz_id', quizId);

      if (verifyError) {
        console.error('Errore nella verifica delle domande salvate:', verifyError);
        throw new Error(`Errore nella verifica delle domande salvate: ${verifyError.message}`);
      }
      console.log('Verification - Saved questions:', savedQuestions?.length || 0);
      
      // Mostra un messaggio di conferma
      const quizStatus = editQuiz ? 'modificato' : 'creato';
      window.alert(`Quiz ${quizStatus} con successo!`);
      
      // Chiama il callback di successo se fornito
      if (onSaveSuccess) {
        console.log(`Calling onSaveSuccess callback for ${quizType} quiz`);
        onSaveSuccess();
      } else {
        console.log('No onSaveSuccess callback provided');
      }
      
      onClose();
    } catch (error: unknown) {
      console.error('Error saving quiz:', error);
      const errorMessage = error instanceof Error 
        ? `Errore durante il salvataggio del quiz: ${error.message}` 
        : 'Errore durante il salvataggio del quiz';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full my-16">
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold dark:text-slate-100">
            {editQuiz ? 'Modifica Quiz' : 'Crea Nuovo Quiz'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Titolo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                placeholder="Inserisci il titolo del quiz"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Descrizione *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                rows={3}
                placeholder="Inserisci una descrizione del quiz"
              />
            </div>

            {quizType === 'interactive' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Visibilità *
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'private' | 'public')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="private">Privato</option>
                    <option value="public">Pubblico</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                    {visibility === 'private' 
                      ? 'Può essere trovato dalle persone con cui lo condividi'
                      : 'Tutti possono trovarlo'
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Formato Quiz *
                  </label>
                  <select
                    value={quizFormat}
                    onChange={(e) => setQuizFormat(e.target.value as 'multiple_choice' | 'true_false')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value="multiple_choice">Risposta Multipla</option>
                    <option value="true_false">Vero o Falso</option>
                  </select>
                </div>
              </>
            )}

            {quizType !== 'interactive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Es: Navigazione Base, Meteorologia, etc."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Icona *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                {AVAILABLE_ICONS.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    onClick={() => setIcon(name)}
                    className={`p-4 rounded-lg border ${
                      icon === name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                    } transition-colors flex flex-col items-center gap-2`}
                  >
                    <Icon className={`w-6 h-6 ${icon === name ? 'text-blue-500' : 'text-gray-600 dark:text-slate-400'}`} />
                    <span className={`text-sm ${icon === name ? 'text-blue-500' : 'text-gray-600 dark:text-slate-400'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Colore Icona *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {COLOR_OPTIONS.map(({ name, label }) => {
                  const IconComponent = AVAILABLE_ICONS.find(i => i.name === icon)?.icon || Compass;
                  const color = COLORS[name as keyof typeof COLORS];
                  return (
                    <button
                      key={name}
                      onClick={() => setIconColor(name)}
                      className={`p-4 rounded-lg border ${
                        iconColor === name
                          ? 'border-blue-500'
                          : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'
                      } transition-colors flex flex-col items-center gap-2`}
                    >
                      <div className={`p-3 ${color.bg} dark:bg-opacity-30 rounded-lg`}>
                        <IconComponent className={`w-6 h-6 ${color.text} dark:text-opacity-90`} />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-slate-400">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Numero di Domande
                </label>
                <input
                  type="number"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  min={1}
                  max={50}
                  disabled={quizType === 'exam'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Durata (minuti)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  min={1}
                  disabled={quizType === 'exam'}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium dark:text-slate-100">Domande</h3>
                <button
                  onClick={addQuestion}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Aggiungi Domanda
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((question, index) => (
                  <div key={index} className="border border-gray-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium dark:text-slate-100">Domanda {index + 1}</h4>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Testo della Domanda *
                        </label>
                        <input
                          type="text"
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Inserisci la domanda"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Immagine (Opzionale)
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex-1">
                            <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg p-4 hover:border-blue-500 transition-colors cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(index, file);
                                }}
                              />
                              <div className="flex flex-col items-center justify-center gap-2">
                                {uploadingImage[index] ? (
                                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                ) : imagePreview[index] ? (
                                  <img
                                    src={imagePreview[index]}
                                    alt="Anteprima"
                                    className="max-h-32 rounded-lg"
                                  />
                                ) : (
                                  <>
                                    <ImageIcon className="w-8 h-8 text-gray-400 dark:text-slate-500" />
                                    <span className="text-sm text-gray-500 dark:text-slate-400">
                                      Clicca o trascina un'immagine qui
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </label>
                          {imagePreview[index] && (
                            <button
                              onClick={() => removeImage(index)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Rimuovi immagine"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Opzioni di Risposta
                        </label>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                checked={question.correct_answer === optionIndex}
                                onChange={() => updateQuestion(index, 'correct_answer', optionIndex)}
                                className="w-4 h-4 text-blue-600 dark:text-blue-400"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...question.options];
                                  newOptions[optionIndex] = e.target.value;
                                  updateQuestion(index, 'options', newOptions);
                                }}
                                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                                placeholder={`Opzione ${optionIndex + 1}`}
                                required={optionIndex === 0}
                              />
                              {optionIndex > 0 && (
                                <button
                                  onClick={() => removeOption(index, optionIndex)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            onClick={() => addOption(index)}
                           className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Aggiungi Opzione
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                          Spiegazione (Opzionale)
                        </label>
                        <textarea
                          value={question.explanation}
                          onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          rows={2}
                          placeholder="Aggiungi una spiegazione per la risposta corretta"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvataggio...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                {editQuiz ? 'Salva Modifiche' : 'Crea Quiz'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}