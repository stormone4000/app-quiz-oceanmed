import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DashboardTab } from '../../types-dashboard';
import type { RootState } from '../store';

interface UiState {
  activeTab: DashboardTab;
  sidebarOpen: boolean;
}

// Recupera lo stato iniziale dal localStorage se disponibile
const initialState: UiState = {
  activeTab: (localStorage.getItem('activeTab') as DashboardTab) || 'dashboard',
  sidebarOpen: localStorage.getItem('sidebarOpen') !== 'false',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<DashboardTab>) => {
      state.activeTab = action.payload;
      // Salva anche in localStorage per persistenza
      localStorage.setItem('activeTab', action.payload);
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      localStorage.setItem('sidebarOpen', state.sidebarOpen.toString());
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      localStorage.setItem('sidebarOpen', action.payload.toString());
    }
  }
});

export const { setActiveTab, toggleSidebar, setSidebarOpen } = uiSlice.actions;

// Selettori
export const selectUi = (state: RootState) => state.ui;
export const selectActiveTab = (state: RootState) => state.ui.activeTab;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;

export default uiSlice.reducer; 