/**
 * Wrapper per il localStorage che dispacci eventi personalizzati quando i valori vengono modificati
 */

export const storageWrapper = {
  /**
   * Imposta un valore nel localStorage e dispacci un evento personalizzato
   */
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
    
    // Dispacci un evento personalizzato
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('localStorageUpdated'));
    
    // Log per debugging
    console.log(`Storage: set ${key} = ${value}`);
  },
  
  /**
   * Ottiene un valore dal localStorage
   */
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },
  
  /**
   * Rimuove un valore dal localStorage e dispacci un evento personalizzato
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
    
    // Dispacci un evento personalizzato
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('localStorageUpdated'));
    
    // Log per debugging
    console.log(`Storage: removed ${key}`);
  },
  
  /**
   * Svuota il localStorage e dispacci un evento personalizzato
   */
  clear(): void {
    localStorage.clear();
    
    // Dispacci un evento personalizzato
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('localStorageUpdated'));
    
    // Log per debugging
    console.log('Storage: cleared');
  }
}; 