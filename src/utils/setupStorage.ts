import { supabaseAdmin } from '../services/supabase';

/**
 * Verifica e crea il bucket di storage per le immagini dei profili se non esiste
 */
export const setupProfileStorage = async (): Promise<{success: boolean, message: string}> => {
  console.log('🔍 Verificando la configurazione del bucket per le immagini dei profili...');
  
  try {
    // Verifica l'esistenza del bucket 'profiles'
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Errore nel recupero dei bucket:', bucketsError);
      return { 
        success: false, 
        message: `Errore nel recupero dei bucket: ${bucketsError.message}` 
      };
    }
    
    const profilesBucket = buckets?.find(b => b.name === 'profiles');
    
    // Se il bucket non esiste, lo creiamo
    if (!profilesBucket) {
      console.log('⚠️ Il bucket "profiles" non esiste. Tentativo di creazione...');
      
      // Prima di creare il bucket, verifichiamo se abbiamo i permessi necessari
      try {
        const { data: roleData, error: roleError } = await supabaseAdmin.rpc('get_my_claims');
        console.log('Role check:', roleData, roleError);
        
        if (roleError) {
          console.error('⚠️ Errore nel verificare i ruoli:', roleError);
        } else {
          console.log('✅ Verifica ruoli completata:', roleData);
        }
      } catch (roleCheckError) {
        console.warn('⚠️ Impossibile verificare i ruoli:', roleCheckError);
      }
      
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket(
        'profiles',
        { 
          public: true, // Rende il bucket pubblico per l'accesso alle immagini
          fileSizeLimit: 2 * 1024 * 1024, // Limite di 2MB per file
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
        }
      );
      
      if (createError) {
        console.error('❌ Errore nella creazione del bucket "profiles":', createError);
        return { 
          success: false, 
          message: `Errore nella creazione del bucket: ${createError.message}` 
        };
      }
      
      console.log('✅ Bucket "profiles" creato con successo:', newBucket);
    } else {
      console.log('✅ Il bucket "profiles" esiste già:', profilesBucket);
    }
    
    // CONFIGURAZIONE POLICY RLS DELLO STORAGE
    // Configuriamo esplicitamente le policy di sicurezza per consentire upload e lettura
    console.log('⚙️ Configurazione policy RLS per lo storage...');
    
    try {
      // 1. Eliminiamo qualsiasi policy esistente per ricrearla
      try {
        await supabaseAdmin.rpc('drop_storage_policy', {
          bucket_name: 'profiles',
          policy_name: 'Public Read'
        });
        await supabaseAdmin.rpc('drop_storage_policy', {
          bucket_name: 'profiles',
          policy_name: 'Public Upload'
        });
        console.log('🗑️ Policy esistenti eliminate');
      } catch (dropError) {
        // Ignoriamo eventuali errori se le policy non esistono
        console.log('⚠️ Nessuna policy esistente da eliminare o errore:', dropError);
      }
      
      // 2. POLICY DI ACCESSO PUBBLICO IN LETTURA
      // Consente a chiunque di leggere i file nel bucket
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'profiles',
        policy_name: 'Public Read',
        definition: "true", // Consente l'accesso a tutti
        operation: 'SELECT',
        role: 'anon' // Anche utenti non autenticati
      });
      console.log('✅ Policy "Public Read" creata con successo');
      
      // 3. POLICY DI UPLOAD PUBBLICO
      // Permette upload a tutti (anche utenti non autenticati)
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'profiles',
        policy_name: 'Public Upload',
        definition: "true", // Consente l'accesso a tutti (può essere modificato per essere più restrittivo)
        operation: 'INSERT',
        role: 'anon' // Anche utenti non autenticati
      });
      console.log('✅ Policy "Public Upload" creata con successo');
      
      // 4. POLICY DI AGGIORNAMENTO PUBBLICO
      // Permette aggiornamento a tutti (anche utenti non autenticati)
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'profiles',
        policy_name: 'Public Update',
        definition: "true", // Consente l'accesso a tutti
        operation: 'UPDATE',
        role: 'anon' // Anche utenti non autenticati
      });
      console.log('✅ Policy "Public Update" creata con successo');
      
      // 5. POLICY DI ELIMINAZIONE PUBBLICO
      // Permette eliminazione a tutti (anche utenti non autenticati)
      await supabaseAdmin.rpc('create_storage_policy', {
        bucket_name: 'profiles',
        policy_name: 'Public Delete',
        definition: "true", // Consente l'accesso a tutti
        operation: 'DELETE',
        role: 'anon' // Anche utenti non autenticati
      });
      console.log('✅ Policy "Public Delete" creata con successo');
      
      console.log('✅ Tutte le policy di sicurezza configurate per il bucket "profiles"');
      
    } catch (policyError) {
      console.error('❌ Errore durante la configurazione delle policy:', policyError);
      return {
        success: false,
        message: `Errore durante la configurazione delle policy: ${policyError instanceof Error ? policyError.message : String(policyError)}`
      };
    }
    
    // Verifichiamo che le modifiche siano state applicate
    try {
      const { data: policies, error: policiesError } = await supabaseAdmin.rpc('get_policies', {
        table_name: 'objects',
        schema_name: 'storage'
      });
      
      if (policiesError) {
        console.error('⚠️ Impossibile verificare le policy:', policiesError);
      } else {
        console.log('📋 Policy configurate:', policies);
      }
    } catch (verifyError) {
      console.warn('⚠️ Impossibile verificare le policy configurate:', verifyError);
    }
    
    return { 
      success: true, 
      message: 'Il bucket "profiles" è stato configurato correttamente con le policy di sicurezza' 
    };
  } catch (error) {
    console.error('❌ Errore imprevisto nella configurazione del bucket:', error);
    return { 
      success: false, 
      message: `Errore imprevisto: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

/**
 * Testa l'upload di un'immagine nel bucket profiles
 */
export const testProfileImageUpload = async (): Promise<{success: boolean, message: string, url?: string}> => {
  try {
    console.log('🧪 Testing l\'upload di un\'immagine nel bucket "profiles"...');
    
    // Crea un'immagine test (un quadrato nero 10x10)
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, 10, 10);
    }
    
    // Converti il canvas in un blob
    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
    
    if (!blob) {
      return { success: false, message: 'Impossibile creare l\'immagine di test' };
    }
    
    // Carica il blob nel bucket
    const testFile = new File([blob], 'test_image.png', { type: 'image/png' });
    const filePath = `test/test_${Date.now()}.png`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('profiles')
      .upload(filePath, testFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Errore nell\'upload dell\'immagine di test:', error);
      return { 
        success: false, 
        message: `Errore nell'upload: ${error.message}` 
      };
    }
    
    console.log('✅ Immagine di test caricata con successo:', data);
    
    // Ottieni l'URL pubblico
    const { data: urlData } = supabaseAdmin.storage
      .from('profiles')
      .getPublicUrl(filePath);
    
    console.log('📤 URL pubblico dell\'immagine di test:', urlData.publicUrl);
    
    return { 
      success: true, 
      message: 'Immagine di test caricata con successo', 
      url: urlData.publicUrl 
    };
  } catch (error) {
    console.error('❌ Errore imprevisto nel test di upload:', error);
    return { 
      success: false, 
      message: `Errore imprevisto: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// Funzione principale per configurare tutto lo storage
export const setupAllStorage = async (): Promise<void> => {
  // Configura il bucket per le immagini dei profili
  const profileSetupResult = await setupProfileStorage();
  console.log('Risultato setup profiles:', profileSetupResult);
  
  // Se la configurazione ha avuto successo, esegui un test di upload
  if (profileSetupResult.success) {
    const testResult = await testProfileImageUpload();
    console.log('Risultato test upload:', testResult);
  }
};

// Esegui la configurazione all'avvio (in ambiente di sviluppo)
if (import.meta.env.DEV) {
  console.log('⚙️ Ambiente di sviluppo rilevato, avvio configurazione storage...');
  setupAllStorage().then(() => {
    console.log('🚀 Configurazione storage completata.');
  });
} 