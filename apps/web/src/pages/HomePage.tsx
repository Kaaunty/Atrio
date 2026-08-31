import React, { useEffect, useState } from 'react';
import { api, ApiResponse } from '../services/api';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  Users, 
  Clock, 
  Calendar, 
  Server,
  Database,
  PlusCircle,
  TrendingUp,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  database: {
    status: string;
    error: string | null;
  };
}


interface BalanceData {
  accumulatedBalanceMinutes: number;
  accumulatedBalanceFormatted: string;
}

interface VacationsData {
  totalDaysAvailable: number;
}

interface RequestsData {
  status: string;
}

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);

  // Indicadores
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [vacations, setVacations] = useState<VacationsData | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(true);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<HealthData>>('/health');
      setHealth(response.data.data);
    } catch {
      setHealth({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 0,
        database: {
          status: 'disconnected',
          error: 'Aguardando inicialização do container PostgreSQL no Docker.',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchIndicators = async () => {
    setIndicatorsLoading(true);
    await Promise.allSettled([
      // Colaboradores ativos
      api.get<ApiResponse<any>>('/employees', { params: { status: 'ATIVO', pageSize: 1 } })
        .then((r) => setTotalEmployees(r.data.meta?.total ?? null))
        .catch(() => setTotalEmployees(null)),

      // Banco de horas (usuário logado)
      api.get<ApiResponse<BalanceData>>('/time-clock/me/balance')
        .then((r) => setBalance(r.data.data))
        .catch(() => setBalance(null)),

      // Férias disponíveis (usuário logado)
      api.get<ApiResponse<VacationsData>>('/vacations/me')
        .then((r) => setVacations(r.data.data))
        .catch(() => setVacations(null)),

      // Solicitações pendentes (usuário logado)
      api.get<ApiResponse<RequestsData[]>>('/requests/me')
        .then((r) => {
          const items = r.data.data ?? [];
          const pending = items.filter((req) =>
            ['PENDENTE_GESTOR', 'PENDENTE_RH', 'EM_ANALISE'].includes(req.status)
          ).length;
          setPendingCount(pending);
        })
        .catch(() => setPendingCount(null)),
    ]);
    setIndicatorsLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    fetchIndicators();
  }, []);


  return (
    <AppLayout 
      title="Painel de Controle" 
      subtitle="Visão operacional, indicadores e atalhos rápidos de autosserviço"
      apiStatus={loading ? 'loading' : health?.status === 'ok' ? 'ok' : 'error'}
    >
      {/* Banner Institucional Neutro & Elegante com Identidade Átrio */}
      <div className="bg-gradient-to-r from-atrio-navy-dark to-atrio-navy rounded-2xl p-6 sm:p-8 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-atrio-teal/20 text-atrio-teal text-xs font-semibold border border-atrio-teal/30">
            <span className="w-1.5 h-1.5 rounded-full bg-atrio-teal" />
            Portal Corporativo Átrio
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Central de Recursos Humanos & Pessoas
          </h2>
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
            Acompanhe sua jornada de ponto, saldo de banco de horas, solicitações de férias e documentos corporativos em um ambiente unificado.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 z-10">
          <Button variant="teal" icon={<PlusCircle className="w-4 h-4" />}>
            Nova Solicitação
          </Button>
          <Button variant="secondary">
            Consultar Meu Ponto
          </Button>
        </div>
      </div>

      {/* Grid de Indicadores Operacionais */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Colaboradores Ativos */}
        <Card className="flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-atrio-text-secondary">
              Colaboradores Ativos
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-atrio-navy">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            {indicatorsLoading ? (
              <div className="flex items-center gap-2 text-atrio-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-extrabold text-atrio-text-primary">
                  {totalEmployees !== null ? totalEmployees : '—'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-atrio-text-secondary">
                  <TrendingUp className="w-3.5 h-3.5 text-semantic-success" />
                  <span>colaboradores com status ativo</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Banco de Horas */}
        <Card className="flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-atrio-text-secondary">
              Banco de Horas (Meu Saldo)
            </span>
            <div className="p-2 rounded-lg bg-atrio-teal-light text-atrio-teal-dark">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            {indicatorsLoading ? (
              <div className="flex items-center gap-2 text-atrio-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : balance ? (
              <>
                <div className={`text-2xl font-extrabold ${balance.accumulatedBalanceMinutes >= 0 ? 'text-atrio-teal-dark' : 'text-semantic-danger'}`}>
                  {balance.accumulatedBalanceFormatted}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-atrio-text-secondary">
                  <Badge variant={balance.accumulatedBalanceMinutes >= 0 ? 'success' : 'danger'} size="sm">
                    {balance.accumulatedBalanceMinutes >= 0 ? 'Positivo' : 'Negativo'}
                  </Badge>
                  <span>saldo acumulado</span>
                </div>
              </>
            ) : (
              <div className="text-2xl font-extrabold text-atrio-text-secondary">—</div>
            )}
          </div>
        </Card>

        {/* Férias Disponíveis */}
        <Card className="flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-atrio-text-secondary">
              Férias Disponíveis
            </span>
            <div className="p-2 rounded-lg bg-blue-50 text-semantic-info">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            {indicatorsLoading ? (
              <div className="flex items-center gap-2 text-atrio-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : vacations ? (
              <>
                <div className="text-2xl font-extrabold text-atrio-text-primary">
                  {vacations.totalDaysAvailable} dias
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-atrio-text-secondary">
                  <Badge variant={vacations.totalDaysAvailable > 0 ? 'info' : 'neutral'} size="sm">
                    {vacations.totalDaysAvailable > 0 ? 'Disponível' : 'Sem saldo'}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="text-2xl font-extrabold text-atrio-text-secondary">—</div>
            )}
          </div>
        </Card>

        {/* Pendências / Alertas */}
        <Card className="flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-atrio-text-secondary">
              Pendências / Alertas
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-semantic-warning">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            {indicatorsLoading ? (
              <div className="flex items-center gap-2 text-atrio-text-secondary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <>
                <div className={`text-2xl font-extrabold ${pendingCount ? 'text-semantic-warning' : 'text-atrio-text-primary'}`}>
                  {pendingCount !== null ? pendingCount : '—'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-atrio-text-secondary">
                  {pendingCount !== null && pendingCount > 0 ? (
                    <Badge variant="warning" size="sm">Aguardando ação</Badge>
                  ) : (
                    <Badge variant="success" size="sm">Em dia</Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      </section>


      {/* Status da Infraestrutura & Arquitetura Base */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-atrio-border pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-atrio-navy">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-atrio-text-primary text-sm">Servidor Backend API</h3>
                <p className="text-[11px] text-atrio-text-secondary">Node.js + Express + TypeScript</p>
              </div>
            </div>
            <Badge variant={health?.status === 'ok' ? 'success' : 'danger'} dot>
              {health?.status === 'ok' ? 'Online' : 'Offline'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-atrio-bg p-2.5 rounded-lg border border-atrio-border/60">
              <span className="text-atrio-text-secondary block">Porta de Escuta:</span>
              <span className="font-mono font-bold text-atrio-text-primary">3333</span>
            </div>
            <div className="bg-atrio-bg p-2.5 rounded-lg border border-atrio-border/60">
              <span className="text-atrio-text-secondary block">Tempo de Atividade:</span>
              <span className="font-mono text-atrio-text-primary">{health?.uptime ? `${Math.floor(health.uptime)}s` : '-'}</span>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between border-b border-atrio-border pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-atrio-teal-light text-atrio-teal-dark">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-atrio-text-primary text-sm">Banco de Dados Relacional</h3>
                <p className="text-[11px] text-atrio-text-secondary">PostgreSQL 16 + Prisma ORM</p>
              </div>
            </div>
            <Badge variant={health?.database.status === 'connected' ? 'success' : 'warning'} dot>
              {health?.database.status === 'connected' ? 'Conectado' : 'Aguardando Banco'}
            </Badge>
          </div>

          <div className="bg-atrio-bg p-2.5 rounded-lg border border-atrio-border/60 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-atrio-text-secondary">Status da Conexão:</span>
              <span className="font-semibold text-atrio-text-primary">
                {health?.database.status === 'connected' ? 'PostgreSQL Ativo' : 'Aguardando Docker Desktop'}
              </span>
            </div>
            {health?.database.error && (
              <p className="text-semantic-warning text-[11px] font-mono mt-1.5 line-clamp-2">
                {health.database.error}
              </p>
            )}
          </div>
        </Card>
      </section>

      {/* Módulos do Sistema — Progresso Real */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-atrio-navy">Módulos em Desenvolvimento (Tarefas)</h3>
            <p className="text-xs text-atrio-text-secondary">
              Estruturados em <code className="font-mono text-atrio-teal-dark font-medium">tarefas/</code> —{' '}
              <span className="text-semantic-success font-semibold">9 implementadas</span>{' '}·{' '}
              <span className="text-semantic-warning font-semibold">7 pendentes</span>
            </p>
          </div>
          {/* Barra de progresso geral */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-xs font-bold text-atrio-text-primary">9 / 16</span>
            <div className="w-32 h-1.5 bg-atrio-border rounded-full overflow-hidden">
              <div className="h-full bg-semantic-success rounded-full" style={{ width: '56.25%' }} />
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

        {/* Fase 3 & 4 — Workflows e Férias */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-atrio-text-secondary px-1">
            Fases 3–4 · MVP — Workflows, Solicitações &amp; Férias
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: "07", title: "Engine de Workflow & Solicitações", desc: "Engine configurável de workflows (Colaborador → Gestor → RH).", done: true },
              { id: "08", title: "Gestão de Férias", desc: "Períodos aquisitivos, solicitação de férias e calendário da equipe.", done: true },
              { id: "09", title: "Atestados & Afastamentos", desc: "Envio de atestados médicos, validação CID e gestão de afastamentos.", done: false },
              { id: "10", title: "Central de Documentos", desc: "Upload, categorização de documentos e confirmação de leitura.", done: false },
            ].map((item) => (
              <Card key={item.id} hoverable={!item.done} className={`space-y-2 border-l-2 ${item.done ? 'border-l-semantic-success opacity-80' : 'border-l-semantic-warning'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                    ETAPA {item.id}
                  </span>
                  <Badge variant={item.done ? 'success' : 'warning'} size="sm" dot={item.done}>
                    {item.done ? 'Implementada' : 'Pendente'}
                  </Badge>
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
              { id: "11", title: "Dashboards Operacionais", desc: "Dashboards do Colaborador, Gestor e RH com indicadores em tempo real." },
              { id: "12", title: "Relatórios & Notificações", desc: "Central de notificações multicanal e relatórios exportáveis (XLSX/PDF)." },
              { id: "13", title: "Benefícios & Comunicados", desc: "Gestão de benefícios e mural de comunicados internos." },
              { id: "14", title: "Onboarding & Offboarding", desc: "Checklists automatizados de admissão e desligamento." },
              { id: "15", title: "Treinamentos, Feedback & PDI", desc: "Gestão de treinamentos, feedbacks (1:1) e plano de desenvolvimento." },
            ].map((item) => (
              <Card key={item.id} hoverable className="space-y-2 border-l-2 border-l-atrio-border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-atrio-teal-dark bg-atrio-teal-light px-2 py-0.5 rounded">
                    ETAPA {item.id}
                  </span>
                  <Badge variant="neutral" size="sm">Pendente</Badge>
                </div>
                <h4 className="font-bold text-sm text-atrio-text-primary">{item.title}</h4>
                <p className="text-xs text-atrio-text-secondary leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </AppLayout>
  );
};
