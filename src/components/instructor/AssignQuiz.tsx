import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Send, UserPlus, Filter, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AssignQuizProps {
  quiz: {
    id: string;
    title: string;
    description: string;
  };
  onClose: () => void;
  onAssignSuccess?: () => void;
}

interface Student {
  email: string;
  first_name: string | null;
  last_name: string | null;
  last_access?: string | null;
}

// Definizione delle interfacce per le query Supabase
interface StudentInstructorRow {
  student_email: string;
  student: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    last_login: string | null;
  };
}

interface AccessCodeUsageRow {
  student_email: string;
  first_name: string | null;
  last_name: string | null;
}

export function AssignQuiz({ quiz, onClose, onAssignSuccess }: AssignQuizProps) {
  const [studentEmails, setStudentEmails] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [instructorEmail, setInstructorEmail] = useState<string | null>(null);

  useEffect(() => {
    // Imposta data inizio e scadenza predefinite
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    setStartDate(today.toISOString().split('T')[0]);
    setDeadline(nextWeek.toISOString().split('T')[0]);
    
    // Recupera email dell'istruttore
    const email = localStorage.getItem('userEmail');
    if (email) {
      setInstructorEmail(email);
      loadStudents(email);
    }
  }, []);

  const loadStudents = async (email: string) => {
    try {
      setLoadingStudents(true);
      
      // Carica gli studenti associati all'istruttore corrente
      const { data: studentData, error: studentError } = await supabase
        .from('student_instructor')
        .select(`
          student_email,
          student:student_email (
            email,
            first_name,
            last_name,
            last_login
          )
        `)
        .eq('instructor_email', email);
      
      if (studentError) throw studentError;
      
      if (studentData && studentData.length > 0) {
        // Converto prima in unknown e poi nel tipo desiderato per evitare errori di tipo
        const formattedStudents = (studentData as unknown as StudentInstructorRow[]).map(item => ({
          email: item.student_email,
          first_name: item.student?.first_name || null,
          last_name: item.student?.last_name || null,
          last_access: item.student?.last_login || null
        }));
        
        setStudents(formattedStudents);
      } else {
        // Se non ci sono relazioni nella tabella student_instructor, prova a caricare
        // dalla tabella access_code_usage
        const { data: usageData, error: usageError } = await supabase
          .from('access_code_usage')
          .select(`
            student_email,
            first_name,
            last_name
          `)
          .eq('instructor_email', email);
          
        if (usageError) throw usageError;
        
        if (usageData && usageData.length > 0) {
          // Converto prima in unknown e poi nel tipo desiderato per evitare errori di tipo
          const formattedStudents = (usageData as unknown as AccessCodeUsageRow[]).map(item => ({
            email: item.student_email,
            first_name: item.first_name,
            last_name: item.last_name
          }));
          
          // Rimuovi duplicati
          const uniqueStudents = Array.from(
            new Map(formattedStudents.map(s => [s.email, s])).values()
          );
          
          setStudents(uniqueStudents);
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento degli studenti:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (email: string) => {
    if (selectedStudents.includes(email)) {
      setSelectedStudents(selectedStudents.filter(e => e !== email));
    } else {
      setSelectedStudents([...selectedStudents, email]);
    }
  };

  const selectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.email));
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return student.email.toLowerCase().includes(search) || fullName.includes(search);
  });

  const handleAssign = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      
      if (selectedStudents.length === 0) {
        setError('Seleziona almeno uno studente');
        setLoading(false);
        return;
      }

      if (!startDate || !deadline) {
        setError('Compila tutti i campi obbligatori');
        setLoading(false);
        return;
      }

      const assignments = selectedStudents.map(email => ({
        quiz_id: quiz.id,
        student_email: email,
        start_date: new Date(startDate).toISOString(),
        deadline: new Date(deadline).toISOString(),
        deadline_type: 'fixed',
        status: 'pending',
        instructions: 'Completa il quiz entro la scadenza indicata.',
        attempt_limit: 1,
        instructor_email: instructorEmail // Aggiungiamo l'email dell'istruttore come riferimento
      }));

      const { error: insertError } = await supabase
        .from('quiz_assignments')
        .insert(assignments);

      if (insertError) throw insertError;

      setSuccess(true);
      
      // Dopo 1 secondo, chiudi il modale
      setTimeout(() => {
        if (onAssignSuccess) {
          onAssignSuccess();
        }
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error assigning quiz:', error);
      setError('Errore durante l\'assegnazione del quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Assegna Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-grow overflow-auto">
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-slate-900 dark:text-white">{quiz.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.description}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Quiz assegnato con successo!</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 text-slate-900 dark:text-white">Seleziona Studenti</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cerca per nome o email"
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={selectAll}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  {selectedStudents.length === filteredStudents.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                {loadingStudents ? (
                  <div className="flex items-center justify-center p-4">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                    <span className="text-gray-600 dark:text-gray-400">Caricamento studenti...</span>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {students.length === 0 ? 'Nessuno studente trovato' : 'Nessun risultato per la ricerca'}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2"></th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nome</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ultimo accesso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredStudents.map((student) => (
                        <tr 
                          key={student.email}
                          onClick={() => toggleStudent(student.email)}
                          className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 ${
                            selectedStudents.includes(student.email) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.email)}
                              onChange={() => toggleStudent(student.email)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-700 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {student.first_name && student.last_name 
                              ? `${student.first_name} ${student.last_name}`
                              : 'Nome non disponibile'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {student.email}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {student.last_access 
                              ? new Date(student.last_access).toLocaleDateString('it-IT')
                              : 'Mai'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Inizio *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scadenza *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Annulla
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || selectedStudents.length === 0}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 ${
              loading || selectedStudents.length === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Assegnazione...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Assegna Quiz
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}