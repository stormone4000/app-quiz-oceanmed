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
  auth_users?: {
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
  };
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
  const [fixingRelations, setFixingRelations] = useState(false);
  const [fixStatus, setFixStatus] = useState<string | null>(null);

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
      
      console.log('-----------------------------------------------------------');
      console.log('DEBUG: GESTIONE STUDENTI - INIZIO CARICAMENTO');
      console.log('Caricamento studenti per l\'istruttore:', instructorEmail);
      
      // APPROCCIO SEMPLIFICATO: Raccogliamo prima tutte le email degli studenti associati all'istruttore
      let studentEmails: string[] = [];
      
      // 1. Recuperiamo le email dalla tabella student_instructor
      console.log('Recupero email dalla tabella student_instructor...');
      const { data: relationData, error: relationError } = await supabase
        .from('student_instructor')
        .select('student_email')
        .eq('instructor_email', instructorEmail);
      
      if (relationError) {
        console.error('Errore nel recupero da student_instructor:', relationError);
      } else if (relationData && relationData.length > 0) {
        console.log('Email trovate in student_instructor:', relationData.length, relationData.map(r => r.student_email).join(', '));
        studentEmails = [...studentEmails, ...relationData.map(r => r.student_email)];
      } else {
        console.log('Nessuna relazione trovata in student_instructor');
      }
      
      // 2. Recuperiamo le email dalla tabella access_code_usage
      console.log('Recupero email dalla tabella access_code_usage...');
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select('student_email')
        .eq('instructor_email', instructorEmail);
      
      if (usageError) {
        console.error('Errore nel recupero da access_code_usage:', usageError);
      } else if (usageData && usageData.length > 0) {
        console.log('Email trovate in access_code_usage:', usageData.length, usageData.map(u => u.student_email).join(', '));
        studentEmails = [...studentEmails, ...usageData.map(u => u.student_email)];
      } else {
        console.log('Nessuna email trovata in access_code_usage');
      }
      
      // 3. Recuperiamo le email degli studenti che hanno utilizzato codici creati dall'istruttore
      console.log('Recupero codici creati dall\'istruttore...');
      
      // Prima recuperiamo l'ID dell'utente dalla sua email
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', instructorEmail)
        .single();
      
      if (userError) {
        console.error('Errore nel recupero dell\'ID dell\'istruttore:', userError);
      } else if (userData && userData.id) {
        console.log('ID istruttore trovato:', userData.id);
        
        // Ora usiamo l'ID per cercare i codici
        const { data: codesData, error: codesError } = await supabase
          .from('access_codes')
          .select('id, code')
          .eq('created_by', userData.id);
        
        if (codesError) {
          console.error('Errore nel recupero dei codici:', codesError);
        } else if (codesData && codesData.length > 0) {
          console.log('Codici trovati:', codesData.length, codesData.map(c => c.code).join(', '));
          
          const codeIds = codesData.map(code => code.id);
          const { data: codeUsageData, error: codeUsageError } = await supabase
            .from('access_code_usage')
            .select('student_email')
            .in('code_id', codeIds);
          
          if (codeUsageError) {
            console.error('Errore nel recupero degli utilizzi dei codici:', codeUsageError);
          } else if (codeUsageData && codeUsageData.length > 0) {
            console.log('Email trovate tramite utilizzi codici:', codeUsageData.length, codeUsageData.map(u => u.student_email).join(', '));
            studentEmails = [...studentEmails, ...codeUsageData.map(u => u.student_email)];
            
            // Aggiorniamo i record per includere l'email dell'istruttore
            console.log('Aggiornamento dei record esistenti per impostare instructor_email...');
            for (const usage of codeUsageData) {
              // Aggiorna access_code_usage
              const { error: updateError } = await supabase
                .from('access_code_usage')
                .update({ instructor_email: instructorEmail })
                .eq('student_email', usage.student_email)
                .is('instructor_email', null);
              
              if (updateError) {
                console.warn('Errore nell\'aggiornamento dell\'instructor_email:', updateError);
              } else {
                console.log('Record access_code_usage aggiornato per:', usage.student_email);
              }
              
              // Inserisci in student_instructor
              const { error: insertError } = await supabase
                .from('student_instructor')
                .upsert({
                  student_email: usage.student_email,
                  instructor_email: instructorEmail
                });
              
              if (insertError) {
                console.warn('Errore nell\'inserimento in student_instructor:', insertError);
              } else {
                console.log('Record student_instructor creato/aggiornato per:', usage.student_email);
              }
            }
          } else {
            console.log('Nessun utilizzo codice trovato per i codici dell\'istruttore');
          }
        } else {
          console.log('Nessun codice trovato creato dall\'istruttore');
        }
      } else {
        console.log('ID istruttore non trovato per:', instructorEmail);
      }
      
      // 4. Recuperiamo anche gli studenti dai risultati dei quiz creati dall'istruttore
      if (userData && userData.id) {
        console.log('Recupero quiz creati dall\'istruttore...');
        const { data: quizData, error: quizError } = await supabase
          .from('quiz_templates')
          .select('id')
          .eq('created_by', userData.id);
        
        if (quizError) {
          console.error('Errore nel recupero dei quiz:', quizError);
        } else if (quizData && quizData.length > 0) {
          console.log('Quiz trovati:', quizData.length);
          
          const quizIds = quizData.map(quiz => quiz.id);
          const { data: resultsData, error: resultsError } = await supabase
            .from('results')
            .select('student_email')
            .in('quiz_id', quizIds);
          
          if (resultsError) {
            console.error('Errore nel recupero dei risultati dei quiz:', resultsError);
          } else if (resultsData && resultsData.length > 0) {
            console.log('Email trovate tramite risultati quiz:', resultsData.length);
            studentEmails = [...studentEmails, ...resultsData.map(r => r.student_email)];
          }
        }
      }
      
      // Rimuoviamo i duplicati e l'email dell'istruttore stesso
      studentEmails = [...new Set(studentEmails)].filter(email => email !== instructorEmail);
      
      console.log('Totale email uniche trovate:', studentEmails.length, studentEmails.join(', '));
      
      // APPROCCIO ALTERNATIVO: Se non abbiamo trovato studenti, proviamo con una query JOIN diretta
      if (studentEmails.length === 0) {
        console.log('Nessuno studente trovato con metodo standard, provo con approccio alternativo...');
        
        // Recuperiamo prima le email degli studenti dalla tabella student_instructor
        const { data: siData, error: siError } = await supabase
          .from('student_instructor')
          .select('student_email')
          .eq('instructor_email', instructorEmail);
        
        if (siError) {
          console.error('Errore nel recupero da student_instructor:', siError);
        } else if (siData && siData.length > 0) {
          console.log('Email trovate in student_instructor:', siData.length);
          
          // Recuperiamo i dettagli degli studenti dalla tabella auth_users
          const studentEmails = siData.map(item => item.student_email);
          const { data: userData, error: userError } = await supabase
            .from('auth_users')
            .select(`
              id,
              email,
              first_name,
              last_name,
              last_login,
              account_status
            `)
            .in('email', studentEmails);
          
          if (userError) {
            console.error('Errore nel recupero dei dettagli degli studenti:', userError);
          } else if (userData && userData.length > 0) {
            console.log('Dettagli studenti trovati:', userData.length);
            
            // Formattazione dei dati degli studenti
            const formattedStudents = userData.map(user => ({
              id: user.id,
              email: user.email,
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              last_login: user.last_login || '',
              account_status: (user.account_status || 'active') as 'active' | 'suspended'
            }));
            
            setStudents(formattedStudents);
            setLoading(false);
            return;
          }
        }
      }
      
      if (studentEmails.length === 0) {
        console.log('Nessuno studente trovato, provo un ultimo approccio con access_codes...');
        
        // Recuperiamo prima l'ID dell'istruttore
        const { data: instructorData, error: instructorError } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', instructorEmail)
          .single();
        
        if (instructorError) {
          console.error('Errore nel recupero dell\'ID dell\'istruttore:', instructorError);
        } else if (instructorData && instructorData.id) {
          console.log('ID istruttore trovato:', instructorData.id);
          
          // Recuperiamo i codici creati dall'istruttore
          const { data: codesData, error: codesError } = await supabase
            .from('access_codes')
            .select('id, code')
            .eq('created_by', instructorData.id);
          
          if (codesError) {
            console.error('Errore nel recupero dei codici:', codesError);
          } else if (codesData && codesData.length > 0) {
            console.log('Codici trovati:', codesData.length, codesData.map(c => c.code).join(', '));
            
            // Recuperiamo gli utilizzi di questi codici
            const codeIds = codesData.map(code => code.id);
            const { data: usageData, error: usageError } = await supabase
              .from('access_code_usage')
              .select('student_email, first_name, last_name, used_at')
              .in('code_id', codeIds);
            
            if (usageError) {
              console.error('Errore nel recupero degli utilizzi dei codici:', usageError);
            } else if (usageData && usageData.length > 0) {
              console.log('Utilizzi trovati:', usageData.length);
              
              // Creiamo oggetti Student dai dati di utilizzo
              const usageStudents = usageData.map(usage => ({
                id: usage.student_email, // Usiamo l'email come ID temporaneo
                email: usage.student_email,
                first_name: usage.first_name || '',
                last_name: usage.last_name || '',
                last_login: usage.used_at || '',
                account_status: 'active' as const
              }));
              
              // Aggiorniamo anche le relazioni
              for (const usage of usageData) {
                // Aggiorna access_code_usage
                const { error: updateError } = await supabase
                  .from('access_code_usage')
                  .update({ instructor_email: instructorEmail })
                  .eq('student_email', usage.student_email)
                  .is('instructor_email', null);
                
                if (updateError) {
                  console.warn('Errore nell\'aggiornamento dell\'instructor_email:', updateError);
                }
                
                // Inserisci in student_instructor
                const { error: insertError } = await supabase
                  .from('student_instructor')
                  .upsert({
                    student_email: usage.student_email,
                    instructor_email: instructorEmail
                  });
                
                if (insertError) {
                  console.warn('Errore nell\'inserimento in student_instructor:', insertError);
                }
              }
              
              setStudents(usageStudents);
              setLoading(false);
              return;
            }
          }
        }
        
        console.log('Nessuno studente trovato con nessun metodo');
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // Recuperiamo i dettagli completi degli studenti
      console.log('Recupero informazioni complete degli studenti:', studentEmails.length);
      const { data: studentsData, error: studentsError } = await supabase
        .from('auth_users')
        .select(`
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
        `)
        .in('email', studentEmails);

      if (studentsError) {
        console.error('Errore nel recupero dei dettagli degli studenti:', studentsError);
        setError('Errore nel recupero degli studenti. Riprova più tardi.');
        setLoading(false);
        return;
      }

      console.log('Studenti trovati dopo query auth_users:', studentsData?.length || 0);
      
      // Formattazione dei dati degli studenti
      const formattedStudents = (studentsData || []).map(student => {
        const subscription = student.subscriptions && student.subscriptions.length > 0 ? student.subscriptions[0] : null;
        
        return {
          id: student.id,
          email: student.email,
          first_name: student.first_name || '',
          last_name: student.last_name || '',
          last_login: student.last_login || '',
          subscription: subscription ? {
            plan_id: subscription.plan_id,
            status: subscription.status
          } : undefined,
          account_status: (student.account_status || 'active') as 'active' | 'suspended'
        };
      });

      console.log('Studenti formattati:', formattedStudents.length, formattedStudents.map(s => s.email).join(', '));
      setStudents(formattedStudents);
      
      console.log('DEBUG: GESTIONE STUDENTI - FINE CARICAMENTO');
      console.log('-----------------------------------------------------------');
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

  const fixStudentRelations = async () => {
    try {
      setFixingRelations(true);
      setFixStatus('Analisi relazioni in corso...');
      
      // Ottieni l'email dell'istruttore corrente dal localStorage
      const instructorEmail = localStorage.getItem('userEmail');
      
      if (!instructorEmail) {
        throw new Error('Email dell\'istruttore non trovata');
      }
      
      // STEP 1: Recupera gli utilizzi dei codici di accesso creati dall'istruttore
      setFixStatus('Recupero codici creati dall\'istruttore...');
      
      // Recupera l'ID dell'istruttore
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', instructorEmail)
        .single();
      
      if (userError) {
        throw new Error('Errore nel recupero dell\'ID dell\'istruttore');
      }
      
      // Recupera i codici creati dall'istruttore
      const { data: codesData, error: codesError } = await supabase
        .from('access_codes')
        .select('id, code')
        .eq('created_by', userData.id);
      
      if (codesError) {
        throw new Error('Errore nel recupero dei codici di accesso');
      }
      
      if (!codesData || codesData.length === 0) {
        setFixStatus('Nessun codice trovato creato dall\'istruttore');
        return;
      }
      
      setFixStatus(`Trovati ${codesData.length} codici. Recupero utilizzi...`);
      
      // Recupera gli utilizzi dei codici
      const codeIds = codesData.map(code => code.id);
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select('student_email')
        .in('code_id', codeIds);
      
      if (usageError) {
        throw new Error('Errore nel recupero degli utilizzi dei codici');
      }
      
      if (!usageData || usageData.length === 0) {
        setFixStatus('Nessun utilizzo trovato per i codici dell\'istruttore');
        return;
      }
      
      // Estrai le email degli studenti
      const studentEmails = [...new Set(usageData.map(usage => usage.student_email))];
      
      setFixStatus(`Trovati ${studentEmails.length} studenti. Aggiornamento relazioni...`);
      
      // STEP 2: Aggiorna i record in access_code_usage e student_instructor
      let updatedCount = 0;
      let createdCount = 0;
      
      for (const studentEmail of studentEmails) {
        // Aggiorna access_code_usage
        const { error: updateError } = await supabase
          .from('access_code_usage')
          .update({ instructor_email: instructorEmail })
          .eq('student_email', studentEmail)
          .is('instructor_email', null);
        
        if (!updateError) {
          updatedCount++;
        }
        
        // Verifica se esiste già una relazione in student_instructor
        const { data: existingRelation, error: relationError } = await supabase
          .from('student_instructor')
          .select('*')
          .eq('student_email', studentEmail)
          .eq('instructor_email', instructorEmail);
        
        if (!relationError && (!existingRelation || existingRelation.length === 0)) {
          // Crea la relazione se non esiste
          const { error: insertError } = await supabase
            .from('student_instructor')
            .insert([{
              student_email: studentEmail,
              instructor_email: instructorEmail,
              created_at: new Date().toISOString()
            }]);
          
          if (!insertError) {
            createdCount++;
          }
        }
      }
      
      setFixStatus(`Relazioni sistemate: ${updatedCount} record aggiornati, ${createdCount} relazioni create`);
      
      // STEP 3: Ricarica gli studenti
      await loadStudents();
      
    } catch (error) {
      console.error('Error fixing student relations:', error);
      setFixStatus(`Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`);
    } finally {
      setTimeout(() => {
        setFixingRelations(false);
        setFixStatus(null);
      }, 5000);
    }
  };

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
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestione Studenti</h2>
        <button
          onClick={loadStudents}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative dark:bg-red-900/30 dark:border-red-800 dark:text-red-400" role="alert">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

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

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredStudents.length > 0 ? (
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
                      {student.first_name || student.last_name ? 
                        `${student.first_name} ${student.last_name}` : 
                        <span className="text-gray-400 dark:text-gray-500 italic">Nome non disponibile</span>
                      }
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
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Visualizza dettagli"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleSuspendStudent(student.id, student.account_status === 'active')}
                          className={`${
                            student.account_status === 'active'
                              ? 'text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300'
                              : 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300'
                          }`}
                          title={student.account_status === 'active' ? 'Sospendi account' : 'Riattiva account'}
                        >
                          {student.account_status === 'active' ? (
                            <XCircle className="w-5 h-5" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleResetProgress(student.id)}
                          className="text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300"
                          title="Reimposta progressi"
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal({ id: student.id, name: `${student.first_name} ${student.last_name}` })}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Elimina studente"
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
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nessuno studente trovato</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Non sono stati trovati studenti associati al tuo account. Gli studenti appariranno qui quando utilizzeranno i tuoi codici quiz o di accesso.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={loadStudents}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Riprova
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedStudent && (
        <StudentDetails
          student={selectedStudent}
          onBack={() => setSelectedStudent(null)}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          title="Elimina studente"
          message={`Sei sicuro di voler eliminare lo studente ${showDeleteModal.name}? Questa azione non può essere annullata e rimuoverà tutti i dati associati a questo studente.`}
          onConfirm={() => {
            handleDeleteStudent(showDeleteModal.id);
            setShowDeleteModal(null);
          }}
          onCancel={() => setShowDeleteModal(null)}
          isLoading={loading}
        />
      )}

      {/* Fix button */}
      {students.length === 0 && !loading && (
        <div className="mb-4">
          <button
            onClick={fixStudentRelations}
            disabled={fixingRelations}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
          >
            {fixingRelations ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sistema in corso...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sistema Relazioni Studenti
              </>
            )}
          </button>
          {fixStatus && (
            <p className="mt-2 text-sm text-blue-600">{fixStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}