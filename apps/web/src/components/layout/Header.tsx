import React from 'react';
import { Search } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  apiStatus?: 'ok' | 'error' | 'loading';
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Visão Geral',
  subtitle = 'Painel integrado de Recursos Humanos',
  apiStatus = 'ok',
}) => {
  return (
    <header className="h-16 bg-atrio-surface border-b border-atrio-border px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-base font-bold text-atrio-navy leading-tight">{title}</h1>
        <p className="text-xs text-atrio-text-secondary">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Barra de Busca Rápida */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar colaborador, setor..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-atrio-bg border border-atrio-border rounded-lg text-atrio-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-atrio-teal focus:border-atrio-teal transition-all"
          />
        </div>

        {/* Status da API */}
        <Badge
          variant={apiStatus === 'ok' ? 'success' : apiStatus === 'loading' ? 'warning' : 'danger'}
          dot
          size="sm"
        >
          {apiStatus === 'ok' ? 'API Conectada' : apiStatus === 'loading' ? 'Verificando...' : 'API Offline'}
        </Badge>

        {/* Notificações Assíncronas In-app */}
        <NotificationBell />
      </div>
    </header>
  );
};
