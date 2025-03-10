import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  confirmText?: string;
}

const initialState: ModalState = {
  isOpen: false,
  title: '',
  message: '',
  type: 'info',
  confirmText: 'OK'
};

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>(initialState);
  
  const openModal = useCallback((
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'info' = 'info',
    confirmText: string = 'OK'
  ) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type,
      confirmText
    });
  }, []);
  
  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);
  
  const showSuccess = useCallback((title: string, message: string, confirmText?: string) => {
    openModal(title, message, 'success', confirmText);
  }, [openModal]);
  
  const showError = useCallback((title: string, message: string, confirmText?: string) => {
    openModal(title, message, 'error', confirmText);
  }, [openModal]);
  
  const showInfo = useCallback((title: string, message: string, confirmText?: string) => {
    openModal(title, message, 'info', confirmText);
  }, [openModal]);
  
  return {
    modalState,
    openModal,
    closeModal,
    showSuccess,
    showError,
    showInfo
  };
} 