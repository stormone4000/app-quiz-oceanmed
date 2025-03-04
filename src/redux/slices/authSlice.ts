import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { UserRole } from '../../types';
import type { RootState } from '../store';

// Interfaccia dello stato di autenticazione
interface AuthState {
  isAuthenticated: boolean;
  isStudent: boolean;
  isProfessor: boolean;
  isMasterAdmin: boolean;
  hasActiveAccess: boolean;
  hasInstructorAccess: boolean;
  needsSubscription: boolean;
  userEmail: string | null;
  firstName: string | null;
  lastName: string | null;
}

// Stato iniziale
const initialState: AuthState = {
  isAuthenticated: false,
  isStudent: false,
  isProfessor: false,
  isMasterAdmin: false,
  hasActiveAccess: false,
  hasInstructorAccess: false,
  needsSubscription: false,
  userEmail: null,
  firstName: null,
  lastName: null,
};

// Slice per l'autenticazione
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login dell'utente
    login: (state, action: PayloadAction<UserRole>) => {
      const user = action.payload;
      
      state.isAuthenticated = true;
      state.isStudent = user.isStudent || false;
      state.isProfessor = user.isProfessor || false;
      state.isMasterAdmin = user.isMasterAdmin || false;
      state.hasActiveAccess = user.hasActiveAccess || false;
      state.hasInstructorAccess = user.hasInstructorAccess || false;
      state.needsSubscription = user.needsSubscription || false;
      state.userEmail = user.email || null;
      state.firstName = user.firstName || null;
      state.lastName = user.lastName || null;
      
      // Manteniamo la sincronizzazione con localStorage per compatibilità con il codice esistente
      if (typeof window !== 'undefined') {
        localStorage.setItem('isAuthenticated', String(state.isAuthenticated));
        localStorage.setItem('isStudent', String(state.isStudent));
        localStorage.setItem('isProfessor', String(state.isProfessor));
        localStorage.setItem('isMasterAdmin', String(state.isMasterAdmin || false));
        localStorage.setItem('hasActiveAccess', String(state.hasActiveAccess || false));
        localStorage.setItem('hasInstructorAccess', String(state.hasInstructorAccess || false));
        localStorage.setItem('needsSubscription', String(state.needsSubscription || false));
        if (state.userEmail) localStorage.setItem('userEmail', state.userEmail);
        if (state.firstName) localStorage.setItem('firstName', state.firstName);
        if (state.lastName) localStorage.setItem('lastName', state.lastName);
      }
    },
    
    // Logout dell'utente
    logout: (state) => {
      // Reset dello stato
      state.isAuthenticated = false;
      state.isStudent = false;
      state.isProfessor = false;
      state.isMasterAdmin = false;
      state.hasActiveAccess = false;
      state.hasInstructorAccess = false;
      state.needsSubscription = false;
      state.userEmail = null;
      state.firstName = null;
      state.lastName = null;
      
      // Cancellazione dei dati da localStorage per compatibilità
      if (typeof window !== 'undefined') {
        try {
          // Rimuoviamo tutti i dati relativi all'autenticazione
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('isProfessor');
          localStorage.removeItem('isStudent');
          localStorage.removeItem('isMasterAdmin');
          localStorage.removeItem('hasActiveAccess');
          localStorage.removeItem('hasInstructorAccess');
          localStorage.removeItem('firstName');
          localStorage.removeItem('lastName');
          localStorage.removeItem('needsSubscription');
          localStorage.removeItem('masterCode');
          localStorage.removeItem('email');
          
          // Rimuoviamo anche eventuali dati di sessione per quiz live
          localStorage.removeItem('nickname');
          localStorage.removeItem('quizId');
          localStorage.removeItem('sessionId');
        } catch (error) {
          console.error('Errore durante la pulizia del localStorage:', error);
        }
      }
    },
    
    // Aggiornamento dello stato di accesso dell'istruttore
    updateInstructorAccess: (state, action: PayloadAction<{ hasInstructorAccess: boolean }>) => {
      state.hasInstructorAccess = action.payload.hasInstructorAccess;
      state.hasActiveAccess = action.payload.hasInstructorAccess;
      state.needsSubscription = !action.payload.hasInstructorAccess;
      
      // Sincronizzazione con localStorage per compatibilità
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasInstructorAccess', String(state.hasInstructorAccess));
        localStorage.setItem('hasActiveAccess', String(state.hasActiveAccess));
        localStorage.setItem('needsSubscription', String(state.needsSubscription));
      }
    },
    
    // Sincronizzazione dello stato da localStorage (per compatibilità con il codice esistente)
    syncFromStorage: (state) => {
      if (typeof window !== 'undefined') {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuthenticated) {
          state.isAuthenticated = true;
          state.isStudent = localStorage.getItem('isStudent') === 'true';
          state.isProfessor = localStorage.getItem('isProfessor') === 'true';
          state.isMasterAdmin = localStorage.getItem('isMasterAdmin') === 'true';
          state.hasActiveAccess = localStorage.getItem('hasActiveAccess') === 'true';
          state.hasInstructorAccess = localStorage.getItem('hasInstructorAccess') === 'true';
          state.needsSubscription = localStorage.getItem('needsSubscription') === 'true';
          state.userEmail = localStorage.getItem('userEmail');
          state.firstName = localStorage.getItem('firstName');
          state.lastName = localStorage.getItem('lastName');
        }
      }
    }
  },
});

// Esporta le azioni
export const { login, logout, updateInstructorAccess, syncFromStorage } = authSlice.actions;

// Selettori
export const selectAuth = (state: RootState) => state.auth;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectIsInstructor = (state: RootState) => state.auth.isProfessor;
export const selectIsStudent = (state: RootState) => state.auth.isStudent;
export const selectIsMasterAdmin = (state: RootState) => state.auth.isMasterAdmin;
export const selectHasInstructorAccess = (state: RootState) => state.auth.hasInstructorAccess;
export const selectHasActiveAccess = (state: RootState) => state.auth.hasActiveAccess;
export const selectNeedsSubscription = (state: RootState) => state.auth.needsSubscription;
export const selectUserEmail = (state: RootState) => state.auth.userEmail;
export const selectUserName = (state: RootState) => ({
  firstName: state.auth.firstName,
  lastName: state.auth.lastName
});

// Esporta il reducer
export default authSlice.reducer; 