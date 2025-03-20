import React from 'react';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { useAppSelector } from '../../redux/hooks';
import { selectUi } from '../../redux/slices/uiSlice';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  studentEmail?: string;
  isMaster?: boolean;
  supabaseStatus?: 'checking' | 'connected' | 'error';
}

export function DashboardLayout({
  children,
  onLogout,
  studentEmail,
  isMaster,
  supabaseStatus = 'connected'
}: DashboardLayoutProps) {
  const { activeTab, sidebarOpen } = useAppSelector(selectUi);

  console.log("DashboardLayout renderizzato con isMaster:", isMaster);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mostra lo stato di connessione a Supabase se necessario */}
      {supabaseStatus === 'checking' && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-1 text-center text-xs z-50">
          Connessione al database in corso...
        </div>
      )}
      {supabaseStatus === 'error' && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-1 text-center text-xs z-50">
          Errore di connessione al database
        </div>
      )}
      
      <Sidebar
        onLogout={onLogout}
        studentEmail={studentEmail}
        isMaster={isMaster}
      />
      
      <main 
        className={`transition-all duration-300 flex-1 ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        <div className="container mx-auto py-6 pt-20 lg:pt-6 dark:text-slate-50">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}