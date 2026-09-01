import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Fecha a sidebar mobile automaticamente ao mudar de rota
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="h-screen w-full flex bg-atrio-bg text-atrio-text-primary overflow-hidden">
      {/* Sidebar (Desktop fixa / Mobile drawer) */}
      <Sidebar mobileOpen={sidebarOpen} onCloseMobile={() => setSidebarOpen(false)} />

      {/* Conteúdo Principal com Scroll Independente */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overflow-x-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          apiStatus={apiStatus}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};
