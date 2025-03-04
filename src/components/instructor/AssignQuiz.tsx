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
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Assegna Quiz</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-grow overflow-auto">
          <div className="mb-6">
            <h3 className="font-medium mb-2">{quiz.title}</h3>
            <p className="text-sm text-gray-600">{quiz.description}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Quiz assegnato con successo!</span>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2">Seleziona Studenti</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cerca studenti per nome o email"
                  />
                </div>
                <button
                  onClick={selectAll}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 
                    ? 'Deseleziona Tutti' 
                    : 'Seleziona Tutti'}
                </button>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {loadingStudents ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-gray-500">Caricamento studenti...</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500 mb-2">Nessuno studente trovato</p>
                    <p className="text-sm text-gray-500">
                      Gli studenti verranno associati al tuo account quando utilizzeranno 
                      un codice di accesso da te creato.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Seleziona
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map((student) => (
                          <tr 
                            key={student.email}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleStudent(student.email)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedStudents.includes(student.email)}
                                onChange={() => {}}
                                className="h-5 w-5 text-blue-600 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {student.first_name || student.last_name 
                                ? `${student.first_name || ''} ${student.last_name || ''}`
                                : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                              {student.email}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              <div className="mt-2 text-sm text-gray-500">
                {selectedStudents.length > 0 
                  ? `${selectedStudents.length} studenti selezionati` 
                  : 'Nessuno studente selezionato'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Inizio *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scadenza *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleAssign}
            disabled={loading || selectedStudents.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
            Assegna Quiz
          </button>
        </div>
      </div>
    </div>
  );
}