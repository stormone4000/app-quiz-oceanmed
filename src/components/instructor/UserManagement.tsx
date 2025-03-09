import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, Search, Filter, ArrowUpDown, Trash2, AlertCircle, Bell, Eye, XCircle, RefreshCw, Download, FileDown, Clock, CheckCircle2, User as UserIcon, Info, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { DeleteModal } from '../common/DeleteModal';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_instructor: boolean;
  is_master: boolean;
  account_status: 'active' | 'suspended';
  subscription_status: string;
  last_login: string;
  created_at: string;
  access_code_used?: string;
  access_code_type?: 'master' | 'one_time';
  instructor_email?: string;
  instructor_name?: string;
}

// Estendi il tipo SupabaseUser per includere banned_until
interface AdminUser extends SupabaseUser {
  banned_until?: string | null;
}

// Interfaccia per i dettagli dell'utente
interface UserDetails {
  id: string;
  email: string;
  name: string;
  role: string;
  quizzes?: any[];
  students?: any[];
  instructors?: any[];
  access_codes?: any[];
  created_at: string;
  last_login: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [filters, setFilters] = useState({
    role: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof User;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });
  const [userInfo, setUserInfo] = useState<string | null>(null);
  const [showUserDetails, setShowUserDetails] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);

  useEffect(() => {
    // Verifica l'utente corrente
    const checkCurrentUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        console.log("Utente corrente:", data.user);
        setUserInfo(`Utente: ${data.user?.email}, ID: ${data.user?.id}, Ruolo Master: ${data.user?.app_metadata?.is_master}`);
      } catch (error) {
        console.error("Errore nel recupero dell'utente:", error);
      }
    };
    
    checkCurrentUser();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Tentativo di caricare utenti con RPC");
      
      // Verifica l'utente corrente
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Utente corrente:", user);
      
      // Utilizziamo la funzione RPC sicura
      const { data: users, error: usersError } = await supabase
        .rpc('get_all_users');
      console.log("Risultato RPC:", { users, error: usersError });

      if (usersError) {
        console.error('Errore RPC:', usersError);
        throw usersError;
      }
      
      if (!users || users.length === 0) {
        console.log("Nessun utente trovato da RPC, provo con query diretta");
        // Se non ci sono utenti dalla funzione RPC, proviamo a caricarli direttamente
        const { data: directUsers, error: directError } = await supabase
          .from('auth.users')
          .select('*');
          
        console.log("Risultato query diretta:", { directUsers, error: directError });
          
        if (directError) {
          console.error('Errore caricamento diretto:', directError);
          throw directError;
        }
        
        if (directUsers && directUsers.length > 0) {
          // Trasformiamo i dati nel formato atteso
          const formattedUsers = directUsers.map(user => ({
            id: user.id,
            email: user.email,
            first_name: user.raw_user_meta_data?.first_name || '',
            last_name: user.raw_user_meta_data?.last_name || '',
            is_instructor: user.raw_app_meta_data?.is_instructor || false,
            is_master: user.raw_app_meta_data?.is_master || false,
            account_status: user.banned_until ? 'suspended' as const : 'active' as const,
            subscription_status: 'inactive',
            last_login: user.last_sign_in_at || user.created_at,
            created_at: user.created_at
          }));
          
          setUsers(formattedUsers);
        } else {
          console.log("Nessun utente trovato, utilizzo utenti mock");
          // Se non ci sono utenti, utilizziamo dati di esempio
          const mockUsers = [
            {
              id: '1',
              email: 'marcosrenatobruno@gmail.com',
              first_name: 'Marcos',
              last_name: 'Bruno',
              is_instructor: true,
              is_master: true,
              account_status: 'active' as const,
              subscription_status: 'active',
              last_login: new Date().toISOString(),
              created_at: new Date().toISOString()
            },
            {
              id: '2',
              email: 'istruttore1@io.it',
              first_name: 'istruttore1',
              last_name: 'cognome',
              is_instructor: true,
              is_master: false,
              account_status: 'active' as const,
              subscription_status: 'inactive',
              last_login: new Date().toISOString(),
              created_at: new Date().toISOString()
            },
            {
              id: '3',
              email: 'studente1@io.it',
              first_name: 'Studente1',
              last_name: 'cognome',
              is_instructor: false,
              is_master: false,
              account_status: 'active' as const,
              subscription_status: 'inactive',
              last_login: new Date().toISOString(),
              created_at: new Date().toISOString(),
              instructor_email: 'istruttore1@io.it',
              instructor_name: 'istruttore1 cognome',
              access_code_used: '12345'
            },
            {
              id: '4',
              email: 'istruttore2@io.it',
              first_name: 'Istruttore2',
              last_name: 'Istruttore2',
              is_instructor: true,
              is_master: false,
              account_status: 'active' as const,
              subscription_status: 'inactive',
              last_login: new Date().toISOString(),
              created_at: new Date().toISOString()
            }
          ];
          setUsers(mockUsers);
        }
      } else {
        // Arricchiamo i dati degli utenti con informazioni aggiuntive
        const enrichedUsers = [...users];
        
        // Carica i codici di accesso utilizzati
        const { data: accessCodeUsage, error: accessCodeError } = await supabase
          .from('access_code_usage')
          .select(`
            student_email,
            access_codes (
              code,
              type
            )
          `);
          
        if (!accessCodeError && accessCodeUsage) {
          // Crea una mappa per un accesso più veloce
          const accessCodeMap = new Map();
          accessCodeUsage.forEach((usage: any) => {
            if (usage.access_codes) {
              accessCodeMap.set(usage.student_email, {
                code: usage.access_codes.code,
                type: usage.access_codes.type
              });
            }
          });
          
          // Aggiorna gli utenti con i codici di accesso
          enrichedUsers.forEach(user => {
            const accessCode = accessCodeMap.get(user.email);
            if (accessCode) {
              user.access_code_used = accessCode.code;
              user.access_code_type = accessCode.type as 'master' | 'one_time';
            }
          });
        }
        
        // Carica le relazioni studente-istruttore
        const { data: studentInstructorRelations, error: relationsError } = await supabase
          .from('student_instructor')
          .select(`
            student_email,
            instructor_email,
            auth_users!instructor_email (
              first_name,
              last_name
            )
          `);
          
        if (!relationsError && studentInstructorRelations) {
          // Crea una mappa per un accesso più veloce
          const relationsMap = new Map();
          studentInstructorRelations.forEach((relation: any) => {
            if (relation.auth_users) {
              relationsMap.set(relation.student_email, {
                instructor_email: relation.instructor_email,
                instructor_name: `${relation.auth_users.first_name || ''} ${relation.auth_users.last_name || ''}`.trim()
              });
            }
          });
          
          // Aggiorna gli utenti con le relazioni
          enrichedUsers.forEach(user => {
            if (!user.is_instructor && !user.is_master) {
              const relation = relationsMap.get(user.email);
              if (relation) {
                user.instructor_email = relation.instructor_email;
                user.instructor_name = relation.instructor_name;
              }
            }
          });
        }
        
        setUsers(enrichedUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Errore durante il caricamento degli utenti');
      
      // In caso di errore, utilizziamo comunque utenti mock
      console.log("Errore nel caricamento, utilizzo utenti mock");
      const mockUsers = [
        {
          id: '1',
          email: 'marcosrenatobruno@gmail.com',
          first_name: 'Marcos',
          last_name: 'Bruno',
          is_instructor: true,
          is_master: true,
          account_status: 'active' as const,
          subscription_status: 'active',
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          email: 'istruttore1@io.it',
          first_name: 'istruttore1',
          last_name: 'cognome',
          is_instructor: true,
          is_master: false,
          account_status: 'active' as const,
          subscription_status: 'inactive',
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          email: 'studente1@io.it',
          first_name: 'Studente1',
          last_name: 'cognome',
          is_instructor: false,
          is_master: false,
          account_status: 'active' as const,
          subscription_status: 'inactive',
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString(),
          instructor_email: 'istruttore1@io.it',
          instructor_name: 'istruttore1 cognome',
          access_code_used: '12345'
        },
        {
          id: '4',
          email: 'istruttore2@io.it',
          first_name: 'Istruttore2',
          last_name: 'Istruttore2',
          is_instructor: true,
          is_master: false,
          account_status: 'active' as const,
          subscription_status: 'inactive',
          last_login: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ];
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Get user email first
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Utente non trovato');
      }

      // Utilizziamo la funzione RPC sicura
      const { error: deleteError } = await supabase
        .rpc('delete_user', { user_id: userId });

      if (deleteError) throw deleteError;

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId));
      setShowDeleteModal(null);

      // Show success message
      setError('Utente eliminato con successo');
      setTimeout(() => setError(null), 3000);

    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'eliminazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      setLoading(true);
      setError(null);

      // Utilizziamo la funzione RPC sicura
      const { error: updateError } = await supabase
        .rpc('toggle_user_suspension', { 
          user_id: userId,
          suspend: suspend
        });

      if (updateError) throw updateError;

      // Aggiorniamo lo stato locale
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, account_status: suspend ? 'suspended' : 'active' }
          : user
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      setError('Errore durante l\'aggiornamento dello stato dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  // Funzione per caricare i dettagli di un utente specifico
  const loadUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      
      // Trova l'utente nel nostro stato locale
      const user = users.find(u => u.id === userId);
      if (!user) {
        throw new Error('Utente non trovato');
      }
      
      // Inizializza i dettagli dell'utente
      const details: UserDetails = {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`,
        role: user.is_master ? 'Admin' : (user.is_instructor ? 'Istruttore' : 'Studente'),
        created_at: user.created_at,
        last_login: user.last_login,
        quizzes: [],
        students: [],
        instructors: [],
        access_codes: []
      };
      
      // Carica i codici di accesso utilizzati dall'utente
      const { data: accessCodes, error: accessCodesError } = await supabase
        .from('access_code_usage')
        .select(`
          id,
          used_at,
          access_codes (
            id,
            code,
            type,
            expiration_date,
            is_active
          )
        `)
        .eq('student_email', user.email);
        
      if (accessCodesError) {
        console.error('Errore nel caricamento dei codici di accesso:', accessCodesError);
      } else if (accessCodes) {
        details.access_codes = accessCodes;
      }
      
      // Se è uno studente, carica gli istruttori associati
      if (!user.is_instructor) {
        const { data: instructors, error: instructorsError } = await supabase
          .from('student_instructor')
          .select(`
            instructor_email,
            auth_users!instructor_email (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('student_email', user.email);
          
        if (instructorsError) {
          console.error('Errore nel caricamento degli istruttori:', instructorsError);
        } else if (instructors) {
          details.instructors = instructors;
        }
        
        // Carica i quiz completati dallo studente
        const { data: quizzes, error: quizzesError } = await supabase
          .from('results')
          .select(`
            id,
            score,
            date,
            quiz_id,
            quiz_templates (
              id,
              title,
              quiz_type,
              category
            )
          `)
          .eq('student_email', user.email);
          
        if (quizzesError) {
          console.error('Errore nel caricamento dei quiz:', quizzesError);
        } else if (quizzes) {
          details.quizzes = quizzes;
        }
      }
      
      // Se è un istruttore, carica gli studenti associati
      if (user.is_instructor) {
        const { data: students, error: studentsError } = await supabase
          .from('student_instructor')
          .select(`
            student_email,
            auth_users!student_email (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('instructor_email', user.email);
          
        if (studentsError) {
          console.error('Errore nel caricamento degli studenti:', studentsError);
        } else if (students) {
          details.students = students;
        }
        
        // Carica i quiz creati dall'istruttore
        const { data: quizzes, error: quizzesError } = await supabase
          .from('quiz_templates')
          .select('*')
          .eq('created_by', user.id);
          
        if (quizzesError) {
          console.error('Errore nel caricamento dei quiz:', quizzesError);
        } else if (quizzes) {
          details.quizzes = quizzes;
        }
        
        // Carica i codici di accesso creati dall'istruttore
        const { data: createdCodes, error: createdCodesError } = await supabase
          .from('access_codes')
          .select('*')
          .eq('created_by', user.id);
          
        if (createdCodesError) {
          console.error('Errore nel caricamento dei codici creati:', createdCodesError);
        } else if (createdCodes) {
          details.access_codes = [...(details.access_codes || []), ...createdCodes];
        }
      }
      
      setUserDetails(details);
      setShowUserDetails(userId);
      
    } catch (error) {
      console.error('Errore nel caricamento dei dettagli:', error);
      setError('Errore durante il caricamento dei dettagli dell\'utente');
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

  const filteredUsers = users
    .filter(user =>
      (user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (!filters.role || 
        (filters.role === 'instructor' && user.is_instructor && !user.is_master) || 
        (filters.role === 'student' && !user.is_instructor && !user.is_master) ||
        (filters.role === 'admin' && user.is_master)) &&
      (!filters.status || user.account_status === filters.status)
    )
    .sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        return sortConfig.direction === 'asc'
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      }
      
      return 0;
    });

  const handleSort = (key: keyof User) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Funzione per chiudere il modale dei dettagli
  const closeUserDetails = () => {
    setShowUserDetails(null);
    setUserDetails(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white dark:text-slate-100">Gestione Utenti</h2>
        <button 
          onClick={loadUsers}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </button>
      </div>

      {userInfo && (
        <div className="p-4 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 flex-shrink-0" />
            <p>{userInfo}</p>
          </div>
        </div>
      )}

      {error && (
        <div className={`p-4 rounded-lg ${error.includes('successo') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          <div className="flex items-center gap-2">
            {error.includes('successo') ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p>{error}</p>
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
                placeholder="Cerca utenti..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            <div className="flex items-center gap-4">
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
              >
                <option value="">Tutti i ruoli</option>
                <option value="admin">Amministratori</option>
                <option value="instructor">Istruttori</option>
                <option value="student">Studenti</option>
              </select>

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
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('email')}>
                    Utente
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Ruolo</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Stato</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('created_at')}>
                    Registrazione
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('last_login')}>
                    Ultimo Accesso
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Dettagli</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 dark:text-slate-400">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium dark:text-slate-100">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_master
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : user.is_instructor
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {user.is_master ? 'Admin' : user.is_instructor ? 'Istruttore' : 'Studente'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.account_status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {user.account_status === 'active' ? 'Attivo' : 'Sospeso'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                    {formatDate(user.last_login)}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
                    {!user.is_instructor && !user.is_master && user.instructor_name && (
                      <div className="text-xs">
                        <span className="font-medium">Istruttore:</span> {user.instructor_name}
                      </div>
                    )}
                    {!user.is_instructor && !user.is_master && user.access_code_used && (
                      <div className="text-xs mt-1">
                        <span className="font-medium">Codice:</span> {user.access_code_used}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => loadUserDetails(user.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Visualizza Dettagli"
                      >
                        <Info className="w-5 h-5" />
                      </button>
                      
                      <button
                        onClick={() => handleSuspendUser(user.id, user.account_status === 'active')}
                        className={`p-2 ${
                          user.account_status === 'active'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                        } rounded-lg transition-colors`}
                        title={user.account_status === 'active' ? 'Sospendi Account' : 'Riattiva Account'}
                      >
                        {user.account_status === 'active' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        onClick={() => setShowDeleteModal({ id: user.id, name: `${user.first_name} ${user.last_name}` })}
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

      {loading && users.length === 0 && (
        <div className="flex justify-center items-center p-8">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-500 dark:text-slate-400">Caricamento utenti in corso...</p>
          </div>
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="flex justify-center items-center p-8">
          <div className="flex flex-col items-center gap-4">
            <UserIcon className="w-8 h-8 text-gray-400" />
            <p className="text-gray-500 dark:text-slate-400">Nessun utente trovato</p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteModal
          title="Elimina Account Utente"
          message={`Sei sicuro di voler eliminare l'account di ${showDeleteModal.name}? Questa azione non può essere annullata.`}
          onConfirm={() => handleDeleteUser(showDeleteModal.id)}
          onCancel={() => setShowDeleteModal(null)}
          isLoading={loading}
        />
      )}

      {/* User Details Modal */}
      {showUserDetails && userDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Dettagli Utente: {userDetails.name}
              </h3>
              <button
                onClick={closeUserDetails}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Informazioni Generali</h4>
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{userDetails.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Ruolo:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{userDetails.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Registrazione:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(userDetails.created_at)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Ultimo Accesso:</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(userDetails.last_login)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {userDetails.access_codes && userDetails.access_codes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Codici di Accesso</h4>
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <ul className="space-y-2">
                          {userDetails.access_codes.map((codeData: any, index: number) => {
                            const code = codeData.access_codes || codeData;
                            return (
                              <li key={index} className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {code.code} ({code.type === 'master' ? 'Master' : 'One-Time'})
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  code.is_active 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {code.is_active ? 'Attivo' : 'Inattivo'}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {userDetails.role === 'Studente' && userDetails.instructors && userDetails.instructors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Istruttori Associati</h4>
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <ul className="space-y-2">
                          {userDetails.instructors.map((instructor: any, index: number) => (
                            <li key={index} className="text-sm text-gray-900 dark:text-white">
                              {instructor.auth_users?.first_name} {instructor.auth_users?.last_name} ({instructor.auth_users?.email})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {userDetails.role === 'Istruttore' && userDetails.students && userDetails.students.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Studenti Associati</h4>
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <ul className="space-y-2">
                          {userDetails.students.map((student: any, index: number) => (
                            <li key={index} className="text-sm text-gray-900 dark:text-white">
                              {student.auth_users?.first_name} {student.auth_users?.last_name} ({student.auth_users?.email})
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  {userDetails.quizzes && userDetails.quizzes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {userDetails.role === 'Studente' ? 'Quiz Completati' : 'Quiz Creati'}
                      </h4>
                      <div className="mt-2 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                        <ul className="space-y-2">
                          {userDetails.quizzes.map((quiz: any, index: number) => (
                            <li key={index} className="text-sm text-gray-900 dark:text-white">
                              {userDetails.role === 'Studente' ? (
                                <>
                                  {quiz.quiz_templates?.title} - Punteggio: {Math.round(quiz.score * 100)}%
                                </>
                              ) : (
                                <>
                                  {quiz.title} ({quiz.quiz_type})
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}