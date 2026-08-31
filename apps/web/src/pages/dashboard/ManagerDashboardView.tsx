import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserX,
  CheckSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../services/api';

export const ManagerDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/manager/summary');
      setData(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard do gestor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleApproveAdjustment = async (adjId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/time-clock/adjustments/${adjId}/manager-approve`, {
        notes: 'Aprovado diretamente pelo Dashboard do Gestor.',
      });
      setSuccessMsg('Ajuste de ponto aprovado com sucesso!');
      fetchSummary();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Erro ao aprovar ajuste:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveVacation = async (vacId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/vacations/${vacId}/manager-approve`, {
        notes: 'Aprovado pelo Gestor Imediato no Dashboard.',
      });
      setSuccessMsg('Solicitação de férias aprovada!');
      fetchSummary();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Erro ao aprovar férias:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatExtraHours = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `+${hours}h ${remainingMins}m`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-3 border-atrio-teal border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-xs text-atrio-text-secondary">Carregando indicadores táticos da equipe...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Boas-Vindas Gestor */}
      <div className="bg-gradient-to-r from-atrio-navy to-slate-900 p-6 rounded-xl text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-atrio-teal">
            Painel do Gestor de Equipe
          </span>
          <h2 className="text-xl font-bold mt-0.5">Visão Tática da Equipe</h2>
          <p className="text-xs text-slate-300 mt-1">
            Gerencie presença, aprovações de ponto/férias e controle divergências da sua equipe imediata.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-xs border border-white/10">
          <ShieldCheck className="w-4 h-4 text-atrio-teal" />
          <span>{data?.teamTotalCount || 0} Subordinados Diretos</span>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-semantic-success-light text-semantic-success border border-semantic-success/20 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Cards Táticos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ausentes Hoje */}
        <Card className="space-y-2 border-l-4 border-l-semantic-warning">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Ausentes Hoje
            </span>
            <div className="p-2 bg-semantic-warning-light text-semantic-warning rounded-lg">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.absentToday?.length || 0} <span className="text-xs text-atrio-text-secondary">/ {data?.teamTotalCount || 0}</span>
            </span>
            {data?.absentToday?.length > 0 && <Badge variant="warning" size="sm">Afastados</Badge>}
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Férias e licenças em vigor</p>
        </Card>

        {/* Card 2: Pendências de Aprovação */}
        <Card className="space-y-2 border-l-4 border-l-atrio-teal">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Pendências de Aprovação
            </span>
            <div className="p-2 bg-atrio-teal-light text-atrio-teal-dark rounded-lg">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {data?.pendingApprovalsCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Ajustes de ponto &amp; solicitações</p>
        </Card>

        {/* Card 3: Divergências do Mês */}
        <Card className="space-y-2 border-l-4 border-l-semantic-error">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Divergências da Equipe
            </span>
            <div className="p-2 bg-semantic-error-light text-semantic-error rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-semantic-error">
              {data?.teamDivergencesMonthCount || 0}
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Batidas ímpares / atrasos no mês</p>
        </Card>

        {/* Card 4: Horas Extras da Equipe */}
        <Card className="space-y-2 border-l-4 border-l-semantic-info">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-atrio-text-secondary uppercase tracking-wider">
              Horas Extras (Mês)
            </span>
            <div className="p-2 bg-semantic-info-light text-semantic-info rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-atrio-navy">
              {formatExtraHours(data?.teamExtraHoursMonthMinutes || 0)}
            </span>
          </div>
          <p className="text-[11px] text-atrio-text-secondary">Acumulado no time</p>
        </Card>
      </div>

      {/* Seção 1: Aprovações Diretas Inline (Ajustes de Ponto da Equipe) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-atrio-navy">Ajustes de Ponto Pendentes na Equipe</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/gestao/aprovacoes/ponto')}>
            Fila Completa <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {data?.pendingTimeAdjustments?.length === 0 ? (
          <div className="text-center py-6 text-xs text-atrio-text-secondary">
            Nenhum ajuste de ponto pendente na equipe.
          </div>
        ) : (
          <div className="overflow-x-auto border border-atrio-border rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-atrio-border-light text-atrio-navy font-bold border-b border-atrio-border">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Tipo de Ajuste</th>
                  <th className="p-3">Motivo / Justificativa</th>
                  <th className="p-3 text-right">Ação Direta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atrio-border/60">
                {data?.pendingTimeAdjustments?.map((adj: any) => (
                  <tr key={adj.id} className="hover:bg-atrio-border-light/30">
                    <td className="p-3 font-bold text-atrio-text-primary">{adj.employeeName}</td>
                    <td className="p-3 font-mono">{adj.date}</td>
                    <td className="p-3"><Badge variant="info" size="sm">{adj.adjustmentType}</Badge></td>
                    <td className="p-3 text-atrio-text-secondary">{adj.reason}</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApproveAdjustment(adj.id)}
                      >
                        Aprovar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Seção 2: Solicitações de Férias da Equipe Pendentes de Aprovação */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-atrio-navy">Solicitações de Férias da Equipe (Aprovação Pendente)</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/gestao/aprovacoes/ferias')}>
            Ver Fila de Férias <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {data?.pendingVacations?.length === 0 ? (
          <div className="text-center py-6 text-xs text-atrio-text-secondary">
            Nenhuma solicitação de férias pendente na equipe.
          </div>
        ) : (
          <div className="overflow-x-auto border border-atrio-border rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-atrio-border-light text-atrio-navy font-bold border-b border-atrio-border">
                <tr>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Início</th>
                  <th className="p-3">Término</th>
                  <th className="p-3">Duração</th>
                  <th className="p-3 text-right">Ação Direta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atrio-border/60">
                {data?.pendingVacations?.map((vac: any) => (
                  <tr key={vac.id} className="hover:bg-atrio-border-light/30">
                    <td className="p-3 font-bold text-atrio-text-primary">{vac.employeeName}</td>
                    <td className="p-3 font-mono">{vac.startDate}</td>
                    <td className="p-3 font-mono">{vac.endDate}</td>
                    <td className="p-3 font-bold">{vac.daysCount} dias</td>
                    <td className="p-3 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApproveVacation(vac.id)}
                      >
                        Aprovar Férias
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Seção 2: Ausências Agendadas nos Próximos 30 Dias */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-atrio-navy">Ausências Programadas (Próximos 30 Dias)</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/gestao/ferias/calendario')}>
            Ver Calendário da Equipe <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {data?.upcomingAbsences?.length === 0 ? (
          <div className="text-center py-6 text-xs text-atrio-text-secondary">
            Nenhuma ausência agendada nos próximos 30 dias.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data?.upcomingAbsences?.map((abs: any, idx: number) => (
              <div key={idx} className="p-3 rounded-lg border border-atrio-border bg-atrio-border-light/20 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-atrio-navy">{abs.employeeName}</h4>
                  <span className="text-[10px] text-atrio-text-secondary font-mono">
                    {abs.startDate} a {abs.endDate}
                  </span>
                </div>
                <Badge variant="teal" size="sm">{abs.daysCount}d Férias</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
