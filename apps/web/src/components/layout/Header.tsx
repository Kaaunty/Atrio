import React from 'react';
import { Search, Menu } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  apiStatus?: 'ok' | 'error' | 'loading';
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Visão Geral',
  subtitle = 'Painel integrado de Recursos Humanos',
  apiStatus = 'ok',
  onToggleSidebar,
}) => {
  return (
    <header className="h-16 bg-atrio-surface border-b border-atrio-border px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 gap-3">
      {/* Botão Hambúrguer Mobile + Título */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 -ml-1 rounded-lg text-slate-600 hover:text-atrio-navy hover:bg-slate-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-atrio-teal shrink-0"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-base font-bold text-atrio-navy leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-atrio-text-secondary truncate hidden xs:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Ações da Direita */}
      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        {/* Barra de Busca Rápida */}
        <div className="relative hidden md:block w-48 lg:w-64">
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
          className="shrink-0"
        >
          <span className="hidden sm:inline">
            {apiStatus === 'ok' ? 'API Conectada' : apiStatus === 'loading' ? 'Verificando...' : 'API Offline'}
          </span>
          <span className="sm:hidden">
            {apiStatus === 'ok' ? 'Online' : apiStatus === 'loading' ? 'Verif...' : 'Offline'}
          </span>
        </Badge>

        {/* Notificações Assíncronas In-app */}
        <NotificationBell />
      </div>
    </header>
  );
};
