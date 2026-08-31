import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmployeeDashboardView } from './dashboard/EmployeeDashboardView';
import { ManagerDashboardView } from './dashboard/ManagerDashboardView';
import { RhDashboardView } from './dashboard/RhDashboardView';
import { 
  Users, 
  UserCheck,
  Building2,
  ShieldCheck,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { roles, hasRole, hasPermission } = useAuth();

  // Determina a aba padrão baseada no perfil mais elevado
  const initialTab = hasRole('ADMIN', 'RH')
    ? 'RH'
    : hasPermission('ponto.visualizar', 'TEAM') || hasRole('GESTOR')
    ? 'GESTOR'
    : 'COLABORADOR';

  const [activeDashboardView, setActiveDashboardView] = useState<'COLABORADOR' | 'GESTOR' | 'RH'>(initialTab);

  return (
    <AppLayout title="Início / Visão Geral">
      <div className="space-y-8">
        {/* Seletor de Visão do Dashboard por Perfil */}
        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-atrio-border shadow-sm">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveDashboardView('COLABORADOR')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeDashboardView === 'COLABORADOR'
                  ? 'bg-atrio-navy text-white shadow-sm'
                  : 'text-atrio-text-secondary hover:bg-atrio-border-light'
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
                    ? 'bg-atrio-navy text-white shadow-sm'
                    : 'text-atrio-text-secondary hover:bg-atrio-border-light'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Visão Gestor de Equipe</span>
              </button>
            )}

            {hasRole('ADMIN', 'RH') && (
              <button
                onClick={() => setActiveDashboardView('RH')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeDashboardView === 'RH'
                    ? 'bg-atrio-navy text-white shadow-sm'
                    : 'text-atrio-text-secondary hover:bg-atrio-border-light'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Visão RH &amp; Diretoria</span>
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-atrio-teal-dark bg-atrio-teal-light px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>Perfil: {roles.join(', ') || 'COLABORADOR'}</span>
          </div>
        </div>

        {/* Renderização Dinâmica do Dashboard Ativo */}
        {activeDashboardView === 'COLABORADOR' && <EmployeeDashboardView />}
        {activeDashboardView === 'GESTOR' && <ManagerDashboardView />}
        {activeDashboardView === 'RH' && <RhDashboardView />}

        {/* Módulos do Sistema — Progresso Real */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-atrio-navy">Módulos em Desenvolvimento (Tarefas)</h3>
              <p className="text-xs text-atrio-text-secondary">
                Estruturados em <code className="font-mono text-atrio-teal-dark font-medium">tarefas/</code> —{' '}
                <span className="text-semantic-success font-semibold">16 implementadas (100%)</span>{' '}·{' '}
                <span className="text-atrio-text-secondary font-semibold">0 pendentes</span>
              </p>
            </div>
            {/* Barra de progresso geral */}
            <div className="hidden sm:flex flex-col items-end gap-1">
              <span className="text-xs font-bold text-atrio-text-primary">16 / 16 (100%)</span>
              <div className="w-32 h-1.5 bg-atrio-border rounded-full overflow-hidden">
                <div className="h-full bg-semantic-success rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Fase 1 & 2 — Fundação, Estrutura Base e Ponto */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-atrio-text-secondary px-1">
              Fases 1–2 · MVP — Fundação, Estrutura &amp; Ponto Eletrônico
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: "00", title: "Setup & Arquitetura Base", desc: "Stack React + Vite + Node/TypeScript, banco de dados e arquitetura do projeto.", done: true },
                { id: "01", title: "Estrutura Organizacional", desc: "Empresas, Unidades, Setores hierárquicos, Cargos e Organograma.", done: true },
                { id: "02", title: "Cadastro de Colaboradores", desc: "Contratos, vínculos de gestão e Timeline imutável de histórico.", done: true },
                { id: "03", title: "RBAC & Trilha de Auditoria", desc: "Perfis granulares, escopos contextuais e logs de conformidade LGPD.", done: true },
                { id: "04", title: "Integração Control iD", desc: "Sincronização automática e idempotente com relógios de ponto.", done: true },
                { id: "05", title: "Meu Ponto & Banco de Horas", desc: "Espelho mensal de batidas, cálculo de saldo diário e banco acumulado.", done: true },
                { id: "06", title: "Ajuste de Ponto & Divergências", desc: "Detecção de divergências e solicitação/aprovação de ajustes.", done: true },
              ].map((item) => (
                <Card key={item.id} className="space-y-2 border-l-2 border-l-semantic-success opacity-80">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                      ETAPA {item.id}
                    </span>
                    <Badge variant="success" size="sm" dot>Implementada</Badge>
                  </div>
                  <h4 className="font-bold text-sm text-atrio-text-primary">{item.title}</h4>
                  <p className="text-xs text-atrio-text-secondary leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Fase 3 & 4 — Workflows, Férias e Documentos */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-atrio-text-secondary px-1">
              Fases 3–4 · MVP — Workflows, Férias, Atestados &amp; Documentos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: "07", title: "Engine de Workflow & Solicitações", desc: "Engine configurável de workflows (Colaborador → Gestor → RH).", done: true },
                { id: "08", title: "Gestão de Férias", desc: "Períodos aquisitivos, solicitação de férias e calendário da equipe.", done: true },
                { id: "09", title: "Atestados & Afastamentos", desc: "Envio seguro com LGPD, abono de ponto e validação no RH.", done: true },
                { id: "10", title: "Central de Documentos", desc: "Holerites, informes, upload em lote e confirmação de leitura.", done: true },
              ].map((item) => (
                <Card key={item.id} className="space-y-2 border-l-2 border-l-semantic-success opacity-80">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                      ETAPA {item.id}
                    </span>
                    <Badge variant="success" size="sm" dot>Implementada</Badge>
                  </div>
                  <h4 className="font-bold text-sm text-atrio-text-primary">{item.title}</h4>
                  <p className="text-xs text-atrio-text-secondary leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Fase 5 & 6 — Dashboards, Relatórios e Módulos Complementares */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-atrio-text-secondary px-1">
              Fases 5–6 · Dashboards, Relatórios &amp; Módulos Complementares
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { id: "11", title: "Dashboards Operacionais", desc: "Dashboards do Colaborador, Gestor e RH com busca universal e atalhos.", done: true },
                { id: "12", title: "Relatórios & Notificações", desc: "Central de notificações multicanal e relatórios exportáveis (XLSX/PDF).", done: true },
                { id: "13", title: "Benefícios & Comunicados", desc: "Gestão de benefícios e mural de comunicados internos.", done: true },
                { id: "14", title: "Onboarding & Offboarding", desc: "Checklists automatizados de admissão e desligamento.", done: true },
                { id: "15", title: "Treinamentos, Feedback & PDI", desc: "Gestão de treinamentos, feedbacks (1:1) e plano de desenvolvimento.", done: true },
              ].map((item) => (
                <Card key={item.id} hoverable={!item.done} className={`space-y-2 border-l-2 ${item.done ? 'border-l-semantic-success opacity-80' : 'border-l-atrio-border'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                      ETAPA {item.id}
                    </span>
                    <Badge variant={item.done ? 'success' : 'neutral'} size="sm" dot={item.done}>
                      {item.done ? 'Implementada' : 'Pendente'}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-atrio-text-primary">{item.title}</h4>
                  <p className="text-xs text-atrio-text-secondary leading-relaxed">{item.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};
