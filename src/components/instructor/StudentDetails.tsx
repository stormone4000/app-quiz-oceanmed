import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  questions?: any[] | string;
  student_answers?: number[] | string;
  selected_options?: number[];
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

// Interfaccia per le informazioni sul creatore del codice
interface CodeCreatorInfo {
  code: string;
  created_at: string;
  creator_first_name: string;
  creator_last_name: string;
  creator_email: string;
}

// Funzione per verificare se un valore è un UUID v4 valido
function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

export function StudentDetails({ student, onBack }: StudentDetailsProps) {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryItem[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [classAverages, setClassAverages] = useState<{[date: string]: number}>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [registrationDate, setRegistrationDate] = useState<string | null>(null);
  const [detailedQuizResult, setDetailedQuizResult] = useState<QuizDetailedResult | null>(null);
  const [loadingQuizDetails, setLoadingQuizDetails] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState<{ id: string; comment: string } | null>(null);
  const [rawResultData, setRawResultData] = useState<any>(null);
  const [isLoadingQuizDetails, setIsLoadingQuizDetails] = useState(false);
  const [quizDetailsError, setQuizDetailsError] = useState<string | null>(null);
  const [codeCreatorInfo, setCodeCreatorInfo] = useState<CodeCreatorInfo | null>(null);
  const [loadingCodeInfo, setLoadingCodeInfo] = useState(false);

  useEffect(() => {
    loadStudentData();
    loadRegistrationDate();
    loadClassAverages();
    loadCodeCreatorInfo();
  }, [student.email]);

  const loadRegistrationDate = async () => {
    try {
      // Verifichiamo se la tabella profiles esiste
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('email', student.email)
          .single();
        
        if (error) {
          console.error('Error loading registration date:', error);
          // Se la tabella non esiste, usiamo la data di creazione dell'utente se disponibile
          if (student.created_at) {
            setRegistrationDate(student.created_at);
          }
          return;
        }
        
        if (data && data.created_at) {
          setRegistrationDate(data.created_at);
        }
      } catch (error) {
        console.error('Exception loading registration date:', error);
        // Se c'è un'eccezione, usiamo la data di creazione dell'utente se disponibile
        if (student.created_at) {
          setRegistrationDate(student.created_at);
        }
      }
    } catch (error) {
      console.error('Error in loadRegistrationDate:', error);
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

  const loadCodeCreatorInfo = async () => {
    try {
      setLoadingCodeInfo(true);
      
      // Prima proviamo a ottenere i dati tramite una query semplice
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select('code_id, student_email')
        .eq('student_email', student.email)
        .order('used_at', { ascending: false })
        .limit(1);
      
      if (usageError) {
        console.error('Errore nel recupero dell\'utilizzo del codice:', usageError);
        setLoadingCodeInfo(false);
        return;
      }
      
      if (!usageData || usageData.length === 0) {
        console.log('Nessun utilizzo di codice trovato per lo studente');
        setLoadingCodeInfo(false);
        return;
      }
      
      const codeId = usageData[0].code_id;
      
      // Ora otteniamo i dettagli del codice
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('code, created_at, created_by')
        .eq('id', codeId)
        .single();
      
      if (codeError) {
        console.error('Errore nel recupero dei dettagli del codice:', codeError);
        setLoadingCodeInfo(false);
        return;
      }
      
      // Infine otteniamo i dettagli del creatore
      const { data: creatorData, error: creatorError } = await supabase
        .from('auth_users')
        .select('first_name, last_name, email')
        .eq('id', codeData.created_by)
        .single();
      
      if (creatorError) {
        console.error('Errore nel recupero dei dettagli del creatore:', creatorError);
        setLoadingCodeInfo(false);
        return;
      }
      
      // Ora abbiamo tutti i dati necessari
      setCodeCreatorInfo({
        code: codeData.code,
        created_at: codeData.created_at,
        creator_first_name: creatorData.first_name || '',
        creator_last_name: creatorData.last_name || '',
        creator_email: creatorData.email
      });
    } catch (err) {
      console.error('Errore imprevisto nel caricamento delle informazioni sul creatore del codice:', err);
    } finally {
      setLoadingCodeInfo(false);
    }
  };

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Caricamento dati studente:', student.email);

      // STEP 1: Carichiamo i risultati di base dei quiz
      try {
        const { data: basicResults, error: basicError } = await supabase
          .from('results')
          .select('*')
          .eq('student_email', student.email)
          .order('date', { ascending: false });

        if (basicError) {
          console.error('Error loading quiz results:', basicError);
          throw basicError;
        }
        
        // Se abbiamo risultati, prepariamo l'array finale
        if (basicResults && basicResults.length > 0) {
          console.log(`Trovati ${basicResults.length} risultati per lo studente:`, student.email);
          
          // Creiamo una copia dei risultati che aggiorneremo con i dettagli dei quiz
          const resultsWithDetails = [...basicResults];
          
          // Per ogni risultato, facciamo una query specifica per ottenere i dettagli del quiz
          for (let i = 0; i < resultsWithDetails.length; i++) {
            const result = resultsWithDetails[i];
            const quizId = result.quiz_id;
            
            console.log(`Cercando dettagli per il quiz ${i+1}/${resultsWithDetails.length}, ID: ${quizId}`);
            
            // Primo tentativo: cerchiamo in quiz_templates
            let { data: quizTemplate } = await supabase
              .from('quiz_templates')
              .select('id, title, description, quiz_type, category, question_count, duration_minutes')
              .eq('id', quizId)
              .maybeSingle();
            
            if (quizTemplate) {
              console.log(`Trovato in quiz_templates: ${quizTemplate.title}`);
              resultsWithDetails[i].quiz_details = quizTemplate;
              continue; // Passiamo al prossimo risultato
            }
            
            // Secondo tentativo: cerchiamo in interactive_quiz_templates
            try {
              // Verifica se l'ID è un UUID valido prima di fare la query
              if (!isValidUUID(quizId.toString())) {
                console.warn(`ID non valido per interactive_quiz_templates: ${quizId} non è un UUID valido`);
                continue; // Passiamo al prossimo risultato
              }
              
              let { data: interactiveTemplate } = await supabase
                .from('interactive_quiz_templates')
                .select('id, title, description, quiz_type, category, question_count, duration_minutes')
                .eq('id', quizId.toString())
                .maybeSingle();
                
              if (interactiveTemplate) {
                console.log(`Trovato in interactive_quiz_templates: ${interactiveTemplate.title}`);
                resultsWithDetails[i].quiz_details = interactiveTemplate;
                continue; // Passiamo al prossimo risultato
              }
            } catch (err) {
              console.warn(`Errore nel cercare in interactive_quiz_templates per ID ${quizId}:`, err);
            }
            
            // NUOVO TENTATIVO: cerchiamo nella tabella quizzes e recuperiamo il titolo originale
            try {
              let { data: quizRecord } = await supabase
                .from('quizzes')
                .select('id, title, description, category, questions')
                .eq('id', quizId)
                .maybeSingle();
                
              if (quizRecord && quizRecord.questions && quizRecord.questions.length > 0) {
                // Estraiamo il quiz_id originale dalla prima domanda
                const originalQuizId = quizRecord.questions[0].quiz_id;
                
                if (originalQuizId) {
                  console.log(`Trovato quiz_id originale: ${originalQuizId} dalla tabella quizzes`);
                  
                  // Recuperiamo il titolo originale dalla tabella quiz_templates
                  let { data: originalTemplate } = await supabase
                    .from('quiz_templates')
                    .select('id, title, description, quiz_type, category, question_count, duration_minutes')
                    .eq('id', originalQuizId)
                    .maybeSingle();
                    
                  if (originalTemplate) {
                    console.log(`Trovato titolo originale: ${originalTemplate.title}`);
                    resultsWithDetails[i].quiz_details = originalTemplate;
                    continue;
                  }
                }
                
                // Se non troviamo il titolo originale, usiamo i dati dalla tabella quizzes
                console.log(`Usando dati dalla tabella quizzes: ${quizRecord.title}`);
                resultsWithDetails[i].quiz_details = {
                  id: quizRecord.id,
                  title: quizRecord.title,
                  description: quizRecord.description,
                  quiz_type: result.quiz_type || 'exam',
                  category: quizRecord.category || 'uncategorized',
                  question_count: Array.isArray(quizRecord.questions) ? quizRecord.questions.length : 0,
                  duration_minutes: 0
                };
                continue;
              }
            } catch (err) {
              console.warn(`Errore nel cercare in quizzes per ID ${quizId}:`, err);
            }
            
            // Terzo tentativo: utilizziamo la stored procedure
            try {
              const { data, error } = await supabase
                .rpc('improve_quiz_result_details', { p_result_id: result.id });
                
              if (!error && data && data.quiz_details) {
                console.log(`Trovato tramite stored procedure: ${data.quiz_details.title}`);
                resultsWithDetails[i].quiz_details = data.quiz_details;
                continue;
              }
              
              console.warn(`La stored procedure non ha trovato dettagli per il risultato ID ${result.id}`);
            } catch (err) {
              console.warn(`Errore con la stored procedure per il risultato ID ${result.id}:`, err);
            }
            
            // Fallback: creiamo un oggetto quiz_details minimo con un titolo predefinito
            console.log(`Nessun dettaglio trovato per il quiz ID ${quizId}, impostando titolo predefinito`);
            resultsWithDetails[i].quiz_details = {
              id: quizId,
              title: `Quiz ${i+1}`,
              description: 'Dettagli non disponibili',
              quiz_type: result.quiz_type || 'unknown',
              category: result.category || 'unknown',
              question_count: 0,
              duration_minutes: 0
            };
          }
          
          // Log dei risultati finali
          console.log('Risultati arricchiti con dettagli:', 
            resultsWithDetails.map(r => ({ 
              id: r.id, 
              quiz_id: r.quiz_id, 
              has_details: !!r.quiz_details,
              title: r.quiz_details?.title || 'Quiz non disponibile'
            }))
          );
          
          setQuizResults(resultsWithDetails);
          calculateCategoryPerformance(resultsWithDetails);
        } else {
          console.log('Nessun risultato trovato per lo studente:', student.email);
          setQuizResults([]);
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
      setIsLoadingQuizDetails(true);
      setQuizDetailsError(null);
      setDetailedQuizResult(null);
      setRawResultData(null);
      
      console.log(`Caricamento dettagli per quiz ID: ${quizId}, risultato ID: ${resultId}`);
      
      // STEP 1: Recuperiamo i dettagli del risultato
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('*')
        .eq('id', resultId)
        .single();
        
      if (resultError) {
        console.error('Error loading quiz result:', resultError);
        setQuizDetailsError('Errore durante il caricamento del risultato del quiz');
        setIsLoadingQuizDetails(false);
        return;
      }
      
      console.log('Risultato caricato:', resultData);
      setRawResultData(resultData);
      
      // STEP 2: Proviamo a recuperare le domande e le risposte reali
      
      // Prima verifichiamo se il quiz è nella tabella quizzes (quiz completati)
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
        
      if (!quizError && quizData && quizData.questions && quizData.questions.length > 0) {
        console.log('Quiz trovato nella tabella quizzes:', quizData);
        
        // Estraiamo il quiz_id originale dalla prima domanda
        const originalQuizId = quizData.questions[0].quiz_id;
        
        if (originalQuizId) {
          console.log(`Trovato quiz_id originale: ${originalQuizId}, recuperando domande originali`);
          
          // Recuperiamo le domande originali dalla tabella quiz_questions
          const { data: originalQuestions, error: questionsError } = await supabase
            .from('quiz_questions')
            .select('*')
            .eq('quiz_id', originalQuizId)
            .order('id');
            
          if (!questionsError && originalQuestions && originalQuestions.length > 0) {
            console.log(`Trovate ${originalQuestions.length} domande originali`);
            
            // Ora dobbiamo abbinare le risposte dello studente alle domande originali
            // Questo può essere complesso perché le risposte potrebbero essere in formati diversi
            
            // Prepariamo le risposte dello studente
            let studentAnswers: number[] = [];
            
            // Controlliamo i vari formati possibili delle risposte
            if (resultData.student_answers) {
              if (typeof resultData.student_answers === 'string') {
                try {
                  studentAnswers = JSON.parse(resultData.student_answers);
                } catch (e) {
                  console.warn('Impossibile parsare student_answers come JSON:', e);
                }
              } else if (Array.isArray(resultData.student_answers)) {
                studentAnswers = resultData.student_answers;
              }
            } else if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
              studentAnswers = resultData.selected_options;
            } else if (resultData.answers && Array.isArray(resultData.answers)) {
              // Se abbiamo solo array di boolean, dobbiamo convertirlo in indici
              studentAnswers = resultData.answers.map((isCorrect: boolean, index: number) => {
                // Se la risposta è corretta, restituiamo l'indice della risposta corretta
                // altrimenti restituiamo un indice diverso (potrebbe non essere preciso)
                if (index < originalQuestions.length) {
                  return isCorrect ? originalQuestions[index].correct_answer : 
                    (originalQuestions[index].correct_answer === 0 ? 1 : 0);
                }
                return -1; // Valore sentinella per risposte non disponibili
              });
            }
            
            console.log('Risposte dello studente elaborate:', studentAnswers);
            
            // Creiamo il risultato dettagliato
            const detailedResult: QuizDetailedResult = {
              id: resultData.id,
              quiz_id: quizId,
              questions: originalQuestions.map(q => ({
                id: q.id,
                question_text: q.question_text,
                options: Array.isArray(q.options) ? q.options : [],
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                image_url: q.image_url
              })),
              studentAnswers: studentAnswers.length >= originalQuestions.length ? 
                studentAnswers.slice(0, originalQuestions.length) : 
                [...studentAnswers, ...Array(originalQuestions.length - studentAnswers.length).fill(-1)],
              totalTime: resultData.total_time
            };
            
            console.log('Risultato dettagliato creato con domande originali:', detailedResult);
            setDetailedQuizResult(detailedResult);
            setIsLoadingQuizDetails(false);
            return;
          } else {
            console.warn('Impossibile recuperare le domande originali:', questionsError);
          }
        }
        
        // Se non riusciamo a recuperare le domande originali, usiamo quelle dalla tabella quizzes
        console.log('Utilizzo delle domande dalla tabella quizzes');
        const questions = quizData.questions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          image_url: q.image_url
        }));
        
        // Prepariamo le risposte dello studente
        let studentAnswers: number[] = [];
        
        // Controlliamo i vari formati possibili delle risposte
        if (resultData.student_answers) {
          if (typeof resultData.student_answers === 'string') {
            try {
              studentAnswers = JSON.parse(resultData.student_answers);
            } catch (e) {
              console.warn('Impossibile parsare student_answers come JSON:', e);
            }
          } else if (Array.isArray(resultData.student_answers)) {
            studentAnswers = resultData.student_answers;
          }
        } else if (resultData.selected_options && Array.isArray(resultData.selected_options)) {
          studentAnswers = resultData.selected_options;
        } else if (resultData.answers && Array.isArray(resultData.answers)) {
          // Se abbiamo solo array di boolean, dobbiamo convertirlo in indici
          studentAnswers = resultData.answers.map((isCorrect: boolean, index: number) => {
            // Se la risposta è corretta, restituiamo l'indice della risposta corretta
            // altrimenti restituiamo un indice diverso (potrebbe non essere preciso)
            if (index < questions.length) {
              return isCorrect ? questions[index].correct_answer : 
                (questions[index].correct_answer === 0 ? 1 : 0);
            }
            return -1; // Valore sentinella per risposte non disponibili
          });
        }
        
        const detailedResult: QuizDetailedResult = {
          id: resultData.id,
          quiz_id: quizId,
          questions,
          studentAnswers: studentAnswers.length >= questions.length ? 
            studentAnswers.slice(0, questions.length) : 
            [...studentAnswers, ...Array(questions.length - studentAnswers.length).fill(-1)],
          totalTime: resultData.total_time
        };
        
        console.log('Risultato dettagliato creato con domande dalla tabella quizzes:', detailedResult);
        setDetailedQuizResult(detailedResult);
        setIsLoadingQuizDetails(false);
        return;
      }
      
      // STEP 3: Se non troviamo il quiz nella tabella quizzes, proviamo con la stored procedure
      try {
        console.log('Tentativo con stored procedure improve_quiz_result_details');
        const { data, error } = await supabase
          .rpc('improve_quiz_result_details', { p_result_id: resultId });
          
        if (error) {
          console.error('Error with stored procedure:', error);
          throw error;
        }
        
        if (data && data.questions && data.questions.length > 0) {
          console.log('Dati recuperati dalla stored procedure:', data);
          
          const detailedResult: QuizDetailedResult = {
            id: resultId,
            quiz_id: quizId,
            questions: data.questions.map((q: any) => ({
              id: q.id || `q-${Math.random().toString(36).substring(2, 9)}`,
              question_text: q.question_text,
              options: Array.isArray(q.options) ? q.options : [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              image_url: q.image_url
            })),
            studentAnswers: data.questions.map((q: any) => 
              typeof q.student_answer === 'number' ? q.student_answer : -1
            ),
            totalTime: resultData.total_time
          };
          
          console.log('Risultato dettagliato creato dalla stored procedure:', detailedResult);
          setDetailedQuizResult(detailedResult);
          setIsLoadingQuizDetails(false);
          return;
        } else {
          console.warn('La stored procedure non ha restituito domande');
        }
      } catch (err) {
        console.error('Errore con la stored procedure:', err);
      }
      
      // STEP 4: Fallback - Proviamo a recuperare le domande direttamente dalle tabelle
      try {
        console.log('Tentativo di recupero domande dalle tabelle quiz_questions o interactive_quiz_questions');
        
        // Proviamo prima con quiz_questions
        const { data: quizQuestions, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId);
          
        if (!questionsError && quizQuestions && quizQuestions.length > 0) {
          console.log(`Trovate ${quizQuestions.length} domande in quiz_questions`);
          
          const detailedResult: QuizDetailedResult = {
            id: resultId,
            quiz_id: quizId,
            questions: quizQuestions.map(q => ({
              id: q.id,
              question_text: q.question_text,
              options: Array.isArray(q.options) ? q.options : [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              image_url: q.image_url
            })),
            studentAnswers: Array(quizQuestions.length).fill(-1), // Non abbiamo le risposte specifiche
            totalTime: resultData.total_time
          };
          
          console.log('Risultato dettagliato creato da quiz_questions:', detailedResult);
          setDetailedQuizResult(detailedResult);
          setIsLoadingQuizDetails(false);
          return;
        }
        
        // Se non troviamo in quiz_questions, proviamo con interactive_quiz_questions
        const { data: interactiveQuestions, error: interactiveError } = await supabase
          .from('interactive_quiz_questions')
          .select('*')
          .eq('quiz_id', quizId);
          
        if (!interactiveError && interactiveQuestions && interactiveQuestions.length > 0) {
          console.log(`Trovate ${interactiveQuestions.length} domande in interactive_quiz_questions`);
          
          const detailedResult: QuizDetailedResult = {
            id: resultId,
            quiz_id: quizId,
            questions: interactiveQuestions.map(q => ({
              id: q.id,
              question_text: q.question_text,
              options: Array.isArray(q.options) ? q.options : [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              image_url: q.image_url
            })),
            studentAnswers: Array(interactiveQuestions.length).fill(-1), // Non abbiamo le risposte specifiche
            totalTime: resultData.total_time
          };
          
          console.log('Risultato dettagliato creato da interactive_quiz_questions:', detailedResult);
          setDetailedQuizResult(detailedResult);
          setIsLoadingQuizDetails(false);
          return;
        }
      } catch (err) {
        console.error('Errore nel recupero delle domande dalle tabelle:', err);
      }
      
      // Se arriviamo qui, non siamo riusciti a trovare le domande
      console.error('Impossibile trovare le domande per questo quiz');
      setQuizDetailsError('Domande non trovate o non caricate correttamente. Il quiz potrebbe essere stato modificato o eliminato.');
      setIsLoadingQuizDetails(false);
    } catch (error) {
      console.error('Error in handleViewQuizDetails:', error);
      setQuizDetailsError('Si è verificato un errore durante il caricamento dei dettagli del quiz');
      setIsLoadingQuizDetails(false);
    }
  };
  
  const closeQuizDetails = () => {
    setDetailedQuizResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Dettagli Studente: {student.first_name} {student.last_name}
        </h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/30 dark:border-red-800 dark:text-red-400" role="alert">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informazioni generali */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informazioni Generali</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
                <p className="text-slate-900 dark:text-white">{student.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Nome Completo</p>
                <p className="text-slate-900 dark:text-white">
                  {student.first_name || student.last_name ? 
                    `${student.first_name} ${student.last_name}` : 
                    <span className="text-gray-400 dark:text-gray-500 italic">Nome non disponibile</span>
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Stato Account</p>
                <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  student.account_status === 'active'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {student.account_status === 'active' ? 'Attivo' : 'Sospeso'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Ultimo Accesso</p>
                <p className="text-slate-900 dark:text-white">{formatDate(student.last_login)}</p>
              </div>
              {registrationDate && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Data Registrazione</p>
                  <p className="text-slate-900 dark:text-white">{formatDate(registrationDate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Informazioni sul creatore del codice */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Informazioni Codice di Accesso</h3>
            {loadingCodeInfo ? (
              <div className="flex justify-center items-center p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : codeCreatorInfo ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Codice Utilizzato</p>
                  <p className="text-slate-900 dark:text-white font-mono">{codeCreatorInfo.code}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Creato da</p>
                  <p className="text-slate-900 dark:text-white">
                    {codeCreatorInfo.creator_first_name || codeCreatorInfo.creator_last_name ? 
                      `${codeCreatorInfo.creator_first_name} ${codeCreatorInfo.creator_last_name}` : 
                      <span className="text-gray-400 dark:text-gray-500 italic">Nome non disponibile</span>
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Email Creatore</p>
                  <p className="text-slate-900 dark:text-white">{codeCreatorInfo.creator_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Data Creazione</p>
                  <p className="text-slate-900 dark:text-white">{formatDate(codeCreatorInfo.created_at)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 italic">Nessuna informazione disponibile sul codice di accesso</p>
            )}
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
                                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300'
                                  : isSelectedByStudent
                                    ? 'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300'
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
          ) : isLoadingQuizDetails ? (
            <div className="p-6 flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Caricamento dettagli del quiz...</p>
            </div>
          ) : quizDetailsError ? (
            <div className="p-6">
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span>{quizDetailsError}</span>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button 
                    onClick={() => {
                      setQuizDetailsError(null);
                      handleViewQuizDetails(quizResults[0].quiz_id, quizResults[0].id);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Riprova
                  </button>
                  {rawResultData && (
                    <button 
                      onClick={() => setIsLoadingQuizDetails(!isLoadingQuizDetails)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {isLoadingQuizDetails ? 'Nascondi dati grezzi' : 'Mostra dati grezzi'}
                    </button>
                  )}
                  <button 
                    onClick={closeQuizDetails}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Chiudi
                  </button>
                </div>
                
                {isLoadingQuizDetails && rawResultData && (
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

      </div>
    </div>
  );
}