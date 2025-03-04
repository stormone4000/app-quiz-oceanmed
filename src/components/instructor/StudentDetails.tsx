import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Book, Star, Clock, CheckCircle2, XCircle, Edit, Save, Trash2, Target, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  subscription?: {
    plan_id: string;
    status: string;
  };
  account_status: 'active' | 'suspended';
}

interface StudentNote {
  id: string;
  student_email: string;
  content: string;
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

  useEffect(() => {
    loadStudentData();
  }, [student.email]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load quiz results with quiz details
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          quiz_details:quiz_templates(
            title,
            description,
            quiz_type,
            question_count,
            duration_minutes
          )
        `)
        .eq('student_email', student.email)
        .order('date', { ascending: false });

      if (resultsError) throw resultsError;

      // Load subscription history
      const { data: history, error: historyError } = await supabase
        .from('subscription_changes')
        .select('*')
        .eq('customer_email', student.email)
        .order('date', { ascending: false });

      if (historyError) throw historyError;

      // Load instructor notes
      const { data: studentNotes, error: notesError } = await supabase
        .from('instructor_comments')
        .select('*')
        .eq('student_email', student.email)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      setQuizResults(results || []);
      setSubscriptionHistory(history || []);
      setNotes(studentNotes || []);
    } catch (error) {
      console.error('Error loading student data:', error);
      setError('Errore durante il caricamento dei dati dello studente');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    try {
      if (!newNote.trim()) return;

      const { error: insertError } = await supabase
        .from('instructor_comments')
        .insert([{
          student_email: student.email,
          content: newNote.trim()
        }]);

      if (insertError) throw insertError;

      await loadStudentData();
      setNewNote('');
    } catch (error) {
      console.error('Error adding note:', error);
      setError('Errore durante il salvataggio della nota');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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

  // Prepare chart data
  const chartData = {
    labels: quizResults.map(r => new Date(r.date).toLocaleDateString('it-IT')),
    datasets: [{
      label: 'Punteggio Quiz',
      data: quizResults.map(r => r.score * 100),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
    }]
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

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {student.first_name} {student.last_name}
            </h2>
            <p className="text-gray-600">{student.email}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            student.account_status === 'active'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {student.account_status === 'active' ? 'Attivo' : 'Sospeso'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold">Piano Attuale</h3>
            </div>
            <p className="text-lg font-medium">
              {student.subscription?.plan_id || 'Nessun piano'}
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold">Quiz Completati</h3>
            </div>
            <p className="text-lg font-medium">{totalQuizzes}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <h3 className="font-semibold">Quiz Superati</h3>
            </div>
            <p className="text-lg font-medium">{passedQuizzes}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold">Ultimo Accesso</h3>
            </div>
            <p className="text-lg font-medium">
              {formatDate(student.last_login)}
            </p>
          </div>
        </div>
      </div>

      {/* Quiz History */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-salte-950 dark:text-slate-100 mb-4">Cronologia Quiz</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium">Media Punteggi</h4>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {(averageScore * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h4 className="font-medium">Tasso di Successo</h4>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {totalQuizzes > 0 ? ((passedQuizzes / totalQuizzes) * 100).toFixed(1) : 0}%
              </p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium">Tempo Medio</h4>
              </div>
              <p className="text-2xl font-bold text-purple-600">
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
                      callback: value => `${value}%`
                    }
                  }
                }
              }}
            />
          </div>

          <div className="space-y-4">
            {quizResults.map((result) => (
              <div key={result.id} className="border border-gray-200 rounded-lg">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedQuiz(expandedQuiz === result.id ? null : result.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        result.score >= 0.75 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {result.score >= 0.75 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}