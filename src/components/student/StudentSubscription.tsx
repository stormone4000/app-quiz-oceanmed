import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle2, XCircle, ExternalLink, RefreshCw, Key } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { PLAN_NAMES } from '../../config/stripe';

interface StudentSubscriptionProps {
  studentEmail: string;
}

export function StudentSubscription({ studentEmail }: StudentSubscriptionProps) {
  const [accessCode, setAccessCode] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAccessCode();
  }, [studentEmail]);

  const loadAccessCode = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the most recent access code usage for this student
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select(`
          code:access_codes (
            id,
            code,
            expiration_date,
            is_active,
            duration_months,
            duration_type
          )
        `)
        .eq('student_email', studentEmail)
        .order('used_at', { ascending: false })
        .limit(1)
        .single();

      if (usageError && usageError.code !== 'PGRST116') throw usageError;
      if (usageData?.code) setAccessCode(usageData.code);

    } catch (error) {
      console.error('Error loading access code:', error);
      setError('Errore durante il caricamento delle informazioni di accesso');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDurationText = (months: number | null, type: string | null) => {
    if (type === 'unlimited') return 'Illimitato';
    if (!months) return 'Non specificato';
    if (months === 1) return '1 mese';
    if (months === 12) return '1 anno';
    return `${months} mesi`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Caricamento informazioni di accesso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="text-red-600 flex items-center gap-2 justify-center">
          <XCircle className="w-6 h-6" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!accessCode) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">Nessun Accesso Attivo</h3>
          <p className="text-gray-600 mb-6">
            Non hai un codice di accesso attivo al momento.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = accessCode.expiration_date && new Date(accessCode.expiration_date) < new Date();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Key className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold dark:text-slate-100">Codice di Accesso</h3>
            <p className="text-gray-600 dark:text-slate-400">{accessCode.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Stato</h4>
            <div className="flex items-center gap-2">
              {accessCode.is_active && !isExpired ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-700">Attivo</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-700">Non Attivo</span>
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Durata</h4>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span>{getDurationText(accessCode.duration_months, accessCode.duration_type)}</span>
            </div>
          </div>

          {accessCode.expiration_date && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">Scadenza</h4>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>{formatDate(accessCode.expiration_date)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}