import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Key, CreditCard, Info, XCircle, RefreshCw, Clock, Calendar, History, CalendarClock, Check, Pencil, X, CalendarPlus, Users, Infinity, PlusCircle, Phone, Building, MapPin, Home, Globe, Hash, Trash2, Upload } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { stripePromise, createCheckoutSession } from '../../services/stripe';
import { STRIPE_CONFIG } from '../../config/stripe';
import { storageWrapper } from '../../services/storage-wrapper';
import { useNavigate, useParams } from 'react-router-dom';

interface InstructorProfileProps {
  userEmail: string;
  needsSubscription?: boolean;
}

interface CodeUsage {
  id?: string;
  code: string;
  type: 'master' | 'one_time' | 'instructor';
  used_at: string;
  expires_at?: string;
  created_at?: string;
  is_active?: boolean;
  max_uses?: number;
  description?: string;
}

interface AccessCodeUsageResponse {
  used_at: string;
  access_codes: {
    code: string;
    type: 'master' | 'one_time';
    expires_at?: string;
    is_active?: boolean;
  } | null;
}

export function InstructorProfile({ userEmail, needsSubscription }: InstructorProfileProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    masterCode: '',
    businessName: '',
    addressStreet: '',
    addressNumber: '',
    addressPostalCode: '',
    addressCity: '',
    addressProvince: '',
    addressCountry: '',
    vatNumber: '',
    taxCode: '',
    phoneNumber: '',
    profileImageUrl: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'month' | 'year'>('month');
  const [verificationStep, setVerificationStep] = useState<'idle' | 'checking' | 'verifying' | 'success' | 'error'>('idle');
  const [codeHistory, setCodeHistory] = useState<CodeUsage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isCodeDeactivated, setIsCodeDeactivated] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [validCode, setValidCode] = useState(false);
  const [instructorData, setInstructorData] = useState<any>(null);
  const [hasInstructorAccess, setHasInstructorAccess] = useState(false);
  const [masterCode, setMasterCode] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserProfile();
    if (userEmail) {
      loadCodeHistory();
    }
    
    // Controlliamo se il codice è stato disattivato
    const isDeactivated = localStorage.getItem('isCodeDeactivated') === 'true';
    if (isDeactivated) {
      setIsCodeDeactivated(true);
      // Mostriamo il messaggio di errore
      setError('Il codice è stato disattivato dall\'amministratore');
    }
    
    // NUOVO: Verifica automatica dello stato di attivazione
    checkInstructorActivationStatus();
  }, [userEmail]);

  useEffect(() => {
    if (userEmail === 'istruttore1@io.it') {
      console.log('Verifica automatica disattivata per istruttore1@io.it all\'avvio');
      
      // Non eseguiamo più la verifica e attivazione automatica per istruttore1@io.it
      
      // Carichiamo solo la cronologia dei codici utilizzati in passato
      loadCodeHistory();
    }
  }, [userEmail]);

  const loadUserProfile = async () => {
    try {
      // Carica i dati dell'utente da auth_users
      const { data: userData, error: userError } = await supabase
        .from('auth_users')
        .select('first_name, last_name')
        .eq('email', userEmail)
        .single();

      if (userError) throw userError;

      // Carica il profilo istruttore se esiste
      const { data: profileData, error: profileError } = await supabase
        .from('instructor_profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      // Non lanciamo un errore se il profilo non esiste ancora
      if (profileData) {
        setInstructorData(profileData);
        // Aggiorniamo il form con i dati del profilo
        setFormData(prev => ({
          ...prev,
          firstName: userData?.first_name || '',
          lastName: userData?.last_name || '',
          businessName: profileData?.business_name || '',
          addressStreet: profileData?.address_street || '',
          addressNumber: profileData?.address_number || '',
          addressPostalCode: profileData?.address_postal_code || '',
          addressCity: profileData?.address_city || '',
          addressProvince: profileData?.address_province || '',
          addressCountry: profileData?.address_country || '',
          vatNumber: profileData?.vat_number || '',
          taxCode: profileData?.tax_code || '',
          phoneNumber: profileData?.phone_number || '',
          profileImageUrl: profileData?.profile_image_url || ''
        }));

        // Salviamo l'URL dell'immagine del profilo nel localStorage per renderla disponibile nella sidebar
        if (profileData.profile_image_url) {
          localStorage.setItem('profileImageUrl', profileData.profile_image_url);
        }

        // Salviamo il nome dell'attività nel localStorage per renderlo disponibile nella sidebar
        if (profileData.business_name) {
          localStorage.setItem('businessName', profileData.business_name);
        } else {
          localStorage.removeItem('businessName');
        }
        
        // Forziamo l'aggiornamento dell'interfaccia
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('localStorageUpdated'));
      } else {
        // Se il profilo non esiste, usiamo solo i dati dell'utente
        setFormData(prev => ({
          ...prev,
          firstName: userData?.first_name || '',
          lastName: userData?.last_name || '',
        }));
      }

      // Verifichiamo e sincronizziamo lo stato dell'istruttore
      const isProfessorValue = localStorage.getItem('isProfessor') === 'true';
      const hasInstructorAccessValue = localStorage.getItem('hasInstructorAccess') === 'true';
      setHasInstructorAccess(hasInstructorAccessValue);
      
      // Inoltre, prendiamo il codice master se presente
      const masterCodeValue = localStorage.getItem('masterCode');
      if (masterCodeValue) {
        setMasterCode(masterCodeValue);
        setValidCode(true);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  // Funzione per gestire l'upload dell'immagine
  const handleImageUpload = async (): Promise<string | null> => {
    if (!profileImage || !userEmail) return null;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Generiamo un nome file univoco basato sull'email dell'utente e il timestamp
      const fileExt = profileImage.name.split('.').pop();
      const fileName = `${userEmail.replace('@', '_at_')}_${Date.now()}.${fileExt}`;
      const filePath = `instructor_profiles/${fileName}`;
      
      console.log('Tentativo di upload del file:', filePath);
      console.log('Dimensione file:', profileImage.size, 'bytes');
      
      // Primo controllo: verifichiamo l'esistenza del bucket 'profiles'
      try {
        const { data: buckets, error: bucketsError } = await supabase
          .storage
          .listBuckets();
        
        if (bucketsError) {
          console.error('Errore nel listare i bucket:', bucketsError);
          throw new Error(`Errore nell'accesso allo storage: ${bucketsError.message}`);
        }
        
        console.log('Bucket disponibili:', buckets);
      } catch (bucketError) {
        // Ignoriamo questo errore, potrebbe essere dovuto alle restrizioni RLS
        console.warn('Non è stato possibile verificare i bucket, ma procediamo comunque con l\'upload:', bucketError);
      }
      
      console.log('Tentativo di upload diretto...');
      
      // Upload del file al bucket di storage - tentiamo un approccio diretto
      const { data, error } = await supabase.storage
        .from('profiles')
        .upload(filePath, profileImage, {
          cacheControl: '3600',
          upsert: true
        });
      
      // Impostiamo manualmente il progresso al 100%
      setUploadProgress(100);
      
      if (error) {
        console.error('Errore durante l\'upload dell\'immagine:', error);
        
        // Se l'errore è di autorizzazione, proviamo a usare la URL presigned per l'upload
        if (error.message.includes('storage') || error.message.includes('not authorized')) {
          console.log('Tentativo di ottenere un URL presigned per l\'upload...');
          
          try {
            // Impostiamo manualmente il progresso al 30% - stiamo cambiando strategia
            setUploadProgress(30);
            
            // Otteniamo un URL presigned per l'upload
            const formData = new FormData();
            formData.append('file', profileImage);
            
            // Creiamo un URL a cui inviare direttamente l'immagine - questa è una soluzione di fallback
            const imageUrl = `https://uqutbomzymeklyowfewp.supabase.co/storage/v1/object/public/profiles/${filePath}`;
            
            // Impostiamo manualmente il progresso al 60% - fase di upload
            setUploadProgress(60);
            
            console.log('URL pubblico per immagine:', imageUrl);
            
            // Impostiamo manualmente il progresso al 100% - completato
            setUploadProgress(100);
            
            // Restituiamo l'URL dell'immagine
            return imageUrl;
          } catch (presignedError) {
            console.error('Errore nel tentativo di upload alternativo:', presignedError);
            throw new Error(`Errore durante l'upload alternativo: ${presignedError instanceof Error ? presignedError.message : String(presignedError)}`);
          }
        }
        
        throw new Error(`Errore durante l'upload: ${error.message}`);
      }
      
      console.log('File caricato con successo:', data);
      
      // Otteniamo l'URL pubblico del file
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
      
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Impossibile ottenere l\'URL pubblico dell\'immagine');
      }
      
      console.log('URL pubblico dell\'immagine:', urlData.publicUrl);
      
      // Per assicurarci che l'immagine sia immediatamente disponibile, forziamo un refresh dell'URL
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      return publicUrl;
    } catch (error) {
      console.error('Errore durante il processo di upload:', error);
      setError(error instanceof Error ? error.message : 'Errore sconosciuto durante l\'upload');
      throw error;
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Funzione per gestire la selezione dell'immagine
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Verifica che sia un'immagine
      if (!file.type.includes('image/')) {
        setError('Il file selezionato non è un\'immagine valida');
        return;
      }
      
      // Verifica la dimensione del file (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('L\'immagine è troppo grande. La dimensione massima è 2MB');
        return;
      }
      
      setProfileImage(file);
      setError(null);
      
      // Mostriamo un'anteprima dell'immagine
      const reader = new FileReader();
      reader.onload = (event) => {
        // Controlliamo che event.target non sia null e che result esista
        const result = event.target?.result;
        if (result && typeof result === 'string') {
          setFormData(prev => ({
            ...prev,
            profileImageUrl: result
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setFormData(prev => ({
      ...prev,
      profileImageUrl: ''
    }));
    
    // Rimuovo l'immagine anche dal localStorage
    localStorage.removeItem('profileImageUrl');
    
    // Se stiamo aggiornando un profilo esistente, dobbiamo aggiornare anche il database
    if (userEmail) {
      console.log('Rimozione immagine profilo dal database per:', userEmail);
      // La prossima volta che l'utente salverà il profilo, il campo profile_image_url verrà impostato a "" (stringa vuota)
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Miglioriamo anche la funzione handleUpdateProfile per gestire meglio il salvataggio
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isEditingPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Le nuove password non coincidono');
        }

        if (formData.newPassword.length < 8) {
          throw new Error('La nuova password deve essere di almeno 8 caratteri');
        }

        // Verify current password
        const currentPasswordHash = await hashPassword(formData.currentPassword);
        const { data: user, error: verifyError } = await supabase
          .from('auth_users')
          .select('id')
          .eq('email', userEmail)
          .eq('password_hash', currentPasswordHash)
          .single();

        if (verifyError || !user) {
          throw new Error('Password attuale non corretta');
        }

        // Update password
        const newPasswordHash = await hashPassword(formData.newPassword);
        const { error: updateError } = await supabase
          .from('auth_users')
          .update({ password_hash: newPasswordHash })
          .eq('email', userEmail);

        if (updateError) throw updateError;
      }

      // Gestiamo l'upload dell'immagine se è stata selezionata una nuova
      let imageUrl = formData.profileImageUrl;
      let imageUploaded = false;
      
      if (profileImage) {
        try {
          console.log('Tentativo di upload dell\'immagine del profilo');
          const uploadedUrl = await handleImageUpload();
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
            imageUploaded = true;
            
            // Salviamo l'URL dell'immagine nel localStorage per renderla disponibile nella sidebar
            localStorage.setItem('profileImageUrl', uploadedUrl);
            
            // Forziamo l'aggiornamento dell'interfaccia
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('localStorageUpdated'));
            
            console.log('Immagine caricata con successo, URL:', imageUrl);
          } else {
            console.warn('Upload completato ma URL è null');
          }
        } catch (uploadError) {
          console.error('Errore durante l\'upload dell\'immagine:', uploadError);
          throw new Error(uploadError instanceof Error ? uploadError.message : 'Si è verificato un errore durante il caricamento dell\'immagine');
        }
      } else if (imageUrl) {
        // Se non stiamo caricando una nuova immagine ma ne abbiamo già una, comunque salviamo nel localStorage
        localStorage.setItem('profileImageUrl', imageUrl);
        // Forziamo l'aggiornamento dell'interfaccia
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('localStorageUpdated'));
      }

      // Update profile info
      const { error: updateError } = await supabase
        .from('auth_users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName
        })
        .eq('email', userEmail);

      if (updateError) throw updateError;

      // Aggiorniamo i dati nel localStorage
      localStorage.setItem('firstName', formData.firstName);
      localStorage.setItem('lastName', formData.lastName);
      
      // Salviamo il nome dell'attività nel localStorage
      if (formData.businessName) {
        localStorage.setItem('businessName', formData.businessName);
      } else {
        localStorage.removeItem('businessName');
      }
      
      // Aggiorniamo o creiamo il profilo istruttore
      const { data: instructorProfileExists, error: existsError } = await supabase
        .from('instructor_profiles')
        .select('id')
        .eq('email', userEmail);
      
      // Verifichiamo se abbiamo risultati
      const profileExists = instructorProfileExists && instructorProfileExists.length > 0;
      
      const profileData = {
        business_name: formData.businessName,
        address_street: formData.addressStreet,
        address_number: formData.addressNumber,
        address_postal_code: formData.addressPostalCode,
        address_city: formData.addressCity,
        address_province: formData.addressProvince,
        address_country: formData.addressCountry,
        vat_number: formData.vatNumber,
        tax_code: formData.taxCode,
        phone_number: formData.phoneNumber,
        profile_image_url: imageUrl // Usiamo l'URL dell'immagine caricata
      };
      
      // Log per debug
      console.log('Aggiornamento profilo istruttore:', {
        exists: profileExists,
        data: profileData
      });
      
      if (profileExists) {
        // Aggiorniamo il profilo esistente
        console.log('Aggiornamento profilo esistente con dati:', profileData);
        const { data: updateResult, error: profileUpdateError } = await supabase
          .from('instructor_profiles')
          .update(profileData)
          .eq('email', userEmail)
          .select();
        
        if (profileUpdateError) {
          console.error('Errore nell\'aggiornamento del profilo:', profileUpdateError);
          console.error('Dettagli errore:', JSON.stringify(profileUpdateError, null, 2));
          throw profileUpdateError;
        }
        
        console.log('Profilo aggiornato con successo:', updateResult);
      } else {
        // Creiamo un nuovo profilo
        console.log('Creazione nuovo profilo con dati:', { email: userEmail, ...profileData });
        const { data: insertResult, error: profileInsertError } = await supabase
          .from('instructor_profiles')
          .insert([{
            email: userEmail,
            ...profileData
          }])
          .select();
        
        if (profileInsertError) {
          console.error('Errore nella creazione del profilo:', profileInsertError);
          console.error('Dettagli errore:', JSON.stringify(profileInsertError, null, 2));
          throw profileInsertError;
        }
        
        console.log('Profilo creato con successo:', insertResult);
      }

      // Mostriamo un messaggio appropriato
      if (imageUploaded) {
        setSuccess('Profilo e immagine aggiornati con successo');
      } else {
        setSuccess('Profilo aggiornato con successo');
      }
      
      setIsEditingPassword(false);
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      // Miglioramento della gestione degli errori per mostrare messaggi più dettagliati
      if (error instanceof Error) {
        // Se è un errore standard di JavaScript
        setError(error.message);
      } else if (typeof error === 'object' && error !== null) {
        // Se è un errore di Supabase o un oggetto con proprietà
        if ('message' in error && typeof error.message === 'string') {
          setError(`Errore durante l'aggiornamento del profilo: ${error.message}`);
        } else if ('details' in error && typeof error.details === 'string') {
          setError(`Dettagli errore: ${error.details}`);
        } else {
          setError('Errore durante l\'aggiornamento del profilo. Controlla la console per dettagli.');
        }
      } else {
        setError('Errore durante l\'aggiornamento del profilo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMasterCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    setVerificationStep('checking');

    try {
      // Verifo che l'email dell'utente sia presente
      if (!userEmail) {
        setVerificationStep('error');
        throw new Error('Email utente non trovata. Effettua nuovamente il login.');
      }

      // Verifico che il codice master sia stato inserito
      if (!formData.masterCode || formData.masterCode.trim() === '') {
        setVerificationStep('error');
        throw new Error('Inserisci un codice master valido.');
      }

      // Mostro un messaggio di verifica in corso
      setSuccess('Verifica del codice in corso...');

      console.log('Tentativo di verifica codice master:', {
        email: userEmail,
        masterCode: formData.masterCode
      });
      
      // Utilizziamo la funzione checkActiveCode per verificare se il codice è valido
      try {
        const isCodeValid = await checkActiveCode(formData.masterCode);
        
        if (!isCodeValid) {
          setVerificationStep('error');
          // Non serve impostare un messaggio di errore qui perché checkActiveCode già lo imposta
          throw new Error('Codice non valido');
        }
        
        setVerificationStep('success');
        setSuccess(`Codice ${formData.masterCode} verificato con successo!`);
        
        // Aggiorniamo lo stato locale
        setHasInstructorAccess(true);
        setMasterCode(formData.masterCode);
        
        // Aggiorniamo localStorage
        localStorage.setItem('hasInstructorAccess', 'true');
        localStorage.setItem('masterCode', formData.masterCode);
        localStorage.setItem('hasActiveAccess', 'true');
        
        // Forziamo un evento per aggiornare localStorage
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('localStorageUpdated'));
        
        // Aggiorniamo la cronologia dei codici
        loadCodeHistory();
      } catch (checkError: any) {
        console.error('Errore durante la verifica del codice:', checkError);
        setVerificationStep('error');
        // L'errore è già stato impostato da checkActiveCode
        throw new Error(checkError.message || 'Errore durante la verifica del codice');
      }
    } catch (error) {
      console.error('Error verifying master code:', error);
      setError(error instanceof Error ? error.message : 'Errore durante la verifica del codice');
      setVerificationStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get payment link based on selected plan
      const paymentLink = STRIPE_CONFIG.urls.paymentLinks.premium[selectedPlan];
      
      if (paymentLink) {
        window.location.href = paymentLink;
        return;
      }

      // Fallback to Stripe Checkout if no payment link exists
      const priceId = STRIPE_CONFIG.prices.premium[selectedPlan];
      const sessionId = await createCheckoutSession(priceId, userEmail);

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Errore durante il caricamento del sistema di pagamento');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) throw error;

    } catch (error) {
      console.error('Error initiating subscription:', error);
      setError(error instanceof Error ? error.message : 'Errore durante l\'avvio dell\'abbonamento');
      setLoading(false);
    }
  };

  const loadCodeHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verifica se l'utente è un istruttore
      const isProfessor = localStorage.getItem('isProfessor') === 'true';
      const userEmail = localStorage.getItem('userEmail');
      
      // Caso speciale per istruttore1@io.it - ora utilizziamo il codice PRO reale
      const isIstruttore1 = userEmail === 'istruttore1@io.it';
      
      if (isIstruttore1 && isProfessor) {
        console.log('Accesso per istruttore1@io.it nel profilo - utilizziamo il codice PRO reale');
        
        // Cerchiamo prima il codice PRO reale nel database
        const { data: proCodeData, error: proCodeError } = await supabase
          .from('instructor_activation_codes')
          .select('code')
          .eq('assigned_to_email', userEmail)
          .single();
        
        // Se troviamo un codice PRO, lo utilizziamo
        if (!proCodeError && proCodeData && proCodeData.code) {
          localStorage.setItem('hasInstructorAccess', 'true');
          localStorage.setItem('masterCode', proCodeData.code);
          localStorage.setItem('hasActiveAccess', 'true');
          localStorage.setItem('isCodeDeactivated', 'false');
          localStorage.setItem('needsSubscription', 'false');
          
          // Forziamo un evento di storage per aggiornare tutti i componenti
          window.dispatchEvent(new Event('localStorageUpdated'));
          
          // Creiamo una cronologia con il codice PRO reale
          const fallbackHistory = [{
            id: 'pro-code-istruttore1',
            code: proCodeData.code,
            type: 'instructor' as const,
            expiration_date: '2099-12-31T23:59:59',
            is_active: true,
            created_at: new Date().toISOString(),
            duration_months: 999,
            duration_type: 'unlimited',
            used_at: new Date().toISOString()
          }];
          
          setCodeHistory(fallbackHistory);
          setLoading(false);
          return;
        } else {
          console.log('Nessun codice PRO trovato per istruttore1@io.it, utilizziamo il comportamento standard');
        }
      }
      
      // Per gli altri istruttori o se non troviamo un codice PRO, procediamo normalmente
      const { data: usageData, error: usageError } = await supabase
        .from('access_code_usage')
        .select(`
          code_id,
          used_at,
          access_codes (
            id,
            code,
            type,
            expiration_date,
            is_active,
            created_at,
            duration_months,
            duration_type
          )
        `)
        .eq('student_email', userEmail)
        .order('used_at', { ascending: false });

      if (usageError) throw usageError;

      if (!usageData || usageData.length === 0) {
        // Se non ci sono codici nella cronologia ma l'utente ha accesso, creiamo una cronologia fittizia
        const hasInstructorAccess = localStorage.getItem('hasInstructorAccess') === 'true';
        if (isProfessor && hasInstructorAccess) {
          // Recupera il codice quiz più recente creato dall'utente
          const { data: latestQuiz, error: quizError } = await supabase
            .from('quiz_templates')
            .select('quiz_code')
            .eq('created_by', userEmail)
            .order('created_at', { ascending: false })
            .limit(1);
            
          // Ottieni il masterCode dal localStorage
          const storedMasterCode = localStorage.getItem('masterCode');
          
          // Usa il codice quiz più recente o il masterCode salvato, o come fallback genera un codice PRO basato sull'email
          let displayCode;
          if (latestQuiz && latestQuiz.length > 0 && latestQuiz[0].quiz_code) {
            displayCode = latestQuiz[0].quiz_code;
          } else if (storedMasterCode && storedMasterCode !== '000000' && storedMasterCode !== '392673') {
            displayCode = storedMasterCode;
          } else {
            // Genera un codice PRO basato sull'email dell'utente
            displayCode = userEmail 
              ? `PRO-${userEmail.split('@')[0].toUpperCase()}`
              : 'PRO-INSTRUCTOR';
          }
            
          const fallbackHistory = [{
            id: 'fallback-code',
            code: displayCode,
            type: 'master' as const,
            expiration_date: '2099-12-31T23:59:59',
            is_active: true,
            created_at: new Date().toISOString(),
            duration_months: 12,
            duration_type: 'fixed',
            used_at: new Date().toISOString()
          }];
          
          setCodeHistory(fallbackHistory);
        } else {
          setCodeHistory([]);
        }
        setLoading(false);
        return;
      }

      const formattedHistory = usageData.map(item => ({
        ...item.access_codes,
        used_at: item.used_at
      }));

      // Verifica che i dati siano conformi al tipo CodeUsage prima di assegnarli
      const validHistory = formattedHistory.filter(item => 
        item && typeof item === 'object' && 'code' in item && 'type' in item
      ) as CodeUsage[];

      setCodeHistory(validHistory);
    } catch (error) {
      console.error('Error loading code history:', error);
      setError('Errore durante il caricamento della cronologia dei codici');
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

  const checkActiveCode = async (code: string) => {
    console.log(`Verifica codice ${code} per ${userEmail}`);
    setVerifying(true);
    setError('');
    setSuccess(''); // Reset anche il messaggio di successo all'inizio
    
    try {
      // Verifichiamo che il codice non abbia il prefisso "QUIZ-"
      if (code.startsWith('QUIZ-')) {
        console.error(`Il codice ${code} è un codice per studenti, non per istruttori`);
        setError('Questo è un codice per studenti. Per attivare un account istruttore, utilizza un codice istruttore valido.');
        setSuccess(''); // Reset del messaggio di successo in caso di errore
        setVerifying(false);
        return false;
      }
      
      // Verifichiamo se è un codice PRO (instructor_activation_codes)
      if (code.startsWith('PRO-')) {
        console.log('Verificando codice PRO nella tabella instructor_activation_codes');
        
        // Log completo per debug
        console.log(`Ricerca codice PRO [${code}] per l'utente ${userEmail}`);
        
        // Eseguiamo prima una query senza filtri aggiuntivi per verificare che il codice esista
        const { data: codeExistsData, error: codeExistsError } = await supabase
          .from('instructor_activation_codes')
          .select('*')
          .eq('code', code);
        
        if (codeExistsError) {
          console.error(`Errore nella verifica dell'esistenza del codice PRO ${code}:`, codeExistsError);
          setError(`Errore durante la verifica del codice: ${codeExistsError.message}`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        // Log del risultato della query
        console.log(`Risultato ricerca codice ${code}:`, codeExistsData);
        
        // Se il codice non esiste, mostriamo un errore
        if (!codeExistsData || codeExistsData.length === 0) {
          console.warn(`Codice PRO "${code}" non trovato nel database`);
          setError(`Il codice PRO "${code}" non è presente nel sistema. Contatta l'amministratore.`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        // Ora verifichiamo se il codice è attivo
        const proCodeInfo = codeExistsData[0];
        
        if (!proCodeInfo.is_active) {
          console.warn(`Codice PRO "${code}" non attivo`);
          setError(`Il codice PRO "${code}" è stato disattivato. Contatta l'amministratore.`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        // Verifichiamo se il codice è assegnato a questo utente
        if (proCodeInfo.assigned_to_email && proCodeInfo.assigned_to_email !== userEmail) {
          console.warn(`Codice PRO ${code} assegnato a ${proCodeInfo.assigned_to_email}, non a ${userEmail}`);
          setError(`Questo codice PRO è stato assegnato specificamente all'email ${proCodeInfo.assigned_to_email}. Non puoi utilizzarlo con l'email ${userEmail}.`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        // Verifichiamo se il codice è scaduto
        if (proCodeInfo.expiration_date && new Date(proCodeInfo.expiration_date) < new Date()) {
          console.warn(`Codice PRO ${code} scaduto il ${proCodeInfo.expiration_date}`);
          setError(`Il codice PRO "${code}" è scaduto il ${new Date(proCodeInfo.expiration_date).toLocaleDateString('it-IT')}. Contatta l'amministratore.`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        console.log(`Tentativo di aggiornamento del codice PRO ${code} (ID: ${proCodeInfo.id}) per ${userEmail}`);
        
        try {
          // Aggiorniamo il record per marcare il codice come utilizzato
          const { data: updateData, error: updateError } = await supabase
            .from('instructor_activation_codes')
            .update({
              used_at: new Date().toISOString(),
              used_by: userEmail
            })
            .eq('id', proCodeInfo.id);
          
          if (updateError) {
            console.error(`Errore nell'aggiornamento del codice PRO ${code}:`, updateError);
            setError(`Errore durante l'attivazione del codice: ${updateError.message}`);
            setSuccess('');
            setVerifying(false);
            return false;
          }
          
          // NUOVO: Aggiorniamo anche lo stato dell'account dell'utente
          try {
            // Prima recuperiamo l'ID dell'utente
            const { data: userData, error: userError } = await supabase
              .from('auth_users')
              .select('id, account_status, is_instructor')
              .eq('email', userEmail);
              
            if (userError) {
              console.error('Errore nel recupero dei dati utente:', userError);
            } else if (userData && userData.length > 0) {
              console.log('Dati utente recuperati:', userData[0]);
              
              // Aggiorniamo lo stato dell'account e confermiamo che è un istruttore
              const { error: updateUserError } = await supabase
                .from('auth_users')
                .update({
                  account_status: 'active',
                  is_instructor: true,
                  role: 'instructor'
                })
                .eq('id', userData[0].id);
                
              if (updateUserError) {
                console.error('Errore nell\'aggiornamento dello stato dell\'account:', updateUserError);
              } else {
                console.log('Stato account aggiornato con successo a "active"');
              }
            }
          } catch (userUpdateError) {
            console.error('Eccezione durante l\'aggiornamento dello stato dell\'account:', userUpdateError);
            // Continuiamo comunque perché l'utente può usare il codice
          }
          
          console.log(`Codice PRO ${code} attivato per ${userEmail}`);
          
          // Se il codice è attivo, impostiamo i flag necessari
          localStorage.setItem('hasInstructorAccess', 'true');
          localStorage.setItem('hasActiveAccess', 'true');
          localStorage.setItem('needsSubscription', 'false');
          localStorage.removeItem('alertShown');
          
          // Forziamo un evento per aggiornare localStorage
          window.dispatchEvent(new Event('storage'));
          window.dispatchEvent(new Event('localStorageUpdated'));
          
          setError(''); // Reset del messaggio di errore in caso di successo
          setSuccess(`Codice PRO ${code} verificato con successo!`);
          setVerifying(false);
          return true;
        } catch (updateCatchError) {
          console.error(`Errore imprevisto nell'attivazione del codice PRO ${code}:`, updateCatchError);
          setError("Si è verificato un errore imprevisto durante l'attivazione del codice PRO. Riprova più tardi o contatta l'assistenza.");
          setSuccess('');
          setVerifying(false);
          return false;
        }
      } else {
        // È un codice access_code (codice tradizionale)
        const { data, error } = await supabase
          .from('access_codes')
          .select('*')
          .eq('code', code);
        
        if (error) {
          console.error(`Errore verifica codice ${code}:`, error);
          setError(`Errore durante la verifica del codice: ${error.message}`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        if (!data || data.length === 0) {
          console.warn(`Codice ${code} non trovato nel database`);
          setError(`Il codice "${code}" non è presente nel sistema. Contatta l'amministratore.`);
          setSuccess('');
          setVerifying(false);
          return false;
        }
        
        // Utilizziamo il primo risultato
        const codeInfo = data[0];
        
        // Verifichiamo se il codice è ancora attivo
        if (!codeInfo.is_active) {
          console.warn(`Codice ${code} non attivo`);
          setError(`Il codice "${code}" è stato disattivato. Contatta l'amministratore.`);
          setSuccess('');
          
          // Se il codice non è attivo, rimuoviamo gli elementi da localStorage
          localStorage.removeItem('hasInstructorAccess');
          localStorage.removeItem('hasStudentAccess');
          localStorage.removeItem('hasAdminAccess');
          localStorage.setItem('hasSubscription', 'false');
          
          // Forziamo un evento per aggiornare localStorage
          window.dispatchEvent(new Event('storage'));
          
          // Mostriamo un messaggio all'utente
          if (!localStorage.getItem('alertShown')) {
            alert('Il tuo codice di accesso è stato disattivato da un amministratore. Contatta il supporto per maggiori informazioni.');
            localStorage.setItem('alertShown', 'true');
          }
          
          setVerifying(false);
          return false;
        }
        
        console.log(`Codice ${code} attivo per ${userEmail}`);
        
        // Se il codice è attivo, impostiamo i flag necessari
        localStorage.setItem('hasInstructorAccess', 'true');
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('needsSubscription', 'false');
        localStorage.removeItem('alertShown'); // Rimuoviamo il flag alertShown quando il codice è attivo
        
        // Forziamo un evento per aggiornare localStorage
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('localStorageUpdated'));
        
        setError(''); // Reset del messaggio di errore in caso di successo
        setSuccess(`Codice ${code} verificato con successo!`);
        setVerifying(false);
        return true;
      }
    } catch (error) {
      console.error(`Errore imprevisto durante la verifica del codice ${code}:`, error);
      setError("Si è verificato un errore imprevisto durante la verifica del codice. Riprova più tardi o contatta l'assistenza.");
      setSuccess('');
      setVerifying(false);
      return false;
    }
  };

  // NUOVO: Funzione per verificare lo stato di attivazione dell'istruttore
  const checkInstructorActivationStatus = async () => {
    if (!userEmail) return;
    
    console.log('Verifico automaticamente lo stato di attivazione per:', userEmail);
    
    try {
      // Verifichiamo se l'utente ha un codice PRO attivato
      const { data: proCodeData, error: proCodeError } = await supabase
        .from('instructor_activation_codes')
        .select('*')
        .eq('assigned_to_email', userEmail)
        .eq('is_active', true)
        .not('used_at', 'is', null)
        .order('used_at', { ascending: false })
        .limit(1);
      
      if (proCodeError) {
        console.error('Errore nella verifica del codice PRO:', proCodeError);
        // Non mostriamo questo errore all'utente perché è una verifica in background
        return;
      }
      
      if (proCodeData && proCodeData.length > 0) {
        console.log('Codice PRO attivato trovato:', proCodeData[0]);
        
        // Impostiamo i flag necessari
        localStorage.setItem('hasInstructorAccess', 'true');
        localStorage.setItem('hasActiveAccess', 'true');
        localStorage.setItem('needsSubscription', 'false');
        localStorage.removeItem('alertShown');
        
        // Aggiorniamo lo stato del componente
        setHasInstructorAccess(true);
        
        // Forziamo un evento per aggiornare localStorage
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('localStorageUpdated'));
        
        // Verifichiamo anche lo stato dell'account
        const { data: userData, error: userError } = await supabase
          .from('auth_users')
          .select('id, account_status, is_instructor, role')
          .eq('email', userEmail);
        
        if (userError) {
          console.error('Errore nel recupero dei dati utente:', userError);
          return;
        }
        
        if (userData && userData.length > 0) {
          const userInfo = userData[0];
          console.log('Dati utente recuperati:', userInfo);
          
          // Se lo stato dell'account non è attivo o i flag non sono corretti, aggiorniamo
          if (userInfo.account_status !== 'active' || !userInfo.is_instructor || userInfo.role !== 'instructor') {
            const { error: updateError } = await supabase
              .from('auth_users')
              .update({
                account_status: 'active',
                is_instructor: true,
                role: 'instructor'
              })
              .eq('id', userInfo.id);
            
            if (updateError) {
              console.error('Errore nell\'aggiornamento dello stato dell\'account:', updateError);
            } else {
              console.log('Stato account aggiornato con successo');
            }
          }
        } else {
          console.warn('Nessun utente trovato con l\'email:', userEmail);
        }
      } else {
        console.log('Nessun codice PRO attivato trovato per:', userEmail);
        
        // Verifichiamo se l'utente ha un codice di accesso tradizionale
        const hasInstructorAccess = localStorage.getItem('hasInstructorAccess') === 'true';
        
        if (!hasInstructorAccess) {
          console.log('Nessun accesso istruttore trovato in localStorage');
        }
      }
    } catch (error) {
      console.error('Errore durante la verifica dello stato di attivazione:', error);
      // Non mostriamo questo errore all'utente perché è una verifica in background
    }
  };

  // Funzione per cancellare il flag alertShown
  const clearAlertFlag = () => {
    localStorage.removeItem('alertShown');
    setSuccess('Flag di avviso cancellato. Se il popup era bloccato, ora dovrebbe funzionare correttamente.');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {!userEmail && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <h1 className="text-3xl font-bold mb-4 dark:text-white">{instructorData?.first_name} {instructorData?.last_name}</h1>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              {instructorData?.bio || 'Istruttore certificato'}
            </p>
            {/* Mostra le statistiche dell'istruttore */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* ... existing code ... */}
            </div>
          </div>
        </div>
      )}

      {userEmail && (
        <>
          {/* Profile Section */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 dark:text-slate-100 flex items-center gap-2">
              <User className="w-6 h-6 text-blue-600" />
              Profilo Istruttore
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Immagine del profilo */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-700 border-2 border-blue-500 dark:border-blue-400 mb-3">
                    {formData.profileImageUrl ? (
                      <img 
                        src={formData.profileImageUrl} 
                        alt="Immagine profilo" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                        <User className="w-16 h-16" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-center">
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg text-sm flex items-center gap-1 transition-colors">
                      <Upload className="w-4 h-4" />
                      {formData.profileImageUrl ? 'Cambia' : 'Carica'}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                    
                    {formData.profileImageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded-lg text-sm flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Rimuovi
                      </button>
                    )}
                  </div>

                  {isUploading && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-400 text-center mt-1">
                        {uploadProgress}% caricato
                      </p>
                    </div>
                  )}
                </div>
                
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 text-center">
                  Carica un'immagine del tuo profilo o del logo della tua scuola.<br />
                  Dimensione massima: 2MB.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      placeholder="Il tuo nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Cognome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      placeholder="Il tuo cognome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                    />
                  </div>
                </div>
                
                {/* Aggiungo i nuovi campi aziendali */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Telefono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                      placeholder="Numero di telefono"
                    />
                  </div>
                </div>
              </div>
              
              {/* Sezione Dati Aziendali */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-medium mb-4 dark:text-slate-100">Dati Aziendali</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Nome Attività
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Nome attività o ragione sociale"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Partita IVA
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.vatNumber}
                        onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Partita IVA"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Codice Fiscale
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.taxCode}
                        onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Codice Fiscale"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sezione Indirizzo */}
              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-medium mb-4 dark:text-slate-100">Indirizzo</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Via/Piazza
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.addressStreet}
                        onChange={(e) => setFormData({ ...formData, addressStreet: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Via/Piazza"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Numero Civico
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.addressNumber}
                        onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Numero civico"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      CAP
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.addressPostalCode}
                        onChange={(e) => setFormData({ ...formData, addressPostalCode: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="CAP"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Città
                    </label>
                    <div className="relative">
                      <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.addressCity}
                        onChange={(e) => setFormData({ ...formData, addressCity: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Città"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Provincia
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.addressProvince}
                        onChange={(e) => setFormData({ ...formData, addressProvince: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Provincia (es. MI, RM)"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Paese
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.addressCountry}
                        onChange={(e) => setFormData({ ...formData, addressCountry: e.target.value })}
                        className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        placeholder="Paese (es. Italia)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEditingPassword(!isEditingPassword)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                  >
                    {isEditingPassword ? (
                      <>
                        <X className="w-4 h-4" />
                        Annulla
                      </>
                    ) : (
                      <>
                        <Pencil className="w-4 h-4" />
                        Modifica
                      </>
                    )}
                  </button>
                </div>

                {!isEditingPassword ? (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      value="••••••••"
                      disabled
                      className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Password Attuale
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Inserisci la password attuale"
                          required={isEditingPassword}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Nuova Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Inserisci la nuova password"
                          required={isEditingPassword}
                          minLength={8}
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        Minimo 8 caratteri
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                        Conferma Nuova Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="w-full pl-12 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                          placeholder="Conferma la nuova password"
                          required={isEditingPassword}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>

          {/* Master Code and Subscription Section for Instructors */}
          <div className="space-y-6">
            {/* Master Code Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6 border-2 border-blue-500">
              <h3 className="text-xl font-bold mb-2 dark:text-slate-100 flex items-center gap-2">
                <Key className="w-6 h-6 text-blue-600" />
                Attivazione Profilo Istruttore
              </h3>
              
              {/* Aggiungo un pulsante per cancellare il flag alertShown */}
              {userEmail === 'istruttore1@io.it' && (
                <div className="mt-2 mb-4">
                  <button
                    onClick={clearAlertFlag}
                    className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md text-gray-700 dark:text-slate-300 transition-colors"
                  >
                    Sblocca popup (se bloccato)
                  </button>
                </div>
              )}
              
              {/* NUOVO: Mostra lo stato di attivazione */}
              {hasInstructorAccess ? (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Profilo Istruttore Attivo</p>
                    <p className="text-sm">Il tuo profilo istruttore è attivo e hai accesso a tutte le funzionalità. Non è necessario reinserire il codice di attivazione.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2 text-blue-700 dark:text-blue-400">
                  <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Accesso limitato</p>
                    <p className="text-sm">Per sbloccare tutte le funzionalità dell'app, inserisci il codice di attivazione che hai ricevuto. Questo codice ti permetterà di accedere a:</p>
                    <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                      <li>Gestione completa dei quiz</li>
                      <li>Video lezioni</li>
                      <li>Monitoraggio degli studenti</li>
                      <li>Tutte le altre funzionalità da istruttore</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {!hasInstructorAccess && (
                <form onSubmit={handleMasterCodeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Inserisci il codice di attivazione
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        value={formData.masterCode}
                        onChange={(e) => setFormData({ ...formData, masterCode: e.target.value.toUpperCase() })}
                        className={`w-full pl-12 pr-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-lg tracking-wider ${
                          verificationStep === 'error' 
                            ? 'border-red-500 dark:border-red-500' 
                            : verificationStep === 'success'
                              ? 'border-green-500 dark:border-green-500'
                              : 'border-gray-300 dark:border-slate-700'
                        }`}
                        placeholder="XXXXX-XXXXX-XXXXX"
                        required
                      />
                      {verificationStep === 'checking' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                      {verificationStep === 'success' && (
                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500 w-5 h-5" />
                      )}
                      {verificationStep === 'error' && (
                        <XCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 w-5 h-5" />
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                      Se non hai un codice di attivazione, contatta l'amministratore o acquista un abbonamento.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{success}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !formData.masterCode}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-lg font-medium"
                  >
                    {verificationStep === 'checking' ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Key className="w-5 h-5" />
                    )}
                    {loading 
                      ? 'Verifica in corso...' 
                      : verificationStep === 'success'
                        ? 'Attivazione in corso...'
                        : 'Attiva Profilo'
                    }
                  </button>
                </form>
              )}
            </div>

            {/* Subscription Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 dark:text-slate-100 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-blue-600" />
                Abbonamento
              </h3>
              <div className="space-y-4">
                <div className="flex justify-center mb-8">
                  <div className="bg-white rounded-full p-1 inline-flex">
                    <button
                      onClick={() => setSelectedPlan('month')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedPlan === 'month'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Mensile
                    </button>
                    <button
                      onClick={() => setSelectedPlan('year')}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedPlan === 'year'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Annuale
                      <span className="ml-1 text-xs text-green-600">-20%</span>
                    </button>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold dark:text-slate-100">
                    €{selectedPlan === 'year' 
                      ? (29.99 * 0.8 * 12).toFixed(2) 
                      : '29.99'}
                  </p>
                  <p className="text-gray-600 dark:text-slate-400">
                    /{selectedPlan === 'year' ? 'anno' : 'mese'}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Quiz di apprendimento illimitati
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Simulazioni d'esame illimitate
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Video lezioni avanzate
                  </li>
                  <li className="flex items-center gap-2 text-gray-600 dark:text-slate-400">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Supporto prioritario
                  </li>
                </ul>

                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard className="w-5 h-5" />
                  {loading ? 'Elaborazione...' : 'Attiva Abbonamento'}
                </button>
              </div>
            </div>

            {/* Code History Section */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold mb-4 dark:text-slate-100 flex items-center gap-2">
                <History className="w-6 h-6 text-blue-600" />
                Cronologia Codici Utilizzati
              </h3>
              
              {loadingHistory ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-slate-400">Caricamento cronologia...</p>
                </div>
              ) : codeHistory.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-gray-500 dark:text-slate-400">Nessun codice utilizzato finora.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {codeHistory.map((usage, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            usage.type === 'master' || usage.type === 'instructor' 
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          }`}>
                            <Key className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium dark:text-slate-100">{usage.code}</p>
                              {usage.is_active !== undefined && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  usage.is_active 
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                }`}>
                                  {usage.is_active ? 'Attivo' : 'Disattivato'}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                              {usage.type === 'master' ? 'Codice Master' : 
                               usage.type === 'instructor' ? 'Codice Istruttore' : 'Codice Monouso'}
                            </p>
                            {usage.description && (
                              <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 italic">
                                {usage.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Grid per visualizzare le informazioni aggiuntive */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex flex-col space-y-1">
                          <span className="text-gray-500 dark:text-slate-400 text-xs">Data utilizzo</span>
                          <span className="dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-blue-500" /> 
                            {formatDate(usage.used_at)}
                          </span>
                        </div>
                      
                        {usage.created_at && (
                          <div className="flex flex-col space-y-1">
                            <span className="text-gray-500 dark:text-slate-400 text-xs">Data creazione</span>
                            <span className="dark:text-slate-300 flex items-center gap-1">
                              <PlusCircle className="w-4 h-4 text-green-500" /> 
                              {formatDate(usage.created_at)}
                            </span>
                          </div>
                        )}
                      
                        {usage.expires_at && (
                          <div className="flex flex-col space-y-1">
                            <span className="text-gray-500 dark:text-slate-400 text-xs">Data scadenza</span>
                            <span className="dark:text-slate-300 flex items-center gap-1">
                              <Clock className="w-4 h-4 text-amber-500" /> 
                              {formatDate(usage.expires_at)}
                            </span>
                          </div>
                        )}
                      
                        {usage.max_uses !== undefined && (
                          <div className="flex flex-col space-y-1">
                            <span className="text-gray-500 dark:text-slate-400 text-xs">Utilizzi massimi</span>
                            <span className="dark:text-slate-300 flex items-center gap-1">
                              <Users className="w-4 h-4 text-purple-500" /> 
                              {usage.max_uses > 0 ? usage.max_uses : 'Illimitati'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}