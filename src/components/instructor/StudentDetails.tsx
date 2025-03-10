import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Calendar, Book, Star, Clock, CheckCircle2, XCircle, Edit, 
  Save, Trash2, Target, AlertCircle, ChevronDown, ChevronUp, UserPlus, 
  Mail, BarChart2, Bookmark, Eye, EyeOff, AlertTriangle, X, RefreshCw, 
  Info, HelpCircle, FileQuestion, Check 
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { ScrollArea } from '../ui/ScrollArea';
import { ConfirmModal } from '../common/ConfirmModal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Student {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  last_login: string;
  created_at?: string;
  subscription?: {
    plan_id: string;
    status: string;
  };
  account_status: 'active' | 'suspended';
}

interface StudentNote {
  id: string;
  instructor_id: string;
  quiz_submission_id?: string;
  comment: string;
  student_email?: string;
  created_at: string;
}

interface SubscriptionHistoryItem {
  id: string;
  user_email: string;
  plan_id: string;
  status: string;
  created_at: string;
  expires_at?: string;
  payment_id?: string;
  change_type: 'created' | 'updated' | 'deleted';
  old_plan?: string;
  new_plan?: string;
  date: string;
}

interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total_time: number;
  answers: boolean[];
  question_times: number[];
  date: string;
  category: string;
  quiz_details?: {
    title: string;
    description: string;
    quiz_type: 'exam' | 'learning';
    question_count: number;
    duration_minutes: number;
  };
}

interface CategoryPerformance {
  category: string;
  totalQuestions: number;
  correctAnswers: number;
  successRate: number;
}

interface QuizDetailedResult {
  id: string;
  quiz_id: string;
  questions: QuizQuestion[];
  studentAnswers: number[];
  totalTime?: number;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
  image_url?: string;
}

interface StudentDetailsProps {
  student: Student;
  onBack: () => void;
}

export function StudentDetails({ student, onBack }: StudentDetailsProps) {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [classAverages, setClassAverages] = useState<{[date: string]: number}>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [registrationDate, setRegistrationDate] = useState<string | null>(null);
  const [detailedQuizResult, setDetailedQuizResult] = useState<QuizDetailedResult | null>(null);
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState<{ id: string; comment: string } | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [rawResultData, setRawResultData] = useState<any>(null);

  useEffect(() => {
    loadStudentData();
    loadRegistrationDate();
    loadClassAverages();
  }, [student.email]);

  const loadRegistrationDate = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('email', student.email)
        .single();

      if (error) throw error;
      
      if (data && data.created_at) {
        setRegistrationDate(data.created_at);
      } else if (student.created_at) {
        setRegistrationDate(student.created_at);
      }
    } catch (error) {
      console.error('Error loading registration date:', error);
    }
  };

  const loadClassAverages = async () => {
    try {
      // Calcola la media di classe per ogni data in cui lo studente ha fatto un quiz
      const quizDates = quizResults.map(r => new Date(r.date).toISOString().split('T')[0]);
      
      if (quizDates.length === 0) return;
      
      const { data, error } = await supabase
        .from('results')
        .select('date, score')
        .in('date', quizDates.map(date => date.substring(0, 10)))
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        // Raggruppa per data e calcola la media
        interface DateAverages {
          sum: number;
          count: number;
        }
        
        const averagesByDate: {[date: string]: DateAverages} = {};
        
        data.forEach(result => {
          const date = new Date(result.date).toISOString().split('T')[0];
          if (!averagesByDate[date]) {
            averagesByDate[date] = { sum: 0, count: 0 };
          }
          averagesByDate[date].sum += result.score * 100;
          averagesByDate[date].count += 1;
        });
        
        // Calcola la media finale per ogni data
        const finalAverages: {[date: string]: number} = {};
        for (const [date, values] of Object.entries(averagesByDate)) {
          finalAverages[date] = values.sum / values.count;
        }
        
        setClassAverages(finalAverages);
      }
    } catch (error) {
      console.error('Error loading class averages:', error);
    }
  };

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // STEP 1: Carichiamo i risultati dei quiz
      let quizResultsQuery = `
        *,
        quiz_id
      `;

      // Tentativo con 'quizzes' come suggerito dall'errore
      try {
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
            quiz_details:quizzes(
            title,
            description,
            quiz_type,
            question_count,
            duration_minutes
          )
        `)
        .eq('student_email', student.email)
        .order('date', { ascending: false });

        if (resultsError) {
          // Se fallisce, proviamo senza la join
          console.warn('Error with quiz_details join:', resultsError);
          const { data: basicResults, error: basicError } = await supabase
            .from('results')
        .select('*')
            .eq('student_email', student.email)
        .order('date', { ascending: false });

          if (basicError) throw basicError;
          setQuizResults(basicResults || []);
          
          // Se abbiamo risultati, calcoliamo le performance
          if (basicResults && basicResults.length > 0) {
            calculateCategoryPerformance(basicResults);
          }
        } else {
          setQuizResults(results || []);
          // Se abbiamo risultati, calcoliamo le performance
          if (results && results.length > 0) {
            calculateCategoryPerformance(results);
          }
        }
      } catch (error) {
        console.error('Error loading quiz results:', error);
        setError('Errore durante il caricamento dei risultati dei quiz');
      }

      // STEP 2: Carichiamo le note dell'istruttore per questo studente
      try {
        const { data: notesData, error: notesError } = await supabase
        .from('instructor_comments')
        .select('*')
        .eq('student_email', student.email)
        .order('created_at', { ascending: false });

        if (notesError) {
          console.error('Error loading notes:', notesError);
        } else {
          console.log('Notes loaded successfully:', notesData);
          setNotes(notesData || []);
        }
      } catch (notesLoadError) {
        console.error('Exception loading notes:', notesLoadError);
      }

      // STEP 3: Carichiamo lo storico degli abbonamenti
      try {
        const { data: history, error: historyError } = await supabase
          .from('subscription_changes')
          .select('*')
          .eq('customer_email', student.email)
          .order('date', { ascending: false });

        if (historyError) {
          console.error('Error loading subscription history:', historyError);
        } else {
      setSubscriptionHistory(history || []);
        }
      } catch (historyLoadError) {
        console.error('Exception loading subscription history:', historyLoadError);
      }
    } catch (error) {
      console.error('Error in loadStudentData:', error);
      setError('Errore durante il caricamento dei dati dello studente');
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryPerformance = (results: QuizResult[]) => {
    // Raggruppa i risultati per categoria
    const categories: {[key: string]: CategoryPerformance} = {};
    
    results.forEach(result => {
      const category = result.category || 'Non categorizzato';
      
      if (!categories[category]) {
        categories[category] = {
          category,
          totalQuestions: 0,
          correctAnswers: 0,
          successRate: 0
        };
      }
      
      // Conta le risposte corrette dagli array di booleani
      const correctAnswersCount = result.answers.filter(answer => answer).length;
      categories[category].totalQuestions += result.answers.length;
      categories[category].correctAnswers += correctAnswersCount;
    });
    
    // Calcola il tasso di successo per categoria
    Object.values(categories).forEach(category => {
      category.successRate = category.totalQuestions > 0 
        ? (category.correctAnswers / category.totalQuestions) * 100 
        : 0;
    });
    
    setCategoryPerformance(Object.values(categories));
  };

  const handleAddNote = async () => {
    try {
      if (!newNote.trim()) return;

      console.log('Adding note for student:', student.email);

      // Ottieni l'ID dell'istruttore corrente dal suo indirizzo email
      const currentInstructorEmail = localStorage.getItem('userEmail');
      if (!currentInstructorEmail) {
        setError('Email dell\'istruttore non trovata');
        return;
      }

      console.log('Current instructor email:', currentInstructorEmail);

      const { data: instructorUser, error: instructorError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', currentInstructorEmail)
        .single();

      if (instructorError) {
        console.error('Error fetching instructor ID:', instructorError);
        setError('Errore nel recupero dell\'ID dell\'istruttore');
        return;
      }

      if (!instructorUser || !instructorUser.id) {
        setError('ID dell\'istruttore non trovato');
        return;
      }

      console.log('Instructor ID found:', instructorUser.id);

      // Prepara i dati per l'inserimento - aggiungiamo student_email
      const noteData = {
        instructor_id: instructorUser.id,
        comment: newNote.trim(),
        student_email: student.email // Associamo la nota allo studente corrente
      };

      console.log('Inserting note with data:', noteData);

      // Tenta l'inserimento
      const { data: insertedData, error: insertError } = await supabase
        .from('instructor_comments')
        .insert([noteData])
        .select();

      if (insertError) {
        console.error('Insert error data:', noteData);
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Note inserted successfully:', insertedData);

      // Ricarica le note immediatamente
      const { data: refreshedNotes, error: refreshError } = await supabase
        .from('instructor_comments')
        .select('*')
        .eq('student_email', student.email)
        .order('created_at', { ascending: false });

      if (refreshError) {
        console.error('Error refreshing notes after insert:', refreshError);
      } else {
        console.log('Notes refreshed after insert:', refreshedNotes);
        setNotes(refreshedNotes || []);
      }

      setNewNote('');
      
      console.log('Note adding process completed successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Errore durante il salvataggio della nota');
    }
  };

  const handleEditNote = (note: StudentNote) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.comment);
  };

  const handleSaveEditedNote = async () => {
    try {
      if (!editingNoteId || !editNoteContent.trim()) return;

      const { error: updateError } = await supabase
        .from('instructor_comments')
        .update({ comment: editNoteContent.trim() })
        .eq('id', editingNoteId);

      if (updateError) throw updateError;

      await loadStudentData();
      setEditingNoteId(null);
      setEditNoteContent('');
    } catch (error) {
      console.error('Error updating note:', error);
      setError('Errore durante l\'aggiornamento della nota');
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditNoteContent('');
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      // Verifichiamo prima se l'istruttore corrente è il proprietario della nota
      const currentInstructorEmail = localStorage.getItem('userEmail');
      if (!currentInstructorEmail) {
        setError('Email dell\'istruttore non trovata');
        return;
      }

      const { data: instructorUser, error: instructorError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', currentInstructorEmail)
        .single();

      if (instructorError) {
        console.error('Error fetching instructor ID:', instructorError);
        setError('Errore nel recupero dell\'ID dell\'istruttore');
        return;
      }

      if (!instructorUser || !instructorUser.id) {
        setError('ID dell\'istruttore non trovato');
        return;
      }

      // Verifichiamo che la nota appartenga all'istruttore corrente
      const { data: noteData, error: noteError } = await supabase
        .from('instructor_comments')
        .select('instructor_id')
        .eq('id', noteId)
        .single();

      if (noteError) {
        console.error('Error checking note ownership:', noteError);
        setError('Errore durante la verifica della proprietà della nota');
        return;
      }

      if (noteData.instructor_id !== instructorUser.id) {
        setError('Non sei autorizzato a eliminare questa nota');
        return;
      }

      // Elimina la nota
      const { error: deleteError } = await supabase
        .from('instructor_comments')
        .delete()
        .eq('id', noteId);

      if (deleteError) throw deleteError;

      await loadStudentData();
    } catch (error) {
      console.error('Error deleting note:', error);
      setError('Errore durante l\'eliminazione della nota');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSendEmail = () => {
    window.open(`mailto:${student.email}?subject=OceanMed Quiz - Comunicazione Istruttore`);
  };

  // Calculate quiz statistics
  const totalQuizzes = quizResults.length;
  const averageScore = totalQuizzes > 0
    ? quizResults.reduce((acc, curr) => acc + curr.score, 0) / totalQuizzes
    : 0;
  const passedQuizzes = quizResults.filter(r => r.score >= 0.75).length;
  const averageTime = totalQuizzes > 0
    ? quizResults.reduce((acc, curr) => acc + curr.total_time, 0) / totalQuizzes
    : 0;

  // Prepare chart data with class average comparison
  const chartData = {
    labels: quizResults.map(r => formatShortDate(r.date)),
    datasets: [
      {
      label: 'Punteggio Quiz',
      data: quizResults.map(r => r.score * 100),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      },
      {
        label: 'Media Classe',
        data: quizResults.map(r => {
          const date = new Date(r.date).toISOString().split('T')[0];
          return classAverages[date] || null;
        }),
        borderColor: 'rgb(107, 114, 128)',
        backgroundColor: 'rgba(107, 114, 128, 0.5)',
        borderDash: [5, 5],
      }
    ]
  };

  // Prepare category chart data
  const categoryChartData = {
    labels: categoryPerformance.map(cat => cat.category),
    datasets: [
      {
        label: 'Tasso di Successo (%)',
        data: categoryPerformance.map(cat => cat.successRate),
        backgroundColor: categoryPerformance.map(cat => 
          cat.successRate >= 75 ? 'rgba(34, 197, 94, 0.7)' : 
          cat.successRate >= 50 ? 'rgba(234, 179, 8, 0.7)' : 
          'rgba(239, 68, 68, 0.7)'
        ),
      }
    ]
  };

  const handleViewQuizDetails = async (quizId: string, resultId: string) => {
    try {
      setLoadingQuizDetails(true);
      setError(null);
      setShowRawData(false);
      setRawResultData(null);
      
      console.log('Caricamento dettagli quiz - ID Quiz:', quizId, 'ID Risultato:', resultId);
      
      // 1. Otteniamo i dettagli del risultato specifico
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('*')
        .eq('id', resultId)
        .single();
        
      if (resultError) {
        console.error('Errore nel caricamento del risultato:', resultError);
        throw resultError;
      }
      
      // Salviamo i dati grezzi per il debug
      setRawResultData(resultData);
      
      console.log('Risultato caricato con successo:', resultData);
      
      // Verifica se le domande sono già presenti nel risultato
      if (resultData && resultData.questions && Array.isArray(resultData.questions) && resultData.questions.length > 0) {
        console.log('Domande trovate direttamente nel risultato:', resultData.questions.length);
        
        // Estrai le risposte dello studente dal risultato
        let studentAnswers: number[] = [];
        
        if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
          studentAnswers = resultData.student_answers;
        } else if (resultData.answers && Array.isArray(resultData.answers)) {
          if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
            studentAnswers = resultData.selected_options;
          } else {
            studentAnswers = resultData.answers.map(() => -1);
          }
        }
        
        // Convertiamo i dati nel formato necessario
        const detailedResult: QuizDetailedResult = {
          id: resultData.id,
          quiz_id: quizId,
          questions: resultData.questions,
          studentAnswers: studentAnswers,
          totalTime: resultData.total_time || 0
        };
        
        // Impostiamo i dati del quiz dettagliato
        setDetailedQuizResult(detailedResult);
        setExpandedQuiz(resultId);
        return;
      }
      
      // Verifica se le domande sono presenti come stringa JSON
      if (resultData && typeof resultData.questions === 'string' && resultData.questions.trim() !== '') {
        try {
          console.log('Tentativo di parsing delle domande da stringa JSON');
          const parsedQuestions = JSON.parse(resultData.questions);
          
          if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
            console.log('Domande parsate con successo dalla stringa JSON:', parsedQuestions.length);
            
            // Estrai le risposte dello studente dal risultato
            let studentAnswers: number[] = [];
            
            if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
              studentAnswers = resultData.student_answers;
            } else if (typeof resultData.student_answers === 'string') {
              try {
                studentAnswers = JSON.parse(resultData.student_answers);
              } catch (e) {
                console.error('Errore nel parsing delle risposte dello studente:', e);
                studentAnswers = [];
              }
            } else if (resultData.answers && Array.isArray(resultData.answers)) {
              if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
                studentAnswers = resultData.selected_options;
              } else {
                studentAnswers = resultData.answers.map(() => -1);
              }
            }
            
            // Convertiamo i dati nel formato necessario
            const detailedResult: QuizDetailedResult = {
              id: resultData.id,
              quiz_id: quizId,
              questions: parsedQuestions,
              studentAnswers: studentAnswers,
              totalTime: resultData.total_time || 0
            };
            
            // Impostiamo i dati del quiz dettagliato
            setDetailedQuizResult(detailedResult);
            setExpandedQuiz(resultId);
            return;
          }
        } catch (e) {
          console.error('Errore nel parsing delle domande da stringa JSON:', e);
        }
      }
      
      // Verifichiamo se il quiz_id è valido
      if (!quizId || quizId === 'null' || quizId === 'undefined') {
        console.error('Quiz ID non valido:', quizId);
        setError('ID del quiz non valido. Impossibile caricare i dettagli.');
        return;
      }
      
      // Verifichiamo prima se il quiz esiste
      console.log('Verifica esistenza del quiz:', quizId);
      const { data: quizData, error: quizError } = await supabase
        .from('quiz_templates')
        .select('id, title, description')
        .eq('id', quizId)
        .maybeSingle();
        
      if (quizError) {
        console.error('Errore nella verifica del quiz:', quizError);
        console.log('Tentativo di recupero con quiz_id dal risultato...');
        
        // Proviamo a usare il quiz_id dal risultato
        if (resultData && resultData.quiz_id) {
          quizId = resultData.quiz_id;
          console.log('Usando quiz_id dal risultato:', quizId);
        } else {
          setError(`Quiz non trovato. ID: ${quizId}`);
          return;
        }
      } else if (!quizData) {
        console.log('Quiz non trovato con ID:', quizId);
        console.log('Tentativo di recupero con quiz_id dal risultato...');
        
        // Proviamo a usare il quiz_id dal risultato
        if (resultData && resultData.quiz_id && resultData.quiz_id !== quizId) {
          quizId = resultData.quiz_id;
          console.log('Usando quiz_id dal risultato:', quizId);
        } else {
          // Continuiamo comunque, potremmo trovare le domande in altre tabelle
          console.log('Continuiamo con il tentativo di recupero delle domande da altre fonti');
        }
      } else {
        console.log('Quiz trovato:', quizData);
      }
      
      // 2. Otteniamo le domande del quiz - senza usare position
      console.log('Caricamento domande per quiz_id:', quizId);
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizId);
        
      if (questionsError) {
        console.error('Errore nel caricamento delle domande:', questionsError);
        
        // Tentativo alternativo: prova a caricare dal template del quiz
        console.log('Tentativo alternativo: caricamento dal template del quiz');
        const { data: templateData, error: templateError } = await supabase
          .from('quiz_templates')
          .select('questions')
          .eq('id', quizId)
          .maybeSingle();
          
        if (templateError) {
          console.error('Errore anche nel caricamento dal template:', templateError);
          
          // Ultimo tentativo: prova a caricare dalla tabella results
          console.log('Ultimo tentativo: recupero domande dal risultato stesso');
          if (resultData && resultData.questions && Array.isArray(resultData.questions)) {
            console.log('Domande trovate nel risultato:', resultData.questions.length);
            
            // Estrai le risposte dello studente dal risultato
            let studentAnswers: number[] = [];
            
            if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
              studentAnswers = resultData.student_answers;
            } else if (resultData.answers && Array.isArray(resultData.answers)) {
              if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
                studentAnswers = resultData.selected_options;
              } else {
                studentAnswers = resultData.answers.map(() => -1);
              }
            }
            
            // Convertiamo i dati nel formato necessario
            const detailedResult: QuizDetailedResult = {
              id: resultData.id,
              quiz_id: quizId,
              questions: resultData.questions,
              studentAnswers: studentAnswers,
              totalTime: resultData.total_time || 0
            };
            
            // Impostiamo i dati del quiz dettagliato
            setDetailedQuizResult(detailedResult);
            setExpandedQuiz(resultId);
            return;
          }
          
          setError(`Errore nel caricamento delle domande: ${questionsError.message}`);
          return;
        }
        
        if (templateData && templateData.questions && Array.isArray(templateData.questions) && templateData.questions.length > 0) {
          console.log('Domande caricate con successo dal template:', templateData.questions.length);
          
          // Estrai le risposte dello studente dal risultato
          let studentAnswers: number[] = [];
          
          if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
            studentAnswers = resultData.student_answers;
          } else if (resultData.answers && Array.isArray(resultData.answers)) {
            if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
              studentAnswers = resultData.selected_options;
            } else {
              studentAnswers = resultData.answers.map(() => -1);
            }
          }
          
          // Convertiamo i dati nel formato necessario
          const detailedResult: QuizDetailedResult = {
            id: resultData.id,
            quiz_id: quizId,
            questions: templateData.questions,
            studentAnswers: studentAnswers,
            totalTime: resultData.total_time || 0
          };
          
          // Impostiamo i dati del quiz dettagliato
          setDetailedQuizResult(detailedResult);
          setExpandedQuiz(resultId);
          return;
        } else {
          console.log('Nessuna domanda trovata nel template');
          
          // Ultimo tentativo: prova a caricare dalla tabella questions
          console.log('Ultimo tentativo: caricamento dalla tabella questions');
          const { data: questionsTableData, error: questionsTableError } = await supabase
            .from('questions')
            .select('*')
            .eq('quiz_id', quizId);
            
          if (questionsTableError) {
            console.error('Errore anche nel caricamento dalla tabella questions:', questionsTableError);
            setError(`Errore nel caricamento delle domande: ${questionsError.message}`);
            return;
          }
          
          if (questionsTableData && questionsTableData.length > 0) {
            console.log('Domande caricate con successo dalla tabella questions:', questionsTableData.length);
            
            // Estrai le risposte dello studente dal risultato
            let studentAnswers: number[] = [];
            
            if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
              studentAnswers = resultData.student_answers;
            } else if (resultData.answers && Array.isArray(resultData.answers)) {
              if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
                studentAnswers = resultData.selected_options;
              } else {
                studentAnswers = resultData.answers.map(() => -1);
              }
            }
            
            // Convertiamo i dati nel formato necessario
            const detailedResult: QuizDetailedResult = {
              id: resultData.id,
              quiz_id: quizId,
              questions: questionsTableData,
              studentAnswers: studentAnswers,
              totalTime: resultData.total_time || 0
            };
            
            // Impostiamo i dati del quiz dettagliato
            setDetailedQuizResult(detailedResult);
            setExpandedQuiz(resultId);
            return;
          } else {
            console.log('Nessuna domanda trovata in nessuna tabella');
            
            // Ultimo tentativo: verifichiamo se ci sono domande nel campo questions del risultato
            if (resultData && resultData.questions) {
              console.log('Tentativo di recupero domande dal campo questions del risultato');
              
              let questions = resultData.questions;
              
              // Se è una stringa, proviamo a parsarla come JSON
              if (typeof questions === 'string') {
                try {
                  questions = JSON.parse(questions);
                  console.log('Domande parsate con successo dal campo questions del risultato');
                } catch (e) {
                  console.error('Errore nel parsing delle domande dal campo questions:', e);
                }
              }
              
              if (Array.isArray(questions) && questions.length > 0) {
                console.log('Domande trovate nel campo questions del risultato:', questions.length);
                
                // Estrai le risposte dello studente dal risultato
                let studentAnswers: number[] = [];
                
                if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
                  studentAnswers = resultData.student_answers;
                } else if (typeof resultData.student_answers === 'string') {
                  try {
                    studentAnswers = JSON.parse(resultData.student_answers);
                  } catch (e) {
                    console.error('Errore nel parsing delle risposte dello studente:', e);
                    studentAnswers = [];
                  }
                } else if (resultData.answers && Array.isArray(resultData.answers)) {
                  if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
                    studentAnswers = resultData.selected_options;
                  } else {
                    studentAnswers = resultData.answers.map(() => -1);
                  }
                }
                
                // Convertiamo i dati nel formato necessario
                const detailedResult: QuizDetailedResult = {
                  id: resultData.id,
                  quiz_id: quizId,
                  questions: questions,
                  studentAnswers: studentAnswers,
                  totalTime: resultData.total_time || 0
                };
                
                // Impostiamo i dati del quiz dettagliato
                setDetailedQuizResult(detailedResult);
                setExpandedQuiz(resultId);
                return;
              }
            }
            
            setError('Nessuna domanda trovata per questo quiz');
            return;
          }
        }
      }
      
      if (!questionsData || questionsData.length === 0) {
        console.log('Nessuna domanda trovata per il quiz:', quizId);
        setError('Nessuna domanda trovata per questo quiz');
        return;
      }
      
      console.log('Domande caricate con successo:', questionsData.length);
      
      // Estrai le risposte dello studente dal risultato
      let studentAnswers: number[] = [];
      
      if (resultData.student_answers && Array.isArray(resultData.student_answers)) {
        studentAnswers = resultData.student_answers;
      } else if (resultData.answers && Array.isArray(resultData.answers)) {
        if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
          studentAnswers = resultData.selected_options;
        } else {
          studentAnswers = resultData.answers.map(() => -1);
        }
      }
      
      // Convertiamo i dati nel formato necessario
      const detailedResult: QuizDetailedResult = {
        id: resultData.id,
        quiz_id: quizId,
        questions: questionsData,
        studentAnswers: studentAnswers,
        totalTime: resultData.total_time || 0
      };
      
      // Impostiamo i dati del quiz dettagliato
      setDetailedQuizResult(detailedResult);
      setExpandedQuiz(resultId);
      
    } catch (error) {
      console.error('Error loading quiz details:', error);
      let errorMessage = 'Errore durante il caricamento dei dettagli del quiz';
      
      if (error && typeof error === 'object' && 'message' in error) {
        errorMessage += `: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoadingQuizDetails(false);
    }
  };
  
  const closeQuizDetails = () => {
    setDetailedQuizResult(null);
    setExpandedQuiz(null);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="text-white hover:text-blue-100 flex items-center gap-2"
      >
        <ArrowLeft className="w-5 h-5" />
        Torna alla lista
      </button>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {student.first_name} {student.last_name}
            </h2>
            <p className="text-gray-600 dark:text-slate-400">{student.email}</p>
            {registrationDate && (
              <p className="text-gray-500 dark:text-slate-500 text-sm mt-1 flex items-center">
                <UserPlus className="w-4 h-4 mr-1" />
                Registrato il {formatShortDate(registrationDate)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleSendEmail}
              className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
              aria-label="Invia email allo studente"
            >
              <Mail className="w-5 h-5" />
            </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            student.account_status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {student.account_status === 'active' ? 'Attivo' : 'Sospeso'}
          </span>
        </div>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Quiz Completati</h3>
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">{totalQuizzes}</p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Quiz Superati</h3>
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">{passedQuizzes}</p>
          </div>

          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Ultimo Accesso</h3>
            </div>
            <p className="text-lg font-medium text-slate-900 dark:text-slate-200">
              {student.last_login ? formatDate(student.last_login) : 'Mai acceduto'}
            </p>
          </div>
        </div>
      </div>

      {/* Quiz History */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        {detailedQuizResult ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">
                Dettaglio Quiz
              </h3>
              <button
                onClick={closeQuizDetails}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Torna ai risultati
              </button>
            </div>

            {/* Statistiche del quiz */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Punteggio</h4>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {detailedQuizResult.questions.length > 0 
                    ? `${Math.round((detailedQuizResult.questions.filter((_, i) => 
                        typeof detailedQuizResult.studentAnswers[i] === 'number' && 
                        detailedQuizResult.studentAnswers[i] === detailedQuizResult.questions[i].correct_answer
                      ).length / detailedQuizResult.questions.length) * 100)}%`
                    : '0%'
                  }
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Risposte Corrette</h4>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {detailedQuizResult.questions.filter((_, i) => 
                    typeof detailedQuizResult.studentAnswers[i] === 'number' && 
                    detailedQuizResult.studentAnswers[i] === detailedQuizResult.questions[i].correct_answer
                  ).length} / {detailedQuizResult.questions.length}
                </p>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Risposte Errate</h4>
                </div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {detailedQuizResult.questions.filter((_, i) => 
                    typeof detailedQuizResult.studentAnswers[i] === 'number' && 
                    detailedQuizResult.studentAnswers[i] !== detailedQuizResult.questions[i].correct_answer
                  ).length} / {detailedQuizResult.questions.length}
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Tempo Totale</h4>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatTime(detailedQuizResult.totalTime || 0)}
                </p>
              </div>
            </div>
            
            <ScrollArea className="h-[calc(100vh-400px)] pr-4">
              {detailedQuizResult.questions.map((question, questionIndex) => {
                const studentAnswerIndex = detailedQuizResult.studentAnswers[questionIndex];
                // Se studentAnswerIndex è -1, significa che non abbiamo l'informazione sulla risposta specifica
                // ma solo se era corretta o meno
                const isCorrect = 
                  typeof studentAnswerIndex === 'number' && studentAnswerIndex === question.correct_answer || 
                  (studentAnswerIndex === -1 && Array.isArray(detailedQuizResult.studentAnswers) && 
                   typeof detailedQuizResult.studentAnswers[questionIndex] === 'boolean' && 
                   detailedQuizResult.studentAnswers[questionIndex] === true);
                
                return (
                  <div 
                    key={question.id} 
                    className={`mb-6 p-4 rounded-lg border ${
                      isCorrect 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30' 
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/30'
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <h4 className="text-lg font-medium text-slate-900 dark:text-white">
                        Domanda {questionIndex + 1}
                      </h4>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        isCorrect 
                          ? 'bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-300' 
                          : 'bg-red-100 dark:bg-red-800/40 text-red-800 dark:text-red-300'
                      }`}>
                        {isCorrect ? 'Corretta' : 'Errata'}
                      </span>
                    </div>
                    
                    <div className="mb-4 text-slate-800 dark:text-slate-200">{question.question_text}</div>
                    
                    {question.image_url && (
                      <div className="mb-4">
                        <img 
                          src={question.image_url} 
                          alt="Immagine della domanda" 
                          className="max-h-48 rounded-lg" 
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, optionIndex) => {
                        // Determina lo stato di questa opzione
                        let isSelectedByStudent = false;
                        let isCorrectOption = optionIndex === question.correct_answer;
                        
                        if (studentAnswerIndex !== -1) {
                          // Se abbiamo l'indice della risposta scelta dallo studente
                          isSelectedByStudent = optionIndex === studentAnswerIndex;
                        } else if (Array.isArray(detailedQuizResult.studentAnswers)) {
                          // Se abbiamo solo un array di booleani per risposte corrette/errate
                          // Non possiamo sapere quale opzione ha selezionato lo studente,
                          // ma possiamo evidenziare comunque la risposta corretta
                          isSelectedByStudent = false;
                        }
                        
                        return (
                          <div 
                            key={optionIndex}
                            className={`p-3 rounded-lg border ${
                              isCorrectOption
                                ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
                                : isSelectedByStudent
                                  ? 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
                                  : 'bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex gap-2 items-start">
                              <div className="mt-0.5">
                                {isCorrectOption ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : isSelectedByStudent ? (
                                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                ) : (
                                  <div className="w-5 h-5 border-2 border-gray-300 dark:border-slate-600 rounded-full" />
                                )}
                              </div>
                              <div>{option}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {question.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-300 rounded-lg">
                        <div className="font-medium mb-1">Spiegazione:</div>
                        <div>{question.explanation}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </ScrollArea>
          </div>
        ) : loadingQuizDetails ? (
          <div className="p-6 flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Caricamento dettagli del quiz...</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
              <div className="mt-4 flex space-x-2">
                <button 
                  onClick={() => {
                    setError(null);
                    if (expandedQuiz) {
                      const parts = expandedQuiz.split('-');
                      if (parts.length === 2) {
                        handleViewQuizDetails(parts[0], parts[1]);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Riprova
                </button>
                {rawResultData && (
                  <button 
                    onClick={() => setShowRawData(!showRawData)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {showRawData ? 'Nascondi dati grezzi' : 'Mostra dati grezzi'}
                  </button>
                )}
                <button 
                  onClick={() => {
                    setError(null);
                    closeQuizDetails();
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Chiudi
                </button>
              </div>
              
              {showRawData && rawResultData && (
                <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-auto max-h-96">
                  <h4 className="font-bold mb-2">Dati grezzi del risultato:</h4>
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(rawResultData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 border-b border-gray-200 dark:border-slate-800">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-4">Cronologia Quiz</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center gap-2 mb-1">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Media Punteggi</h4>
              </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(averageScore * 100).toFixed(1)}%
              </p>
            </div>

              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800/30">
              <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Tasso di Successo</h4>
              </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {totalQuizzes > 0 ? ((passedQuizzes / totalQuizzes) * 100).toFixed(1) : 0}%
              </p>
            </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30">
              <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="font-medium text-slate-900 dark:text-white">Tempo Medio</h4>
              </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {formatTime(Math.round(averageTime))}
              </p>
            </div>
          </div>

          <div className="h-64 mb-6">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => `${value}%`,
                        color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                      },
                      grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                      },
                      grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                        }
                      }
                    },
                    legend: {
                      position: 'top',
                      labels: {
                        color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#334155'
                    }
                  }
                }
              }}
            />
          </div>

            <h4 className="text-lg font-semibold text-slate-950 dark:text-white mb-3">Tabella Risultati Quiz</h4>
            
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">Data</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">Quiz</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">Categoria</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">Punteggio</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">Tempo</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">Risultato</th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-600 dark:text-slate-300">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {quizResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-center text-gray-500 dark:text-slate-400">
                        Nessun quiz completato
                      </td>
                    </tr>
                  ) : (
                    quizResults.map((result) => (
                      <tr key={result.id} className="border-t border-gray-100 dark:border-slate-700">
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{formatShortDate(result.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">
                          {result.quiz_details?.title || 'Quiz non disponibile'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{result.category || 'N/D'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-slate-200">
                          {(result.score * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{formatTime(result.total_time)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.score >= 0.75 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {result.score >= 0.75 ? 'Superato' : 'Non superato'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewQuizDetails(result.quiz_id, result.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-2"
                            aria-label="Visualizza dettagli"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
                      </div>

            <h4 className="text-lg font-semibold text-slate-950 dark:text-white mb-3">Performance per Categoria</h4>
            
            <div className="h-64 mb-6">
              <Bar
                data={categoryChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: value => `${value}%`,
                        color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                      },
                      grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'
                      },
                      grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const categoryData = categoryPerformance[context.dataIndex];
                          return [
                            `Tasso di Successo: ${context.parsed.y.toFixed(1)}%`,
                            `Risposte Corrette: ${categoryData.correctAnswers}/${categoryData.totalQuestions}`
                          ];
                        }
                      }
                    },
                    legend: {
                      display: false
                    }
                  }
                }}
              />
                    </div>
                  </div>
        )}
                </div>

      {/* Note dell'istruttore */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-4">Note dell'Istruttore</h3>
          
          <div className="mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Aggiungi una nota su questo studente..."
              className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              rows={3}
            />
            <button
              onClick={handleAddNote}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Aggiungi Nota
            </button>
              </div>
          
          <div className="space-y-4">
            {/* Log per debug */}
            {notes.length === 0 ? (
              <p className="text-gray-500 dark:text-slate-400 italic">Nessuna nota presente per questo studente</p>
            ) : (
              notes.map((note) => {
                console.log('Rendering note:', note);
                return (
                  <div key={note.id} className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                    {editingNoteId === note.id ? (
                      <div>
                        <textarea
                          value={editNoteContent}
                          onChange={(e) => setEditNoteContent(e.target.value)}
                          className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleSaveEditedNote}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <Save className="w-4 h-4" />
                            Salva
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Annulla
                          </button>
          </div>
        </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm text-gray-500 dark:text-slate-400">{formatDate(note.created_at)}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditNote(note)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              aria-label="Modifica nota"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteNoteModal({ id: note.id, comment: note.comment })}
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                              aria-label="Elimina nota"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
      </div>
                        </div>
                        {note.comment ? (
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{note.comment}</p>
                        ) : (
                          <p className="text-gray-500 dark:text-slate-400 italic">Nessun contenuto</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Modale di conferma eliminazione nota */}
      {showDeleteNoteModal && (
        <ConfirmModal
          type="delete"
          title="Elimina nota"
          message="Sei sicuro di voler eliminare questa nota? Questa azione non può essere annullata."
          details={showDeleteNoteModal.comment}
          onConfirm={() => {
            handleDeleteNote(showDeleteNoteModal.id);
            setShowDeleteNoteModal(null);
          }}
          onCancel={() => setShowDeleteNoteModal(null)}
        />
      )}

      {/* Visualizzazione dettagli quiz */}
      {expandedQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Dettagli Quiz</h3>
              <button
                onClick={closeQuizDetails}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {loadingQuizDetails ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-gray-500 dark:text-gray-400">Caricamento dettagli quiz...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-400">Errore</h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
                      
                      {rawResultData && (
                        <div className="mt-4">
                          <button
                            onClick={() => setShowRawData(!showRawData)}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                          >
                            {showRawData ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-1" />
                                Nascondi dati grezzi
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-1" />
                                Mostra dati grezzi
                              </>
                            )}
                          </button>
                          
                          {showRawData && (
                            <div className="mt-3 bg-gray-100 dark:bg-slate-800 rounded-md p-3 overflow-x-auto">
                              <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(rawResultData, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <button
                          onClick={() => handleViewQuizDetails(detailedQuizResult?.quiz_id || '', expandedQuiz || '')}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors flex items-center"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Riprova
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : detailedQuizResult ? (
                <>
                  {/* Statistiche del quiz */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center">
                      <Target className="w-6 h-6 text-blue-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Punteggio</h4>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {Math.round((detailedQuizResult.studentAnswers.filter(a => a !== -1 && detailedQuizResult.questions[a]?.correct_answer === a).length / detailedQuizResult.questions.length) * 100)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Risposte Corrette</h4>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {detailedQuizResult.studentAnswers.filter(a => a !== -1 && detailedQuizResult.questions[a]?.correct_answer === a).length} / {detailedQuizResult.questions.length}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center">
                      <XCircle className="w-6 h-6 text-red-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Risposte Errate</h4>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {detailedQuizResult.studentAnswers.filter(a => a !== -1 && detailedQuizResult.questions[a]?.correct_answer !== a).length} / {detailedQuizResult.questions.length}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 flex items-center">
                      <Clock className="w-6 h-6 text-orange-500 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo Totale</h4>
                        <p className="text-lg font-semibold text-slate-900 dark:text-white">
                          {formatTime(detailedQuizResult.totalTime || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Domande e risposte */}
                  <div className="space-y-6">
                    {detailedQuizResult.questions.map((question, index) => {
                      const studentAnswerIndex = detailedQuizResult.studentAnswers[index];
                      // Correggiamo il controllo del tipo per evitare confronti tra number e boolean
                      const isCorrect = typeof studentAnswerIndex === 'number' && studentAnswerIndex !== -1 
                        ? studentAnswerIndex === question.correct_answer 
                        : Array.isArray(detailedQuizResult.studentAnswers) && 
                          typeof detailedQuizResult.studentAnswers[index] === 'boolean' &&
                          detailedQuizResult.studentAnswers[index] === true;
                      
                      return (
                        <div 
                          key={index} 
                          className={`p-4 rounded-lg border ${
                            isCorrect 
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          }`}
                        >
                          <div className="flex items-start">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 mt-0.5 ${
                              isCorrect 
                                ? 'bg-green-100 dark:bg-green-800' 
                                : 'bg-red-100 dark:bg-red-800'
                            }`}>
                              {isCorrect ? (
                                <Check className="w-3 h-3 text-white" />
                              ) : (
                                <X className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                                {index + 1}. {question.question_text}
                              </h4>
                              
                              {question.image_url && (
                                <img 
                                  src={question.image_url} 
                                  alt={`Immagine per la domanda ${index + 1}`}
                                  className="mb-3 rounded-md max-h-48 object-contain"
                                />
                              )}
                              
                              <div className="space-y-2 mt-3">
                                {question.options.map((option, optionIndex) => {
                                  const isSelected = typeof studentAnswerIndex === 'number' && studentAnswerIndex !== -1 
                                    ? studentAnswerIndex === optionIndex 
                                    : false;
                                  const isCorrectOption = optionIndex === question.correct_answer;
                                  
                                  return (
                                    <div 
                                      key={optionIndex}
                                      className={`p-2 rounded ${
                                        isSelected && isCorrectOption
                                          ? 'bg-green-100 dark:bg-green-800/40 border border-green-200 dark:border-green-700'
                                          : isSelected && !isCorrectOption
                                            ? 'bg-red-100 dark:bg-red-800/40 border border-red-200 dark:border-red-700'
                                            : !isSelected && isCorrectOption
                                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                              : 'bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center mr-2 ${
                                          isSelected
                                            ? isCorrectOption
                                              ? 'bg-green-500 dark:bg-green-600'
                                              : 'bg-red-500 dark:bg-red-600'
                                            : isCorrectOption
                                              ? 'bg-blue-500 dark:bg-blue-600'
                                              : 'bg-gray-300 dark:bg-gray-600'
                                        }`}>
                                          {isSelected ? (
                                            isCorrectOption ? (
                                              <Check className="w-3 h-3 text-white" />
                                            ) : (
                                              <X className="w-3 h-3 text-white" />
                                            )
                                          ) : (
                                            isCorrectOption ? (
                                              <Check className="w-3 h-3 text-white" />
                                            ) : (
                                              <span className="text-xs text-white font-medium">{String.fromCharCode(65 + optionIndex)}</span>
                                            )
                                          )}
                                        </div>
                                        <span className={`text-sm ${
                                          isSelected || isCorrectOption
                                            ? 'font-medium'
                                            : ''
                                        }`}>
                                          {option}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {studentAnswerIndex === -1 && (
                                  <div className="p-2 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                    <div className="flex items-center">
                                      <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
                                      <span className="text-sm text-gray-600 dark:text-gray-300">
                                        Risposta non disponibile
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {question.explanation && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800">
                                  <div className="flex">
                                    <HelpCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5" />
                                    <div>
                                      <h5 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">Spiegazione</h5>
                                      <p className="text-sm text-blue-600 dark:text-blue-300">{question.explanation}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-64">
                  <FileQuestion className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Nessun dettaglio disponibile</p>
                </div>
              )}
              
              {/* Visualizzazione dati grezzi per debug */}
              {rawResultData && !error && (
                <div className="mt-8 border-t border-gray-200 dark:border-slate-700 pt-4">
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  >
                    {showRawData ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-1" />
                        Nascondi dati grezzi
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-1" />
                        Mostra dati grezzi per debug
                      </>
                    )}
                  </button>
                  
                  {showRawData && (
                    <div className="mt-3 bg-gray-100 dark:bg-slate-800 rounded-md p-3 overflow-x-auto">
                      <pre className="text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
                        {JSON.stringify(rawResultData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}