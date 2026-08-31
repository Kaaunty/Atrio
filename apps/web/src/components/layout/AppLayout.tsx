import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  apiStatus?: 'ok' | 'error' | 'loading';
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  subtitle,
  apiStatus = 'ok',
}) => {
  return (
    <div className="min-h-screen flex bg-atrio-bg text-atrio-text-primary">
      {/* Sidebar Fixa Navy Escuro */}
      <Sidebar />

      {/* Conteúdo Principal com Fundo #F6F8FA */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} subtitle={subtitle} apiStatus={apiStatus} />
        
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};
