import React, { useState, useEffect } from 'react';
import { Plus, Key, Calendar, Trash2, AlertCircle, CheckCircle, XCircle, RefreshCw, X, Save, User, Search, RotateCw, Copy } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface AccessCode {
  id: string;
  code: string;
  type: 'master' | 'one_time';
  expiration_date: string | null;
  is_active: boolean;
  created_at: string;
  duration_months: number | null;
  duration_type: 'fixed' | 'unlimited' | null;
  created_by: string | null;
  usage?: {
    student_email: string;
    first_name: string | null;
    last_name: string | null;
    used_at: string;
  }[];
}

interface CodeForm {
  code: string;
  type: 'master' | 'one_time';
  expiration_date: string | null;
  duration_months: number | null;
  duration_type: 'fixed' | 'unlimited';
}

export function AccessCodeManager() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [form, setForm] = useState<CodeForm>({
    code: '',
    type: 'one_time',
    expiration_date: null,
    duration_months: 1,
    duration_type: 'fixed'
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Carica l'ID dell'utente corrente
    const fetchCurrentUserId = async () => {
      const instructorEmail = localStorage.getItem('userEmail');
      if (!instructorEmail) {
        console.error('Email utente non trovata nel localStorage');
        setError('Sessione utente non valida. Effettua nuovamente il login.');
        return;
      }
      
      try {
        // Prima verifichiamo se l'utente esiste nella tabella users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', instructorEmail)
          .single();
          
        if (userData && !userError) {
          console.log('ID utente recuperato dalla tabella users:', userData.id);
          setCurrentUserId(userData.id);
          localStorage.setItem('userId', userData.id);
          return;
        }
        
        // Se non esiste nella tabella users, proviamo con auth_users
        const { data: authData, error: authError } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', instructorEmail)
          .single();
          
        if (authData && !authError) {
          console.log('ID utente recuperato dalla tabella auth_users:', authData.id);
          
          // Verifichiamo se questo ID esiste anche nella tabella users
          const { data: userCheck, error: userCheckError } = await supabase
            .from('users')
            .select('id')
            .eq('id', authData.id)
            .single();
            
          if (userCheck && !userCheckError) {
            console.log('ID utente verificato nella tabella users');
            setCurrentUserId(authData.id);
            localStorage.setItem('userId', authData.id);
          } else {
            console.warn('ID utente non trovato nella tabella users, utilizzo email come fallback');
            setCurrentUserId(instructorEmail);
          }
        } else {
          console.warn('Impossibile recuperare l\'ID utente dal database:', authError);
          console.warn('Utilizzo dell\'email come ID utente:', instructorEmail);
          setCurrentUserId(instructorEmail);
        }
      } catch (err) {
        console.error('Errore durante il recupero dell\'ID utente:', err);
        console.warn('Utilizzo dell\'email come ID utente:', instructorEmail);
        setCurrentUserId(instructorEmail);
      }
    };
    
    fetchCurrentUserId();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      loadAccessCodes();
    }
  }, [currentUserId]);

  const loadAccessCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const instructorEmail = localStorage.getItem('userEmail');
      const isMaster = localStorage.getItem('isMaster') === 'true';
      
      if (!currentUserId && !instructorEmail) {
        throw new Error('Sessione utente non valida. Effettua nuovamente il login.');
      }

      // Verifichiamo se l'ID utente è un UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserId || '');
      
      let query = supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (isUUID) {
        // Se è un UUID valido, verifichiamo che esista nella tabella users
        const { data: userExists, error: userCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', currentUserId)
          .single();
          
        if (userExists && !userCheckError) {
          console.log('Caricamento codici di accesso per UUID:', currentUserId);
          query = query.eq('created_by', currentUserId);
        } else {
          // Se l'UUID non esiste nella tabella users, cerchiamo per email
          console.warn('ID utente non trovato nella tabella users, cerco per email');
          // Cerchiamo i codici creati dall'utente con questa email o senza created_by
          // Nota: questo potrebbe non funzionare se la colonna created_by accetta solo UUID
          // In questo caso, potremmo dover cercare tutti i codici e filtrarli lato client
          query = query.or('created_by.is.null');
        }
      } else if (currentUserId) {
        // Se non è un UUID ma abbiamo un valore (probabilmente un'email), cerchiamo solo i codici senza created_by
        console.log('Caricamento codici senza created_by (currentUserId non è UUID)');
        query = query.is('created_by', null);
      } else {
        // Fallback: cerchiamo solo i codici senza created_by
        console.log('Caricamento codici senza created_by (fallback)');
        query = query.is('created_by', null);
      }
      
      const { data: accessCodes, error: codesError } = await query;
        
      if (codesError) {
        console.error('Errore nel recupero dei codici di accesso:', codesError);
        throw new Error(`Errore nel recupero dei codici di accesso: ${codesError.message}`);
      }
      
      // Carica tutti i codici se la query precedente fallisce
      if (!accessCodes || accessCodes.length === 0) {
        console.log('Nessun codice trovato con la query specifica, carico tutti i codici');
        const { data: allCodes, error: allCodesError } = await supabase
          .from('access_codes')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (allCodesError) {
          console.error('Errore nel recupero di tutti i codici di accesso:', allCodesError);
          throw new Error(`Errore nel recupero di tutti i codici di accesso: ${allCodesError.message}`);
        }
        
        // Filtriamo i codici lato client
        let filteredCodes = allCodes ? allCodes.filter(code => 
          !code.created_by || // Codici senza created_by
          code.created_by === instructorEmail || // Codici creati con l'email
          code.created_by === currentUserId // Codici creati con l'ID corrente
        ) : [];
        
        // Nascondi il codice master 55555 se l'utente non è un amministratore
        if (!isMaster) {
          filteredCodes = filteredCodes.filter(code => code.code !== '55555');
        }
        
        if (filteredCodes.length > 0) {
          console.log(`Trovati ${filteredCodes.length} codici dopo il filtraggio lato client`);
          
          // Recupera gli utilizzi dei codici
          if (filteredCodes.length > 0) {
            const { data: usageData, error: usageError } = await supabase
              .from('access_code_usage')
              .select(`
                id,
                code_id,
                student_email,
                used_at,
                students:student_email (
                  first_name,
                  last_name
                )
              `)
              .in('code_id', filteredCodes.map(code => code.id));
              
            if (usageError) {
              console.warn('Errore nel recupero degli utilizzi dei codici:', usageError);
              // Continuiamo comunque, mostrando i codici senza informazioni di utilizzo
            }
            
            // Associa gli utilizzi ai rispettivi codici
            const codesWithUsage = filteredCodes.map(code => ({
              ...code,
              usage: usageData ? usageData.filter(usage => usage.code_id === code.id) : []
            }));
            
            setCodes(codesWithUsage);
          } else {
            setCodes([]);
          }
          
          setLoading(false);
          return;
        }
      }
      
      if (accessCodes && accessCodes.length > 0) {
        console.log(`Trovati ${accessCodes.length} codici di accesso`);
        
        // Nascondi il codice master 55555 se l'utente non è un amministratore
        let filteredAccessCodes = accessCodes;
        if (!isMaster) {
          filteredAccessCodes = accessCodes.filter(code => code.code !== '55555');
        }
        
        // Recupera gli utilizzi dei codici
        const { data: usageData, error: usageError } = await supabase
          .from('access_code_usage')
          .select(`
            id,
            code_id,
            student_email,
            first_name,
            last_name,
            used_at
          `)
          .in('code_id', filteredAccessCodes.map(code => code.id));
          
        if (usageError) {
          console.warn('Errore nel recupero degli utilizzi dei codici:', usageError);
          // Continuiamo comunque, mostrando i codici senza informazioni di utilizzo
        }
        
        // Associa gli utilizzi ai rispettivi codici
        const codesWithUsage = filteredAccessCodes.map(code => ({
          ...code,
          usage: usageData ? usageData.filter(usage => usage.code_id === code.id).map(usage => ({
            student_email: usage.student_email,
            first_name: usage.first_name,
            last_name: usage.last_name,
            used_at: usage.used_at
          })) : []
        }));
        
        setCodes(codesWithUsage);
      } else {
        setCodes([]);
      }
    } catch (error) {
      console.error('Error loading access codes:', error);
      setError('Errore durante il caricamento dei codici di accesso');
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      setError(null);
      
      const instructorEmail = localStorage.getItem('userEmail');
      if (!currentUserId && !instructorEmail) {
        throw new Error('Sessione utente non valida. Effettua nuovamente il login.');
      }
      
      // Generate a random 6-digit code if not provided
      let code = form.code;
      if (!code) {
        // Genera un codice casuale a 6 cifre
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Aggiungi il prefisso "QUIZ-" per differenziare i codici per gli studenti
        code = `QUIZ-${randomCode}`;
      }
      
      // Calculate expiration date based on duration
      let expirationDate = null;
      if (form.duration_type === 'fixed' && form.duration_months) {
        const expiration = new Date();
        expiration.setMonth(expiration.getMonth() + form.duration_months);
        expirationDate = expiration.toISOString();
      }

      // Verifichiamo se l'ID utente è un UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserId || '');
      
      // Prepariamo i dati per l'inserimento
      const codeData = {
        code,
        type: form.type,
        expiration_date: form.expiration_date || expirationDate,
        is_active: true,
        duration_months: form.duration_months,
        duration_type: form.duration_type
      };
      
      // Se è un UUID valido, verifichiamo che esista nella tabella users
      if (isUUID) {
        const { data: userExists, error: userCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', currentUserId)
          .single();
          
        if (userExists && !userCheckError) {
          console.log('Creazione codice di accesso con UUID:', currentUserId);
          // Aggiungiamo il created_by solo se è un UUID valido e esiste nella tabella users
          Object.assign(codeData, { created_by: currentUserId });
        } else {
          console.warn('ID utente non trovato nella tabella users, non imposto created_by');
          // Non impostiamo created_by, lasciandolo NULL
        }
      } else {
        console.warn('ID utente non è un UUID valido, non imposto created_by');
        // Non impostiamo created_by, lasciandolo NULL
      }

      console.log('Creazione codice di accesso con i seguenti dati:', codeData);

      const { data, error: insertError } = await supabase
        .from('access_codes')
        .insert([codeData])
        .select();

      if (insertError) {
        console.error('Errore durante la creazione del codice di accesso:', insertError);
        throw new Error(`Errore durante la creazione del codice: ${insertError.message}`);
      }

      console.log('Codice di accesso creato con successo:', data);

      setShowGenerateModal(false);
      setForm({
        code: '',
        type: 'one_time',
        expiration_date: null,
        duration_months: 1,
        duration_type: 'fixed'
      });
      loadAccessCodes();
    } catch (error) {
      console.error('Error generating access code:', error);
      setError('Errore durante la generazione del codice');
    }
  };

  const reactivateCode = async (codeId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Aggiorna lo stato del codice
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: true })
        .eq('id', codeId);
        
      if (error) {
        throw error;
      }
      
      // Aggiorna la lista dei codici
      loadAccessCodes();
      
      setSuccess('Codice riattivato con successo');
    } catch (error) {
      console.error('Error reactivating code:', error);
      setError('Errore durante la riattivazione del codice');
    } finally {
      setLoading(false);
    }
  };

  const deactivateCode = async (codeId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Aggiorna lo stato del codice
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: false })
        .eq('id', codeId);
        
      if (error) {
        throw error;
      }
      
      // Aggiorna la lista dei codici
      loadAccessCodes();
      
      setSuccess('Codice disattivato con successo');
    } catch (error) {
      console.error('Error deactivating code:', error);
      setError('Errore durante la disattivazione del codice');
    } finally {
      setLoading(false);
    }
  };

  const deleteCode = async (codeId: string) => {
    try {
      if (!confirm('Sei sicuro di voler eliminare definitivamente questo codice? Questa azione non può essere annullata.')) {
        return;
      }
      
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Elimina il codice
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', codeId);
        
      if (error) {
        throw error;
      }
      
      // Aggiorna la lista dei codici
      loadAccessCodes();
      
      setSuccess('Codice eliminato con successo');
    } catch (error) {
      console.error('Error deleting code:', error);
      setError('Errore durante l\'eliminazione del codice');
    } finally {
      setLoading(false);
    }
  };
  
  const syncActivationData = async (codeId: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Recupera i dati del codice
      const { data: codeData, error: codeError } = await supabase
        .from('access_codes')
        .select('*')
        .eq('id', codeId)
        .single();
        
      if (codeError) {
        throw codeError;
      }
      
      if (!codeData) {
        throw new Error('Codice non trovato');
      }
      
      // Recupera i dati di utilizzo
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select('*')
        .eq('code_id', codeId);
        
      if (usageError) {
        throw usageError;
      }
      
      if (!usageData || usageData.length === 0) {
        setSuccess('Nessun dato di utilizzo trovato per questo codice');
        return;
      }
      
      // Aggiorna la lista dei codici
      loadAccessCodes();
      
      setSuccess(`Dati di attivazione sincronizzati con successo per il codice ${codeData.code}`);
    } catch (error) {
      console.error('Error syncing activation data:', error);
      setError('Errore durante la sincronizzazione dei dati di attivazione');
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

  const getDurationText = (months: number | null, type: string | null) => {
    if (type === 'unlimited') return 'Illimitato';
    if (!months) return 'Non specificato';
    if (months === 1) return '1 mese';
    if (months === 12) return '1 anno';
    return `${months} mesi`;
  };

  // Aggiungo la funzione per copiare il codice negli appunti
  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Codice ${code} copiato negli appunti!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestione Codici di Accesso</h1>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Genera Nuovo Codice
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Errore</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md flex items-start gap-3">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Operazione completata</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-slate-600 dark:text-slate-400">Caricamento codici in corso...</p>
        </div>
      ) : codes.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <Key className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">Nessun codice trovato</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Non hai ancora generato codici di accesso.</p>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="w-5 h-5" />
            Genera il tuo primo codice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {codes.map((code) => (
            <div 
              key={code.id} 
              className={`bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 mb-4 transition-all duration-300 ${
                expandedCode === code.id ? 'border-l-4 border-blue-500' : ''
              }`}
            >
              <div 
                className="flex justify-between items-start cursor-pointer"
                onClick={() => setExpandedCode(expandedCode === code.id ? null : code.id)}
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Key className={`w-5 h-5 ${code.is_active ? 'text-green-500' : 'text-red-500'}`} />
                    <h3 className="text-lg font-semibold">{code.code}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyCodeToClipboard(code.code);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Copia negli appunti"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      code.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                      'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {code.is_active ? 'Attivo' : 'Disattivato'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Tipo: <span className="font-medium">{code.type === 'master' ? 'Master' : 'Monouso'}</span>
                  </p>
                  {code.expiration_date && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Scadenza: <span className="font-medium">{formatDate(code.expiration_date)}</span>
                    </p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Creato il: <span className="font-medium">{formatDate(code.created_at)}</span>
                  </p>
                  
                  {/* Mostra un'anteprima degli studenti che hanno utilizzato il codice */}
                  {code.usage && code.usage.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
                      <User className="w-4 h-4" />
                      <span>Utilizzato da {code.usage.length} {code.usage.length === 1 ? 'studente' : 'studenti'}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {!code.is_active && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        reactivateCode(code.id);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Riattiva codice"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deactivateCode(code.id);
                    }}
                    className={`p-2 ${code.is_active 
                      ? 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300' 
                      : 'text-slate-400 cursor-not-allowed'}`}
                    disabled={!code.is_active}
                    title={code.is_active ? "Disattiva codice" : "Codice già disattivato"}
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {/* Contenuto espandibile */}
              {expandedCode === code.id && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="text-sm font-semibold mb-2">Dettagli codice:</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    ID: <span className="font-mono text-xs">{code.id}</span>
                  </p>
                  
                  {/* Mostra gli studenti che hanno utilizzato il codice */}
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold mb-2">Utilizzato da:</h4>
                    {code.usage && code.usage.length > 0 ? (
                      <ul className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                        {code.usage.map((usage, index) => (
                          <li key={index} className="text-sm flex items-center gap-2">
                            <User className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">
                              {usage.first_name && usage.last_name 
                                ? `${usage.first_name} ${usage.last_name}` 
                                : usage.student_email}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(usage.used_at)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">
                        Nessuno studente ha ancora utilizzato questo codice
                      </p>
                    )}
                  </div>
                  
                  {/* Pulsanti di azione */}
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        syncActivationData(code.id);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center gap-1"
                    >
                      <RotateCw className="w-4 h-4" />
                      Sincronizza
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteCode(code.id);
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina
                    </button>
                    
                    {!code.is_active ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reactivateCode(code.id);
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium flex items-center gap-1"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Riattiva
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deactivateCode(code.id);
                        }}
                        className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Disattiva
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-xl font-bold dark:text-slate-100">Genera Nuovo Codice</h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Codice (opzionale)
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  placeholder="Lascia vuoto per generare automaticamente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Tipo di Durata
                </label>
                <select
                  value={form.duration_type}
                  onChange={(e) => setForm({ 
                    ...form, 
                    duration_type: e.target.value as 'fixed' | 'unlimited',
                    duration_months: e.target.value === 'unlimited' ? null : form.duration_months
                  })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                >
                  <option value="fixed">Durata Fissa</option>
                  <option value="unlimited">Illimitato</option>
                </select>
              </div>

              {form.duration_type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Durata (mesi)
                  </label>
                  <select
                    value={form.duration_months || 1}
                    onChange={(e) => setForm({ ...form, duration_months: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                  >
                    <option value={1}>1 mese</option>
                    <option value={3}>3 mesi</option>
                    <option value={6}>6 mesi</option>
                    <option value={12}>1 anno</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Data di Scadenza (opzionale)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="date"
                    value={form.expiration_date?.split('T')[0] || ''}
                    onChange={(e) => setForm({
                      ...form,
                      expiration_date: e.target.value ? new Date(e.target.value).toISOString() : null
                    })}
                    className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                  Se non specificata, verrà calcolata in base alla durata
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={generateCode}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Genera Codice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}