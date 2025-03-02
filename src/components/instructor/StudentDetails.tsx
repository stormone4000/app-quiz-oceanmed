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
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
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
                          <CheckCircle2 className={`w-5 h-5 ${
                            result.score >= 0.75 ? 'text-green-600' : 'text-red-600'
                          }`} />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {result.quiz_details?.title || result.category}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(result.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`font-bold ${
                          result.score >= 0.75 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(result.score * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatTime(result.total_time)}
                        </p>
                      </div>
                      {expandedQuiz === result.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedQuiz === result.id && (
                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="font-medium mb-2">Dettagli Quiz</h5>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-600">Tipo:</span> {result.quiz_details?.quiz_type === 'exam' ? 'Esame' : 'Apprendimento'}</p>
                          <p><span className="text-gray-600">Categoria:</span> {result.category}</p>
                          <p><span className="text-gray-600">Domande:</span> {result.answers.length}</p>
                          <p><span className="text-gray-600">Tempo Limite:</span> {result.quiz_details?.duration_minutes || 'N/A'} minuti</p>
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium mb-2">Statistiche Risposte</h5>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-600">Risposte Corrette:</span> {result.answers.filter(Boolean).length}</p>
                          <p><span className="text-gray-600">Risposte Errate:</span> {result.answers.filter(a => !a).length}</p>
                          <p><span className="text-gray-600">Tempo Medio per Domanda:</span> {formatTime(Math.round(result.total_time / result.answers.length))}</p>
                          <p><span className="text-gray-600">Tempo Totale:</span> {formatTime(result.total_time)}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Tempi per Domanda</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {result.question_times.map((time, index) => (
                          <div key={index} className="p-2 bg-white rounded border border-gray-200">
                            <p className="text-xs text-gray-600">Domanda {index + 1}</p>
                            <p className={`font-medium ${
                              result.answers[index] ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatTime(time)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription History */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Storico Abbonamenti</h3>
        <div className="space-y-4">
          {subscriptionHistory.map((change, index) => (
            <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-full ${
                change.change_type === 'created' ? 'bg-green-100' :
                change.change_type === 'updated' ? 'bg-blue-100' :
                'bg-red-100'
              }`}>
                {change.change_type === 'created' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : change.change_type === 'updated' ? (
                  <Edit className="w-5 h-5 text-blue-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {change.change_type === 'created' ? 'Abbonamento Attivato' :
                       change.change_type === 'updated' ? 'Piano Modificato' :
                       'Abbonamento Cancellato'}
                    </p>
                    {change.old_plan && change.new_plan && (
                      <p className="text-sm text-gray-600">
                        Da {change.old_plan} a {change.new_plan}
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(change.date)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructor Notes */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Note dell'Istruttore</h3>
        
        <div className="mb-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            placeholder="Aggiungi una nota..."
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Aggiungi Nota
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {formatDate(note.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}