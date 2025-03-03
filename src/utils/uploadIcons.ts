import { supabase } from '../services/supabase';

/**
 * Verifica se il bucket "icons" esiste e lo crea se necessario
 */
export const ensureIconsBucketExists = async (): Promise<boolean> => {
  try {
    // Controlla se il bucket esiste
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      console.error('Errore nella verifica dei bucket:', listError);
      return false;
    }
    
    // Verifica se il bucket "icons" esiste già
    const iconsBucketExists = buckets.some(bucket => bucket.name === 'icons');
    
    if (!iconsBucketExists) {
      // Crea il bucket "icons" se non esiste
      const { error: createError } = await supabase
        .storage
        .createBucket('icons', {
          public: true, // Rende il bucket pubblico
          fileSizeLimit: 1024 * 1024, // Limite dimensione file: 1MB
        });
      
      if (createError) {
        console.error('Errore nella creazione del bucket "icons":', createError);
        return false;
      }
      
      console.log('Bucket "icons" creato con successo');
    } else {
      console.log('Bucket "icons" già esistente');
    }
    
    // Imposta le policy di accesso pubblico per il bucket
    const { error: policyError } = await supabase
      .storage
      .from('icons')
      .createSignedUrl('dummy.txt', 60);
    
    if (policyError && policyError.message !== 'The resource was not found') {
      console.error('Errore nella verifica delle policy del bucket:', policyError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Errore imprevisto durante la gestione del bucket:', error);
    return false;
  }
};

/**
 * Carica un file icona su Supabase Storage
 * @param file Il file da caricare
 * @param fileName Il nome con cui salvare il file
 * @returns L'URL pubblico dell'icona se il caricamento ha successo, null altrimenti
 */
export const uploadIcon = async (
  file: File,
  fileName: string = file.name
): Promise<string | null> => {
  try {
    // Assicurati che il bucket esista
    const bucketExists = await ensureIconsBucketExists();
    if (!bucketExists) {
      throw new Error('Impossibile assicurare l\'esistenza del bucket "icons"');
    }
    
    // Carica il file
    const { data, error } = await supabase
      .storage
      .from('icons')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true // Sovrascrive il file se esiste già
      });
    
    if (error) {
      console.error('Errore nel caricamento dell\'icona:', error);
      return null;
    }
    
    // Ottieni l'URL pubblico del file
    const { data: urlData } = supabase
      .storage
      .from('icons')
      .getPublicUrl(data.path);
    
    return urlData.publicUrl;
  } catch (error) {
    console.error('Errore imprevisto durante il caricamento dell\'icona:', error);
    return null;
  }
};

/**
 * Elimina un'icona dal bucket "icons"
 * @param fileName Il nome del file da eliminare
 * @returns true se l'eliminazione ha successo, false altrimenti
 */
export const deleteIcon = async (fileName: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .storage
      .from('icons')
      .remove([fileName]);
    
    if (error) {
      console.error('Errore nell\'eliminazione dell\'icona:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Errore imprevisto durante l\'eliminazione dell\'icona:', error);
    return false;
  }
};

/**
 * Ottiene la lista di tutte le icone nel bucket
 * @returns Array di oggetti contenenti nome e URL delle icone
 */
export const listIcons = async (): Promise<{ name: string; url: string }[]> => {
  try {
    const { data, error } = await supabase
      .storage
      .from('icons')
      .list();
    
    if (error) {
      console.error('Errore nell\'ottenere la lista delle icone:', error);
      return [];
    }
    
    // Converti i risultati in un array di oggetti con nome e URL
    return data
      .filter(item => !item.id.endsWith('/')) // Filtra le cartelle
      .map(item => {
        const { data: urlData } = supabase
          .storage
          .from('icons')
          .getPublicUrl(item.name);
        
        return {
          name: item.name,
          url: urlData.publicUrl
        };
      });
  } catch (error) {
    console.error('Errore imprevisto durante il recupero della lista delle icone:', error);
    return [];
  }
};

export default {
  ensureIconsBucketExists,
  uploadIcon,
  deleteIcon,
  listIcons
}; 