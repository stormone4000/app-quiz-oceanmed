import React, { useState, useEffect } from 'react';
import { Plus, Key, Calendar, Trash2, AlertCircle, CheckCircle, XCircle, RefreshCw, X, Save } from 'lucide-react';
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
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [form, setForm] = useState<CodeForm>({
    code: '',
    type: 'one_time',
    expiration_date: null,
    duration_months: 1,
    duration_type: 'fixed'
  });

  useEffect(() => {
    loadAccessCodes();
  }, []);

  const loadAccessCodes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prima query: carica tutti i codici di accesso
      const { data: accessCodes, error: codesError } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      
      if (accessCodes && accessCodes.length > 0) {
        // Seconda query: carica gli utilizzi dei codici
        const { data: usageData, error: usageError } = await supabase
          .from('access_code_usage')
          .select('*')
          .in('code_id', accessCodes.map(code => code.id));
          
        if (usageError) {
          console.warn('Errore nel caricamento degli utilizzi dei codici:', usageError);
          // Continuiamo comunque con i codici senza utilizzi
        }
        
        // Associa gli utilizzi ai rispettivi codici
        const codesWithUsage = accessCodes.map(code => ({
          ...code,
          usage: usageData ? usageData.filter(usage => usage.code_id === code.id) : []
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
      
      // Get current instructor email
      const instructorEmail = localStorage.getItem('userEmail');
      if (!instructorEmail) {
        throw new Error('Email dell\'istruttore non trovata');
      }
      
      // Ottieni l'ID dell'utente dalla sua email
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', instructorEmail)
        .single();
        
      if (userError || !userData) {
        console.error('Errore nel recupero dell\'ID utente:', userError);
        throw new Error('Impossibile recuperare l\'ID dell\'utente');
      }
      
      const userId = userData.id;
      console.log('Codice creato dall\'utente con ID:', userId);
      
      // Generate a random 6-digit code if not provided
      const code = form.code || Math.floor(100000 + Math.random() * 900000).toString();
      
      // Calculate expiration date based on duration
      let expirationDate = null;
      if (form.duration_type === 'fixed' && form.duration_months) {
        const expiration = new Date();
        expiration.setMonth(expiration.getMonth() + form.duration_months);
        expirationDate = expiration.toISOString();
      }

      const { error: insertError } = await supabase
        .from('access_codes')
        .insert([{
          code,
          type: form.type,
          expiration_date: form.expiration_date || expirationDate,
          is_active: true,
          duration_months: form.duration_months,
          duration_type: form.duration_type,
          created_by: userId // Utilizzo l'ID utente invece dell'email
        }]);

      if (insertError) throw insertError;

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

  const deactivateCode = async (codeId: string) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('access_codes')
        .update({ is_active: false })
        .eq('id', codeId);

      if (updateError) throw updateError;

      loadAccessCodes();
    } catch (error) {
      console.error('Error deactivating code:', error);
      setError('Errore durante la disattivazione del codice');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white dark:text-slate-100">Gestione Codici di Accesso</h2>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Genera Nuovo Codice
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold dark:text-slate-100">Lista Codici di Accesso</h3>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-2" />
            <p className="text-gray-500 dark:text-slate-400">Caricamento codici...</p>
          </div>
        ) : codes.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 dark:text-slate-400">Nessun codice di accesso trovato.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-800">
            {codes.map(code => (
              <div key={code.id} className="p-6 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        code.type === 'master' 
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                          : code.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-lg dark:text-slate-100">{code.code}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          {code.type === 'master' ? 'Codice Master' : 'Codice Monouso'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-slate-400">
                      <p>Creato il: {formatDate(code.created_at)}</p>
                      <p>Durata: {getDurationText(code.duration_months, code.duration_type)}</p>
                      {code.expiration_date && (
                        <p>Scade il: {formatDate(code.expiration_date)}</p>
                      )}
                      <p className="flex items-center gap-2">
                        Stato: 
                        {code.is_active ? (
                          <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            Attivo
                          </span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Disattivato</span>
                        )}
                      </p>
                    </div>

                    {code.usage && code.usage.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Utilizzi:
                        </p>
                        <div className="space-y-2">
                          {code.usage.map((use, index) => (
                            <div key={index} className="text-sm text-gray-600 dark:text-slate-400">
                              <p>
                                {[use.first_name, use.last_name].filter(Boolean).join(' ') || 'Utente'}
                                {' - '}
                                {use.student_email}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-slate-500">
                                Utilizzato il: {formatDate(use.used_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {code.type !== 'master' && code.is_active && (
                    <button
                      onClick={() => deactivateCode(code.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Disattiva codice"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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