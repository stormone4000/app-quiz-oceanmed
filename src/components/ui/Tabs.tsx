import React from 'react';

// Interfaccia per le props del componente Tabs
interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

// Interfaccia per le props del componente TabsList
interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

// Interfaccia per le props del componente TabsTrigger
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

// Interfaccia per le props del componente TabsContent
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

// Contesto delle tabs per gestire lo stato e condividerlo tra i componenti
const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({
  value: '',
  onValueChange: () => {},
});

// Componente principale Tabs
export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`w-full ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// Componente per il contenitore della lista di tabs
export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex border-b border-gray-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );
}

// Componente per il trigger del tab
export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext);
  const isActive = value === selectedValue;

  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={`
        px-4 py-2 text-sm font-medium transition-colors
        ${isActive 
          ? 'border-b-2 border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
          : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-300'}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// Componente per il contenuto del tab
export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext);
  
  if (value !== selectedValue) {
    return null;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
} 