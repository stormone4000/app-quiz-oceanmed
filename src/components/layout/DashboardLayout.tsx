import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { ThemeToggle } from '../ThemeToggle';
import { DashboardTab } from '../../types-dashboard';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onLogout: () => void;
  studentEmail?: string;
  isMaster?: boolean;
}

export function DashboardLayout({ children, activeTab, onTabChange, onLogout, studentEmail, isMaster }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col">
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onLogout={onLogout}
        studentEmail={studentEmail}
        isMaster={isMaster}
      />
      
      <main 
        className={`transition-all duration-300 flex-1 ${
          isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
        }`}
      >
        <div className="container mx-auto py-6 pt-20 lg:pt-6 dark:text-slate-50">
          {children}
        </div>
      </main>

      <div className={`transition-all duration-300 ${
        isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'
      }`}>
        <Footer />
      </div>
    </div>
  );
}