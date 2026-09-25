import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Users,
  ClipboardList,
  RefreshCw,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';

const FUNNEL_LABELS: Record<string, string> = {
  TRIAGEM: 'Triagem',
  ENTREVISTA: 'Entrevista',
  AVALIACAO: 'Avaliação',
  PARECER: 'Parecer',
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
};

const FUNNEL_COLORS: Record<string, string> = {
  TRIAGEM: 'bg-slate-400',
  ENTREVISTA: 'bg-blue-500',
  AVALIACAO: 'bg-indigo-500',
  PARECER: 'bg-amber-500',
  APROVADO: 'bg-emerald-500',
  REPROVADO: 'bg-rose-500',
};

const OPENING_STATUS_BADGE = (status: string) => {
  switch (status) {
    case 'ABERTA':
      return <Badge variant="info" size="sm" dot>Aberta</Badge>;
    case 'EM_ANDAMENTO':
      return <Badge variant="warning" size="sm" dot>Em Andamento</Badge>;
    case 'ENCERRADA':
      return <Badge variant="success" size="sm">Encerrada</Badge>;
    case 'CANCELADA':
      return <Badge variant="danger" size="sm">Cancelada</Badge>;
    default:
      return <Badge variant="neutral" size="sm">{status}</Badge>;
  }
};

export const RecruitmentDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recruitment/dashboard');
      setOverview(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar painel de recrutamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const funnel = overview?.funnel || {};
  const funnelTotal = Object.values(funnel).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-atrio-teal" />
              Painel de Recrutamento e Seleção
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Visão geral das vagas, candidaturas e entrevistas em andamento.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchOverview}
            disabled={loading}
          >
            Atualizar Painel
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card padding="md" className="space-y-1">
            <div className="flex items-center gap-2 text-atrio-text-secondary text-xs font-bold uppercase tracking-wide">
              <Briefcase className="w-4 h-4 text-atrio-teal" />
              Vagas Abertas
            </div>
            <p className="text-2xl font-bold text-atrio-text-primary">{overview?.openOpeningsCount ?? '-'}</p>
          </Card>
          <Card padding="md" className="space-y-1">
            <div className="flex items-center gap-2 text-atrio-text-secondary text-xs font-bold uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Vagas em Andamento
            </div>
            <p className="text-2xl font-bold text-atrio-text-primary">{overview?.inProgressOpeningsCount ?? '-'}</p>
          </Card>
          <Card padding="md" className="space-y-1">
            <div className="flex items-center gap-2 text-atrio-text-secondary text-xs font-bold uppercase tracking-wide">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              Solicitações Pendentes
            </div>
            <p className="text-2xl font-bold text-atrio-text-primary">{overview?.pendingRequisitionsCount ?? '-'}</p>
          </Card>
          <Card padding="md" className="space-y-1">
            <div className="flex items-center gap-2 text-atrio-text-secondary text-xs font-bold uppercase tracking-wide">
              <Users className="w-4 h-4 text-indigo-500" />
              Total de Candidatos
            </div>
            <p className="text-2xl font-bold text-atrio-text-primary">{overview?.totalCandidatesCount ?? '-'}</p>
          </Card>
        </div>

        <Card padding="md" className="space-y-4">
          <h3 className="text-sm font-bold text-atrio-text-primary">Funil de Candidaturas</h3>
          {funnelTotal > 0 ? (
            <div className="space-y-2.5">
              {Object.keys(FUNNEL_LABELS).map((stage) => {
                const count = Number(funnel[stage]) || 0;
                const pct = funnelTotal > 0 ? Math.round((count / funnelTotal) * 100) : 0;
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-atrio-text-primary">{FUNNEL_LABELS[stage]}</span>
                      <span className="text-atrio-text-secondary">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${FUNNEL_COLORS[stage]}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">Nenhuma candidatura registrada ainda.</div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-atrio-teal" />
              Próximas Entrevistas
            </h3>
            {overview?.upcomingInterviews?.length > 0 ? (
              <div className="space-y-2">
                {overview.upcomingInterviews.map((interview: any) => (
                  <div key={interview.id} className="p-3 rounded-lg border border-slate-200 text-xs space-y-0.5">
                    <p className="font-bold text-atrio-text-primary">
                      {interview.application?.candidate?.name || 'Candidato'}
                    </p>
                    <p className="text-atrio-text-secondary">
                      {interview.application?.jobOpening?.title || 'Vaga'}
                    </p>
                    <p className="text-atrio-teal-dark font-mono">{formatDateTime(interview.scheduledAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">Nenhuma entrevista agendada.</div>
            )}
          </Card>

          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-atrio-teal" />
              Vagas Recentes
            </h3>
            {overview?.recentOpenings?.length > 0 ? (
              <div className="space-y-2">
                {overview.recentOpenings.map((opening: any) => (
                  <div
                    key={opening.id}
                    className="p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="font-bold text-atrio-text-primary">{opening.title}</p>
                      <p className="text-atrio-text-secondary">
                        {opening.applicationsCount ?? 0} candidatura(s)
                      </p>
                    </div>
                    {OPENING_STATUS_BADGE(opening.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">Nenhuma vaga recente.</div>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
