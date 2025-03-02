import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface PaymentMethodsProps {
  customerEmail: string;
}

export function PaymentMethods({ customerEmail }: PaymentMethodsProps) {
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentMethods();
  }, [customerEmail]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the auth user
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('id')
        .eq('email', customerEmail)
        .single();

      if (userError) throw userError;

      if (!userData?.id) {
        throw new Error('User not found');
      }

      // Then get customer data with payment methods
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select(`
          stripe_customer_id,
          customer_payment_methods (
            id,
            stripe_payment_method_id,
            card_brand,
            card_last4,
            card_exp_month,
            card_exp_year,
            is_default
          )
        `)
        .eq('id', userData.id)
        .single();

      if (customerError) throw customerError;

      setPaymentMethods(customer?.customer_payment_methods || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setError('Errore durante il caricamento dei metodi di pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('customer_payment_methods')
        .update({ is_default: false })
        .eq('customer_id', customerEmail);

      if (updateError) throw updateError;

      const { error: setDefaultError } = await supabase
        .from('customer_payment_methods')
        .update({ is_default: true })
        .eq('id', methodId);

      if (setDefaultError) throw setDefaultError;

      await loadPaymentMethods();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      setError('Errore durante l\'impostazione del metodo di pagamento predefinito');
    }
  };

  const handleDelete = async (methodId: string) => {
    try {
      setError(null);

      const { error: deleteError } = await supabase
        .from('customer_payment_methods')
        .delete()
        .eq('id', methodId);

      if (deleteError) throw deleteError;

      await loadPaymentMethods();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      setError('Errore durante l\'eliminazione del metodo di pagamento');
    }
  };

  const formatExpiryDate = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const getCardIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Caricamento metodi di pagamento...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold">Metodi di Pagamento</h2>
            </div>
            <button
              onClick={() => window.location.href = '/customer-portal'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Gestisci Pagamenti
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {paymentMethods.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Nessun metodo di pagamento salvato</p>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div key={method.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">
                      {getCardIcon(method.card_brand)}
                    </div>
                    <div>
                      <p className="font-medium">
                        {method.card_brand.charAt(0).toUpperCase() + method.card_brand.slice(1)} •••• {method.card_last4}
                      </p>
                      <p className="text-sm text-gray-600">
                        Scade: {formatExpiryDate(method.card_exp_month, method.card_exp_year)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {method.is_default && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        Predefinita
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}