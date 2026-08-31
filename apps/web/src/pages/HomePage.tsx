import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { EmployeeDashboardView } from './dashboard/EmployeeDashboardView';
import { ManagerDashboardView } from './dashboard/ManagerDashboardView';
import { RhDashboardView } from './dashboard/RhDashboardView';
import {
  Users,
  UserCheck,
  Building2,
  ShieldCheck,
  Clock,
  Calendar,
  FileText,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, employee, roles, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();

  // Determina a aba padrão baseada no perfil mais elevado
  const initialTab = hasRole('ADMIN', 'RH')
    ? 'RH'
    : hasPermission('ponto.visualizar', 'TEAM') || hasRole('GESTOR')
    ? 'GESTOR'
    : 'COLABORADOR';

  const [activeDashboardView, setActiveDashboardView] = useState<'COLABORADOR' | 'GESTOR' | 'RH'>(initialTab);

  // Saudação dinâmica baseada no horário
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';

  const displayName = employee?.name || user?.email?.split('@')[0] || 'Colaborador';

  return (
    <AppLayout title="Início / Visão Geral" subtitle="Central de autosserviço, gestão corporativa e indicadores estratégicos">
      <div className="space-y-6">
        {/* Banner Superior — Boas-Vindas & Acesso Rápido */}
        <div className="bg-gradient-to-r from-atrio-navy via-atrio-navy-dark to-slate-900 p-6 rounded-2xl text-white shadow-md relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 w-96 h-full bg-atrio-teal/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-atrio-teal text-xs font-semibold backdrop-blur-md border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Portal Átrio RH</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {greeting}, {displayName}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Acompanhe o seu ponto, solicite férias, consulte holerites ou gerencie as aprovações da sua equipe em um só lugar.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10 backdrop-blur-sm self-start lg:self-auto shrink-0">
              <ShieldCheck className="w-5 h-5 text-atrio-teal shrink-0" />
              <div className="text-xs">
                <p className="text-slate-400 font-medium">Perfil Ativo</p>
                <p className="font-bold text-white">{roles.join(' · ') || 'COLABORADOR'}</p>
              </div>
            </div>
          </div>

          {/* Barra de Atalhos Rápidos */}
          <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => navigate('/ponto/meu-ponto')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-left flex items-center gap-3 group border border-white/5"
            >
              <div className="p-2 rounded-lg bg-atrio-teal/20 text-atrio-teal group-hover:bg-atrio-teal group-hover:text-atrio-navy transition-all">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Meu Ponto</p>
                <p className="text-[10px] text-slate-300 truncate">Espelho &amp; Batidas</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/ponto/enviar-atestado')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-left flex items-center gap-3 group border border-white/5"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-atrio-navy transition-all">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Atestado Médico</p>
                <p className="text-[10px] text-slate-300 truncate">Enviar Comprovante</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/ferias/minhas-ferias')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-left flex items-center gap-3 group border border-white/5"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500 group-hover:text-atrio-navy transition-all">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Minhas Férias</p>
                <p className="text-[10px] text-slate-300 truncate">Saldo &amp; Agendamento</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/documentos')}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-left flex items-center gap-3 group border border-white/5"
            >
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 group-hover:bg-blue-500 group-hover:text-atrio-navy transition-all">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Documentos</p>
                <p className="text-[10px] text-slate-300 truncate">Holerites &amp; Recibos</p>
              </div>
            </button>
          </div>
        </div>

        {/* Seletor de Visão do Dashboard por Perfil */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-2 rounded-xl border border-atrio-border shadow-xs gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setActiveDashboardView('COLABORADOR')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeDashboardView === 'COLABORADOR'
                  ? 'bg-atrio-navy text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Visão Colaborador</span>
            </button>

            {(hasPermission('ponto.visualizar', 'TEAM') || hasRole('GESTOR', 'ADMIN', 'RH')) && (
              <button
                onClick={() => setActiveDashboardView('GESTOR')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeDashboardView === 'GESTOR'
                    ? 'bg-atrio-navy text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>Visão Gestor de Equipe</span>
              </button>
            )}

            {hasRole('ADMIN', 'RH') && (
              <button
                onClick={() => setActiveDashboardView('RH')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeDashboardView === 'RH'
                    ? 'bg-atrio-navy text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building2 className="w-4 h-4 text-atrio-teal" />
                <span>Visão RH &amp; Diretoria</span>
              </button>
            )}
          </div>

          <span className="text-[11px] text-slate-400 font-medium px-2">
            Exibindo indicadores em tempo real
          </span>
        </div>

        {/* Renderização Dinâmica do Dashboard Ativo */}
        {activeDashboardView === 'COLABORADOR' && <EmployeeDashboardView />}
        {activeDashboardView === 'GESTOR' && <ManagerDashboardView />}
        {activeDashboardView === 'RH' && <RhDashboardView />}
      </div>
    </AppLayout>
  );
};
