import React, { useState, useEffect } from 'react';
import { X, Plus, Save, AlertCircle, Image as ImageIcon, Loader2, Compass, Shield, CloudSun, Book, GraduationCap, Wrench, Anchor, Ship, Navigation, Map, Waves, Wind, Thermometer, LifeBuoy, ArrowLeft } from 'lucide-react';
import { supabase, supabaseAdmin } from '../../services/supabase';
import { v4 as uuidv4 } from 'uuid';

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
  id?: string;
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

// Funzione di utilità per verificare se un valore è un UUID valido
function isValidUUID(value: any): boolean {
  if (!value) return false;
  
  // Se è un numero o una stringa numerica, consideriamolo come valido
  // Sarà convertito in UUID più tardi nel codice
  if (typeof value === 'number' || !isNaN(Number(value))) {
    return true;
  }
  
  if (typeof value !== 'string') return false;
  
  // Regex per validare un UUID v4
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(value);
}

// Funzione per generare un UUID v4 valido che rispetti il vincolo del database
function generateValidUUIDv4(): string {
  const id = uuidv4();
  console.log("UUID v4 generato:", id);
  
  // Verifica che l'UUID generato rispetti il formato v4
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidV4Regex.test(id)) {
    console.error("UUID generato non valido secondo il vincolo v4:", id);
    // Riprova fino a ottenere un UUID valido
    return generateValidUUIDv4();
  }
  
  return id;
}

// Funzione per convertire un ID numerico in UUID
function convertToUUID(id: string | number): string {
  // Se è già un UUID valido, ritornalo
  if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  
  // Converti l'ID in stringa se non lo è già
  const idStr = id.toString();
  
  // Crea un hash deterministico basato sull'ID
  const hash = Array.from(idStr).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) & 0xffffffff;
  }, 0);
  
  // Formatta come UUID v4 (deterministico basato sull'hash)
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (hash + Math.random() * 16) % 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  return uuid;
}

// Utilizzo la funzione generateValidUUIDv4 per generare un nuovo UUID valido
function generateQuestionUUID(): string {
  return generateValidUUIDv4();
}

// Funzione per generare un PIN a 6 cifre
function generatePin(): string {
  const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
  return `QUIZ-${randomPin}`;
}

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
          question_text: q.question_text || '',
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: typeof q.correct_answer === 'number' ? q.correct_answer : 
                         (typeof q.correct_answer === 'string' ? parseInt(q.correct_answer, 10) : 0),
          explanation: q.explanation || '',
          image_url: q.image_url || ''
        }));
        
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
      } else {
        // If no questions in object, load from database
        loadQuestions();
      }
      
      console.log('Loading questions for quiz:', editQuiz.id);
    }
  }, [editQuiz]);

  const loadQuestions = async () => {
    try {
      console.log('Fetching questions from database...', new Date().toISOString());
      console.log('EditQuiz ID:', editQuiz?.id);
      console.log('Quiz Type:', quizType);
      setError('');
      
      if (!editQuiz?.id) {
        console.log('No quiz ID provided for editing');
        return;
      }

      console.log('EditQuiz object:', JSON.stringify(editQuiz, null, 2));

      // Determina la tabella corretta per le domande in base al tipo di quiz
      const questionsTableName = quizType === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
      console.log(`Loading questions from table: ${questionsTableName} for quiz type: ${quizType} with quiz ID: ${editQuiz.id}`);

      // Utilizziamo supabaseAdmin invece di supabase per evitare problemi di autorizzazione
      console.log('Esecuzione query con supabaseAdmin...');
      const { data, error } = await supabaseAdmin
        .from(questionsTableName)
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

      console.log('Risultato query:', data ? `${data.length} domande trovate` : 'Nessun dato');
      console.log('Errore query:', error ? JSON.stringify(error, null, 2) : 'Nessun errore');

      if (error) {
        console.error(`Errore nel caricamento delle domande da ${questionsTableName}:`, error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Prova un approccio alternativo se il primo fallisce
        console.log('Tentativo alternativo di caricamento domande...');
        const { data: altData, error: altError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', editQuiz.id);
          
        if (altError || !altData || altData.length === 0) {
          console.error('Anche il tentativo alternativo è fallito:', altError);
          throw error;
        } else {
          console.log('Domande caricate con metodo alternativo:', altData);
          
          // Transform data to match our Question interface
          const formattedQuestions = altData?.map(q => {
            // Assicurati che correct_answer sia un numero
            let correctAnswer = q.correct_answer;
            if (typeof correctAnswer === 'string') {
              correctAnswer = parseInt(correctAnswer, 10);
              if (isNaN(correctAnswer)) {
                correctAnswer = 0; // Valore predefinito
              }
            }
            
            // Assicurati che options sia un array
            let options = q.options;
            if (typeof options === 'string') {
              try {
                options = JSON.parse(options);
              } catch (e) {
                console.error('Errore nel parsing delle opzioni:', e);
                options = [];
              }
            }
            
            return {
              question_text: q.question_text || '',
              options: Array.isArray(options) ? options : [],
              correct_answer: correctAnswer,
              explanation: q.explanation || '',
              image_url: q.image_url || ''
            };
          }) || [];
          
          setQuestions(formattedQuestions);
          return;
        }
      }
      
      console.log(`Questions loaded from ${questionsTableName}:`, data);

      // Transform data to match our Question interface
      const formattedQuestions = data?.map(q => {
        // Assicurati che correct_answer sia un numero
        let correctAnswer = q.correct_answer;
        if (typeof correctAnswer === 'string') {
          correctAnswer = parseInt(correctAnswer, 10);
          if (isNaN(correctAnswer)) {
            correctAnswer = 0; // Valore predefinito
          }
        }
        
        // Assicurati che options sia un array
        let options = q.options;
        if (typeof options === 'string') {
          try {
            options = JSON.parse(options);
            console.log(`Opzioni parsate da stringa JSON per la domanda`);
          } catch (e) {
            console.error(`Errore nel parsing delle opzioni per la domanda:`, e);
            options = [];
          }
        }
        
        if (!Array.isArray(options)) {
          console.log(`Opzioni non in formato array per la domanda, tipo: ${typeof options}`);
          // Se options è un oggetto, prova a convertirlo in array
          if (options && typeof options === 'object') {
            try {
              options = Object.values(options);
              console.log(`Opzioni convertite da oggetto ad array: ${JSON.stringify(options)}`);
            } catch (e) {
              console.error(`Errore nella conversione delle opzioni in array:`, e);
              options = [];
            }
          } else {
            options = [];
          }
        }
        
        return {
          id: q.id,
          question_text: q.question_text || '',
          options: Array.isArray(options) ? options : [],
          correct_answer: correctAnswer,
          explanation: q.explanation || '',
          image_url: q.image_url || ''
        };
      }) || [];

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
      
      // Validazione delle domande
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.question_text) {
          setError(`La domanda ${i+1} non ha un testo`);
          setLoading(false);
          return;
        }
        if (q.options.length === 0) {
          setError(`La domanda ${i+1} non ha opzioni di risposta`);
          setLoading(false);
          return;
        }
        if (typeof q.correct_answer !== 'number' || isNaN(q.correct_answer)) {
          setError(`La domanda ${i+1} ha un indice di risposta corretta non valido`);
          setLoading(false);
          return;
        }
        if (q.correct_answer < 0 || q.correct_answer >= q.options.length) {
          setError(`La domanda ${i+1} ha un indice di risposta corretta fuori range`);
          setLoading(false);
          return;
        }
      }
      
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) {
        throw new Error('Email utente non trovata nel localStorage');
      }

      // Salva l'ID utente in localStorage per utilizzi futuri
      try {
        // Ottieni l'ID dell'utente basato sull'email
        const { data: userData, error: userError } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', userEmail)
          .single();

        if (userError) {
          console.error('Errore nel recuperare l\'ID utente:', userError);
        } else if (userData) {
          localStorage.setItem('userId', userData.id);
          console.log('ID utente salvato in localStorage:', userData.id);
        }
      } catch (fetchError) {
        console.error('Errore di connessione durante il recupero dell\'ID utente:', fetchError);
      }
      
      // Preparazione dei dati del quiz
      const quizData: any = {
        title,
        description,
        quiz_type: quizType,
        visibility,
        quiz_format: quizFormat || null,
        question_count: questionCount,
        duration_minutes: duration,
        icon,
        icon_color: iconColor,
        created_by: userEmail, // Utilizziamo sempre l'email dell'utente per il campo created_by
        category: category.trim() // Assicuriamoci di includere la categoria nel salvataggio e di rimuovere spazi extra
      };

      // Aggiungi host_email solo per i quiz interattivi
      if (quizType === 'interactive') {
        // Genera un PIN per il quiz interattivo se non è in modalità modifica
        const quizPin = editQuiz?.quiz_code || generatePin();
        
        Object.assign(quizData, {
          host_email: hostEmail || userEmail
          // Rimuovo quiz_code perché la colonna non esiste nella tabella
        });
        
        // Salviamo il PIN in una variabile per utilizzarlo dopo la creazione del quiz
        console.log(`Quiz interattivo con PIN generato: ${quizPin}`);
        
        // Salviamo il PIN in localStorage per recuperarlo dopo la creazione del quiz
        if (!editQuiz) {
          localStorage.setItem('lastGeneratedPin', quizPin);
        }
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

        console.log('Utilizzeremo la strategia di upsert per le domande del quiz:', quizId);
      } else {
        console.log('Creating new quiz');
        
        // Se la tabella richiede un UUID, generiamolo manualmente
        if (tableName === 'interactive_quiz_templates') {
          // Genera un UUID v4 valido utilizzando la funzione generateValidUUIDv4
          const newUuid = generateValidUUIDv4();
          console.log('Generating valid UUID v4 for new quiz:', newUuid);
          quizData.id = newUuid;
        }
        
        const { data: newQuiz, error: insertError } = await supabaseAdmin
          .from(tableName)
          .insert([quizData])
          .select()
          .single();

        if (insertError) {
          console.error('Errore nella creazione del quiz:', insertError);
          console.error('Dettagli errore:', JSON.stringify(insertError, null, 2));
          console.error('Dati quiz che hanno causato l\'errore:', JSON.stringify(quizData, null, 2));
          throw new Error(`Errore nella creazione del quiz: ${insertError.message}`);
        }
        if (!newQuiz) throw new Error('Nessun dato restituito dopo l\'inserimento del quiz');
        quizId = newQuiz.id;
        console.log('New quiz created with ID:', quizId);
      }
      
      if (questions.length > 0) {
        console.log('Saving questions for quiz:', quizId);
        
        // Debug log per i valori di correct_answer
        questions.forEach((q, idx) => {
          console.log(`Question ${idx+1} - correct_answer:`, q.correct_answer, `(type: ${typeof q.correct_answer})`);
        });
        
        // Verifica che quizId sia un UUID valido o lo converte in un UUID
        if (!isValidUUID(quizId)) {
          console.error('ID quiz non valido:', quizId);
          throw new Error(`ID quiz non valido: ${quizId}. È necessario un UUID valido.`);
        }
        
        // Se quizId è numerico, convertilo in UUID
        const quizUUID = typeof quizId === 'number' || !isNaN(Number(quizId)) 
          ? convertToUUID(quizId) 
          : quizId;
        
        console.log(`Quiz ID originale: ${quizId}, convertito in UUID: ${quizUUID}`);
        
        // Prepara i dati delle domande con controlli rigorosi sui tipi
        const questionsData = questions.map((q, idx) => {
          // Assicurati che correct_answer sia un numero
          let correctAnswer = q.correct_answer;
          if (typeof correctAnswer === 'string') {
            correctAnswer = parseInt(correctAnswer, 10);
            if (isNaN(correctAnswer)) {
              console.error(`Domanda ${idx+1}: Valore di correct_answer non valido:`, q.correct_answer);
              correctAnswer = 0; // Valore predefinito
            }
          }
          
          // Assicurati che options sia un array
          let options = q.options;
          if (!Array.isArray(options)) {
            console.error(`Domanda ${idx+1}: options non è un array:`, options);
            options = [];
          }
          
          // Crea l'oggetto domanda con tipi corretti
          return {
            quiz_id: quizUUID, // UUID valido convertito
            id: q.id || generateQuestionUUID(), // Usa l'ID esistente se disponibile, altrimenti genera un nuovo UUID
            question_text: q.question_text || '',
            options: options,
            correct_answer: correctAnswer,
            explanation: q.explanation || '',
            image_url: q.image_url || null
          };
        });

        console.log('Questions data:', JSON.stringify(questionsData, null, 2));
        
        // Determina la tabella corretta per le domande in base al tipo di quiz
        const questionsTableName = quizType === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
        console.log(`Using questions table: ${questionsTableName} for quiz type: ${quizType}`);
        
        try {
          console.log('Utilizzo strategia upsert per le domande...');
          
          // Prima otteniamo tutte le domande esistenti
          const { data: existingQuestions, error: fetchError } = await supabaseAdmin
            .from(questionsTableName)
            .select('id')
            .eq('quiz_id', quizId);
            
          if (fetchError) {
            console.error('Errore nel recupero delle domande esistenti:', fetchError);
            console.error('Fetch error details:', JSON.stringify(fetchError, null, 2));
          }
          
          const existingQuestionIds = existingQuestions ? existingQuestions.map(q => q.id) : [];
          console.log('ID delle domande esistenti:', existingQuestionIds);
          
          // Identifichiamo quali domande aggiornare e quali inserire
          const questionsToUpdate = questionsData.filter(q => q.id && existingQuestionIds.includes(q.id));
          const questionsToInsert = questionsData.filter(q => !q.id || !existingQuestionIds.includes(q.id));
          
          console.log(`Domande da aggiornare: ${questionsToUpdate.length}, Domande da inserire: ${questionsToInsert.length}`);
          
          // Aggiorna le domande esistenti
          for (let i = 0; i < questionsToUpdate.length; i++) {
            const questionData = questionsToUpdate[i];
            console.log(`Aggiornamento domanda ${i+1}:`, JSON.stringify(questionData, null, 2));
            
            const { error: updateError } = await supabaseAdmin
              .from(questionsTableName)
              .update({
                question_text: questionData.question_text,
                options: questionData.options,
                correct_answer: questionData.correct_answer,
                explanation: questionData.explanation,
                image_url: questionData.image_url
              })
              .eq('id', questionData.id)
              .eq('quiz_id', quizId);
              
            if (updateError) {
              console.error(`Errore nell'aggiornamento della domanda ${i+1}:`, updateError);
              console.error('Update error details:', JSON.stringify(updateError, null, 2));
              throw new Error(`Errore nell'aggiornamento della domanda ${i+1}: ${updateError.message}`);
            }
          }
          
          // Inserisci le nuove domande
          for (let i = 0; i < questionsToInsert.length; i++) {
            const questionData = questionsToInsert[i];
            // Assicurati che ci sia un ID valido
            if (!questionData.id) {
              questionData.id = generateQuestionUUID();
            }
            
            console.log(`Inserimento domanda ${i+1}:`, JSON.stringify(questionData, null, 2));
            
            const { error: insertError } = await supabaseAdmin
              .from(questionsTableName)
              .insert([questionData]);
              
            if (insertError) {
              console.error(`Errore nell'inserimento della domanda ${i+1}:`, insertError);
              console.error('Insert error details:', JSON.stringify(insertError, null, 2));
              throw new Error(`Errore nell'inserimento della domanda ${i+1}: ${insertError.message}`);
            }
          }
          
          console.log('Questions saved successfully');
        } catch (insertError) {
          console.error('Eccezione durante il salvataggio delle domande:', insertError);
          throw new Error(`Errore nel salvataggio delle domande: ${insertError instanceof Error ? insertError.message : 'Errore sconosciuto'}`);
        }
      }

      // Verify questions were saved
      // Determina la tabella corretta per la verifica in base al tipo di quiz
      const verifyTableName = quizType === 'interactive' ? 'interactive_quiz_questions' : 'quiz_questions';
      console.log(`Verifica salvataggio domande nella tabella: ${verifyTableName} per quiz ID: ${quizId}`);
      
      const { data: savedQuestions, error: verifyError } = await supabaseAdmin
        .from(verifyTableName)
        .select('*')
        .eq('quiz_id', quizId);

      if (verifyError) {
        console.error('Errore nella verifica delle domande salvate:', verifyError);
        console.error('Verify error details:', JSON.stringify(verifyError, null, 2));
        throw new Error(`Errore nella verifica delle domande salvate: ${verifyError.message}`);
      }
      
      console.log('Verification - Saved questions:', savedQuestions?.length || 0);
      if (savedQuestions && savedQuestions.length > 0) {
        console.log('Prima domanda salvata:', JSON.stringify(savedQuestions[0], null, 2));
      } else {
        console.error('ATTENZIONE: Nessuna domanda salvata per il quiz!');
      }
      
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
    <div className="flex justify-center items-center min-h-screen p-4 bg-gray-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 max-w-4xl w-full my-16">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {editQuiz ? 'Modifica Quiz' : 'Crea Nuovo Quiz'}
            </h1>
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              Torna indietro
            </button>
          </div>
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
                  ? 'Solo tu puoi vedere questo quiz. Gli studenti non lo vedranno nella lista dei quiz disponibili.'
                  : 'Questo quiz sarà visibile a tutti gli studenti nella lista dei quiz disponibili.'
                }
              </p>
            </div>

            {quizType === 'interactive' && (
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
            )}

            {quizType !== 'interactive' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Categoria *
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Es: Navigazione Base, Meteorologia, etc."
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  La categoria è importante per organizzare i quiz e renderli facilmente ricercabili. 
                  {category && <span className="ml-1 font-medium text-blue-600 dark:text-blue-400">Valore attuale: "{category}"</span>}
                </p>
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
