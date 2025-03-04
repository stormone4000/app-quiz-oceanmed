import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, Trash2, AlertCircle, Bell, Eye, XCircle, RefreshCw, Download, FileDown, Clock, CheckCircle2, User } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DeleteModal } from '../common/DeleteModal';
import { StudentDetails } from './StudentDetails';

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

// Interfaccia per i dati restituiti dalla query student_instructor
interface StudentInstructorRow {
  student_email: string;
  student: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    last_login: string | null;
    subscriptions: {
      plan_id: string;
      status: string;
    }[];
    account_status: string;
  } | null;
}

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    plan: ''
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Ottieni l'email dell'istruttore corrente dal localStorage
      const instructorEmail = localStorage.getItem('userEmail');
      
      if (!instructorEmail) {
        throw new Error('Email dell\'istruttore non trovata');
      }
      
      console.log('Caricamento studenti per l\'istruttore:', instructorEmail);
      
      // Primo metodo: carica gli studenti dalla tabella student_instructor
      const { data: studentData, error: studentError } = await supabase
        .from('student_instructor')
        .select(`
          student_email,
          student:student_email (
            id,
            email,
            first_name,
            last_name,
            last_login,
            subscriptions (
              plan_id,
              status
            ),
            account_status
          )
        `)
        .eq('instructor_email', instructorEmail);
        
      if (studentError) {
        console.error('Errore nel caricamento degli studenti dalla tabella student_instructor:', studentError);
        throw studentError;
      }
      
      if (studentData && studentData.length > 0) {
        console.log('Studenti trovati nella tabella student_instructor:', studentData.length);
        
        const formattedStudents = (studentData as unknown as StudentInstructorRow[]).map(item => ({
          id: item.student?.id || '',
          email: item.student_email,
          first_name: item.student?.first_name || '',
          last_name: item.student?.last_name || '',
          last_login: item.student?.last_login || '',
          subscription: item.student?.subscriptions?.[0],
          account_status: (item.student?.account_status || 'active') as 'active' | 'suspended'
        }));
        
        setStudents(formattedStudents);
        setLoading(false);
        return;
      }
      
      // Metodo di fallback: utilizzare la relazione tramite access_code_usage
      console.log('Nessuno studente trovato nella tabella student_instructor, tentativo con access_code_usage');
      
      // Carica direttamente gli studenti usando la colonna instructor_email nella tabella access_code_usage
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select(`
          student_email,
          first_name,
          last_name
        `)
        .eq('instructor_email', instructorEmail);
        
      if (usageError) {
        console.error('Errore nel caricamento dell\'utilizzo dei codici:', usageError);
        throw usageError;
      }
      
      if (!usageData || usageData.length === 0) {
        console.log('Nessuno studente ha utilizzato i codici di questo istruttore');
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // Estrai le email degli studenti e rimuovi i duplicati
      const studentEmails = [...new Set(usageData.map(record => record.student_email))];
      console.log('Email degli studenti trovate:', studentEmails);
      
      // Carica i dati degli studenti
      const { data: users, error: usersError } = await supabase
        .from('auth_users')
        .select(`
          *,
          subscriptions (
            plan_id,
            status
          )
        `)
        .in('email', studentEmails)
        .order('last_login', { ascending: false });

      if (usersError) throw usersError;

      const formattedStudents = users.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        last_login: user.last_login || user.created_at,
        subscription: user.subscriptions?.[0],
        account_status: (user.account_status || 'active') as 'active' | 'suspended'
      }));

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error loading students:', error);
      setError('Errore durante il caricamento degli studenti');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get student email first
      const student = students.find(s => s.id === studentId);
      if (!student) {
        throw new Error('Studente non trovato');
      }

      // Delete notifications and read status
      const { error: notifError } = await supabase
        .from('notification_read_status')
        .delete()
        .eq('student_email', student.email);

      if (notifError) {
        console.error('Error deleting notification read status:', notifError);
      }

      // Delete instructor comments
      const { error: commentsError } = await supabase
        .from('instructor_comments')
        .delete()
        .eq('student_email', student.email);

      if (commentsError) {
        console.error('Error deleting instructor comments:', commentsError);
      }

      // Delete quiz assignments
      const { error: assignmentsError } = await supabase
        .from('quiz_assignments')
        .delete()
        .eq('student_email', student.email);

      if (assignmentsError) {
        console.error('Error deleting quiz assignments:', assignmentsError);
      }

      // Delete quiz results
      const { error: resultsError } = await supabase
        .from('results')
        .delete()
        .eq('student_email', student.email);

      if (resultsError) {
        console.error('Error deleting results:', resultsError);
      }

      // Delete subscription changes
      const { error: subChangesError } = await supabase
        .from('subscription_changes')
        .delete()
        .eq('customer_email', student.email);

      if (subChangesError) {
        console.error('Error deleting subscription changes:', subChangesError);
      }

      // Delete subscription
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .delete()
        .eq('customer_email', student.email);

      if (subscriptionError) {
        console.error('Error deleting subscription:', subscriptionError);
      }

      // Delete access code usage
      const { error: accessCodeError } = await supabase
        .from('access_code_usage')
        .delete()
        .eq('student_email', student.email);

      if (accessCodeError) {
        console.error('Error deleting access code usage:', accessCodeError);
      }

      // Finally delete the user
      const { error: deleteError } = await supabase
        .from('auth_users')
        .delete()
        .eq('email', student.email);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setStudents(prev => prev.filter(s => s.id !== studentId));
      setShowDeleteModal(null);

      // Show success message
      setError('Studente eliminato con successo');
      setTimeout(() => setError(null), 3000);

    } catch (error) {
      console.error('Error deleting student:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'eliminazione dello studente');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendStudent = async (studentId: string, suspend: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('auth_users')
        .update({ account_status: suspend ? 'suspended' : 'active' })
        .eq('id', studentId);

      if (updateError) throw updateError;

      setStudents(prev => prev.map(student => 
        student.id === studentId 
          ? { ...student, account_status: suspend ? 'suspended' : 'active' }
          : student
      ));
    } catch (error) {
      console.error('Error updating student status:', error);
      setError('Errore durante l\'aggiornamento dello stato dello studente');
    } finally {
      setLoading(false);
    }
  };

  const handleResetProgress = async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const student = students.find(s => s.id === studentId);
      if (!student) {
        throw new Error('Studente non trovato');
      }

      const { error: resetError } = await supabase
        .from('results')
        .delete()
        .eq('student_email', student.email);

      if (resetError) throw resetError;

      setError('Progressi resettati con successo');
      setTimeout(() => setError(null), 3000);
    } catch (error) {
      console.error('Error resetting student progress:', error);
      setError('Errore durante il reset dei progressi');
    } finally {
      setLoading(false);
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

  const filteredStudents = students.filter(student => {
    const searchMatch = 
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const statusMatch = !filters.status || student.account_status === filters.status;
    const planMatch = !filters.plan || student.subscription?.plan_id.includes(filters.plan);

    return searchMatch && statusMatch && planMatch;
  });

  if (selectedStudent) {
    return (
      <StudentDetails
        student={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white dark:text-slate-100">Gestione Studenti</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cerca studenti..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti gli stati</option>
                <option value="active">Attivo</option>
                <option value="suspended">Sospeso</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Nome Completo</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Stato Account</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Ultimo Accesso</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 dark:text-slate-300">{student.email}</td>
                  <td className="px-6 py-4 dark:text-slate-300">
                    {student.first_name} {student.last_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.account_status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {student.account_status === 'active' ? 'Attivo' : 'Sospeso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                    {formatDate(student.last_login)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Visualizza Dettagli"
                      >
                        <Eye className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => handleSuspendStudent(student.id, student.account_status === 'active')}
                        className={`p-2 ${
                          student.account_status === 'active'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        } rounded-lg transition-colors`}
                        title={student.account_status === 'active' ? 'Sospendi Account' : 'Riattiva Account'}
                      >
                        {student.account_status === 'active' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleResetProgress(student.id)}
                        className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                        title="Reset Progressi"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>

                      <button
                        onClick={() => setShowDeleteModal({ id: student.id, name: `${student.first_name} ${student.last_name}` })}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Elimina Account"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          title="Elimina Account Studente"
          message={`Sei sicuro di voler eliminare l'account di ${showDeleteModal.name}? Questa azione non può essere annullata.`}
          onConfirm={() => handleDeleteStudent(showDeleteModal.id)}
          onCancel={() => setShowDeleteModal(null)}
          isLoading={loading}
        />
      )}
    </div>
  );
}