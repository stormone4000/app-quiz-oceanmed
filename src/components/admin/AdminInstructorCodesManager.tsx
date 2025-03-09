import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { PlusIcon, CheckCircle, AlertCircle, Copy, Calendar, User, RefreshCw, Trash2, XCircle } from 'lucide-react';

export const AdminInstructorCodesManager = () => {
  const [instructorEmail, setInstructorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activationCodes, setActivationCodes] = useState<any[]>([]);
  const [expirationDays, setExpirationDays] = useState(30);

  useEffect(() => {
    fetchActivationCodes();
  }, []);

  const fetchActivationCodes = async () => {
    try {
      setLoadingCodes(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('instructor_activation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Dati codici PRO recuperati:', data);
      
      const activatedCodes = data?.filter(code => code.used_at);
      console.log('Codici attivati:', activatedCodes);

      const sortedCodes = (data || []).sort((a, b) => {
        if (a.used_at && !b.used_at) return -1;
        if (!a.used_at && b.used_at) return 1;
        
        if (a.used_at && b.used_at) {
          return new Date(b.used_at).getTime() - new Date(a.used_at).getTime();
        }
        
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setActivationCodes(sortedCodes);
    } catch (error) {
      console.error('Errore nel recupero dei codici:', error);
      setError('Errore nel caricamento dei codici di attivazione');
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleGenerateProCode = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
      if (!isMasterAdmin) {
        throw new Error('Solo gli amministratori possono generare codici PRO');
      }

      if (!instructorEmail || !instructorEmail.includes('@')) {
        setError('Inserisci un\'email valida per l\'istruttore');
        return;
      }

      const userId = localStorage.getItem('userId');
      
      const userIdentifier = userId || localStorage.getItem('userEmail');
      
      if (!userIdentifier) {
        throw new Error('Impossibile identificare l\'utente corrente');
      }
      
      console.log('Utilizzo identificativo utente:', userIdentifier);

      const randomPart = Math.floor(100000 + Math.random() * 900000).toString();
      const proCode = `PRO-${randomPart}`;

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + expirationDays);

      const { data, error } = await supabase
        .from('instructor_activation_codes')
        .insert([{
          code: proCode,
          assigned_to_email: instructorEmail,
          is_active: true,
          created_at: new Date().toISOString(),
          expiration_date: expirationDate.toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setGeneratedCode(proCode);
      setSuccess('Codice PRO generato con successo!');
      fetchActivationCodes();
      setInstructorEmail('');

    } catch (error: any) {
      console.error('Errore nella generazione del codice PRO:', error);
      setError(error.message || 'Si è verificato un errore durante la generazione del codice');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setSuccess(`Codice ${code} copiato negli appunti!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeactivateCode = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('instructor_activation_codes')
        .update({ is_active: false })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('Codice disattivato con successo');
      fetchActivationCodes();
    } catch (error) {
      setError('Errore durante la disattivazione del codice');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateCode = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('instructor_activation_codes')
        .update({ is_active: true })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('Codice attivato con successo');
      fetchActivationCodes();
    } catch (error) {
      setError('Errore durante l\'attivazione del codice');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    try {
      if (!confirm('Sei sicuro di voler eliminare definitivamente questo codice? Questa azione non può essere annullata.')) {
        return;
      }
      
      setLoading(true);
      
      const { error } = await supabase
        .from('instructor_activation_codes')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccess('Codice eliminato con successo');
      fetchActivationCodes();
    } catch (error) {
      setError('Errore durante l\'eliminazione del codice');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckActivationStatus = async (code: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess('Verifica dello stato di attivazione in corso...');
      
      // Verifichiamo lo stato del codice nel database
      const { data, error } = await supabase
        .from('instructor_activation_codes')
        .select('*')
        .eq('code', code)
        .single();
        
      if (error) {
        throw error;
      }
      
      if (!data) {
        setError(`Codice ${code} non trovato nel database`);
        return;
      }
      
      console.log('Stato attuale del codice:', data);
      
      if (data.used_at) {
        setSuccess(`Il codice ${code} è stato attivato il ${formatDate(data.used_at)} da ${data.used_by || data.assigned_to_email}`);
      } else {
        setSuccess(`Il codice ${code} non è ancora stato attivato`);
      }
      
      // Aggiorniamo la lista dei codici
      fetchActivationCodes();
    } catch (error) {
      console.error('Errore durante la verifica dello stato di attivazione:', error);
      setError('Errore durante la verifica dello stato di attivazione');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncActivationData = async (code: string, email: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess('Sincronizzazione dei dati di attivazione in corso...');
      
      // Prima cerchiamo l'ID utente nel database
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', email)
        .single();
        
      if (userError) {
        console.warn('Errore nel recupero dell\'ID utente:', userError);
        // Continuiamo comunque, useremo l'email come identificativo
      }
      
      const userId = userData?.id || null;
      const now = new Date().toISOString();
      
      console.log(`Sincronizzazione codice ${code} per l'utente ${email} (ID: ${userId || 'non trovato'})`);
      
      // Aggiorniamo il record del codice PRO con i dati di attivazione
      const { error: updateError } = await supabase
        .from('instructor_activation_codes')
        .update({
          used_at: now,
          used_by: userId || email
        })
        .eq('code', code);
        
      if (updateError) {
        throw updateError;
      }
      
      // Se abbiamo trovato l'ID utente, aggiorniamo anche lo stato dell'account
      if (userId) {
        const { error: userUpdateError } = await supabase
          .from('auth_users')
          .update({
            account_status: 'active'
          })
          .eq('id', userId);
          
        if (userUpdateError) {
          console.warn('Errore nell\'aggiornamento dello stato dell\'account:', userUpdateError);
        }
      }
      
      setSuccess(`Dati di attivazione sincronizzati con successo per il codice ${code}`);
      
      // Aggiorniamo la lista dei codici
      fetchActivationCodes();
    } catch (error) {
      console.error('Errore durante la sincronizzazione dei dati di attivazione:', error);
      setError('Errore durante la sincronizzazione dei dati di attivazione');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      <div className="p-6 bg-slate-800/20 backdrop-blur-lg border border-white/30 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Genera Codice PRO per Attivazione Istruttore</h2>
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email Istruttore
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="email"
                value={instructorEmail}
                onChange={(e) => setInstructorEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 text-white placeholder-gray-400"
                placeholder="email@esempio.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Validità (giorni)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="number"
                min="1"
                max="365"
                value={expirationDays}
                onChange={(e) => setExpirationDays(parseInt(e.target.value))}
                className="w-full pl-12 pr-4 py-2 rounded-lg border border-white/30 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/10 text-white placeholder-gray-400"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Il codice sarà valido per questo numero di giorni
            </p>
          </div>

          <button
            onClick={handleGenerateProCode}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Generazione in corso...
              </>
            ) : (
              <>
                <PlusIcon className="w-5 h-5" />
                Genera Codice PRO
              </>
            )}
          </button>
        </div>

        {generatedCode && (
          <div className="mt-4">
            <p className="text-sm text-slate-300 mb-1">Codice di attivazione generato:</p>
            <div className="p-3 bg-purple-900/30 border border-purple-500/30 rounded-lg text-center flex items-center justify-between">
              <span className="text-xl font-mono text-white">{generatedCode}</span>
              <button
                onClick={() => handleCopyCode(generatedCode)}
                className="p-2 text-purple-300 hover:text-white"
                title="Copia negli appunti"
              >
                <Copy className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Invia questo codice all'istruttore per attivare il suo profilo. Il codice scadrà tra {expirationDays} giorni.
            </p>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-800/20 backdrop-blur-lg border border-white/30 rounded-xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Codici PRO Generati</h2>
          <button
            onClick={fetchActivationCodes}
            disabled={loadingCodes}
            className="p-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 hover:text-white rounded-lg flex items-center gap-2"
            title="Aggiorna lista codici"
          >
            <RefreshCw className={`w-5 h-5 ${loadingCodes ? 'animate-spin' : ''}`} />
            Aggiorna
          </button>
        </div>

        {loadingCodes ? (
          <div className="py-8 flex justify-center">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
          </div>
        ) : activationCodes.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Nessun codice PRO generato</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {activationCodes.map((code) => (
              <div 
                key={code.id} 
                className={`p-4 rounded-lg border ${
                  code.is_active 
                    ? code.used_at 
                      ? 'bg-blue-900/20 border-blue-500/30' 
                      : 'bg-slate-800/40 border-white/10' 
                    : 'bg-slate-900/40 border-white/5 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg text-white">{code.code}</span>
                      <button
                        onClick={() => handleCopyCode(code.code)}
                        className="p-1 text-blue-300 hover:text-white"
                        title="Copia negli appunti"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCheckActivationStatus(code.code)}
                        className="p-1 text-blue-300 hover:text-white"
                        title="Verifica stato attivazione"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      Assegnato a: <span className="text-slate-300">{code.assigned_to_email}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      !code.is_active 
                        ? 'bg-red-900/30 text-red-400 border border-red-700/30'
                        : code.used_at
                          ? 'bg-blue-900/30 text-blue-400 border border-blue-700/30'
                          : 'bg-green-900/30 text-green-400 border border-green-700/30'
                    }`}>
                      {!code.is_active 
                        ? 'Disattivato' 
                        : code.used_at 
                          ? 'Attivato' 
                          : 'Attivo'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>
                    <span className="block">Creato il:</span>
                    <span className="text-slate-300">{formatDate(code.created_at)}</span>
                  </div>
                  <div>
                    <span className="block">Scade il:</span>
                    <span className="text-slate-300">{formatDate(code.expiration_date)}</span>
                  </div>
                </div>

                {code.used_at ? (
                  <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <h4 className="text-blue-400 text-sm font-medium mb-1 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Codice attivato
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="block text-slate-400">Data attivazione:</span>
                        <span className="text-blue-300 font-medium">{formatDate(code.used_at)}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Attivato da:</span>
                        <span className="text-blue-300 font-medium">
                          {code.used_by || code.assigned_to_email}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => handleSyncActivationData(code.code, code.assigned_to_email)}
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          title="Forza sincronizzazione dati di attivazione"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Sincronizza
                        </button>
                      {!code.is_active ? (
                        <button
                          onClick={() => handleActivateCode(code.id)}
                          className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                          title="Riattiva codice"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Riattiva
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeactivateCode(code.id)}
                          className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                          title="Disattiva codice"
                        >
                          <XCircle className="w-3 h-3" />
                          Disattiva
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        title="Elimina codice definitivamente"
                      >
                        <Trash2 className="w-3 h-3" />
                        Elimina
                      </button>
                    </div>
                  </div>
                ) : code.is_active ? (
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      In attesa di attivazione
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSyncActivationData(code.code, code.assigned_to_email)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        title="Sincronizza dati di attivazione"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Sincronizza
                      </button>
                      <button
                        onClick={() => handleDeactivateCode(code.id)}
                        className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                        title="Disattiva codice"
                      >
                        <XCircle className="w-3 h-3" />
                        Disattiva
                      </button>
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        title="Elimina codice definitivamente"
                      >
                        <Trash2 className="w-3 h-3" />
                        Elimina
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-xs text-red-400">
                      Codice disattivato
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleActivateCode(code.id)}
                        className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
                        title="Riattiva codice"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Riattiva
                      </button>
                      <button
                        onClick={() => handleDeleteCode(code.id)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        title="Elimina codice definitivamente"
                      >
                        <Trash2 className="w-3 h-3" />
                        Elimina
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 