import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  confirmText?: string;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  confirmText = 'OK'
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  if (!isOpen && !isVisible) return null;
  
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };
  
  const getHeaderColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div 
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl overflow-hidden w-full max-w-md relative z-10 transform transition-transform duration-200"
        style={{ 
          maxWidth: '450px',
          transform: isOpen ? 'translateY(0)' : 'translateY(-20px)'
        }}
      >
        <div className={`${getHeaderColor()} px-4 py-3 flex items-center justify-between`}>
          <h3 className="text-lg font-medium text-white">{title}</h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-start gap-4">
            {getIcon()}
            <p className="text-gray-700 dark:text-gray-300">{message}</p>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
                type === 'success' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : type === 'error'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 