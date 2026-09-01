import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  RefreshCw,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { RequestVacationModal } from '../../components/vacations/RequestVacationModal';
import { api } from '../../services/api';

export const MyVacationsPage: React.FC = () => {
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVacations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/vacations/me');
      setSummary(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar férias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVacations();
  }, []);

  const handleCancelRequest = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação de férias?')) return;
    try {
      await api.delete(`/vacations/requests/${id}`);
      await fetchVacations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cancelar férias');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_GESTOR':
        return <Badge variant="warning" size="sm" dot>Aguardando Gestor</Badge>;
      case 'PENDENTE_RH':
        return <Badge variant="info" size="sm" dot>Em Análise RH</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Homologado / Agendado</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
      case 'CANCELADO':
        return <Badge variant="neutral" size="sm">Cancelado</Badge>;
      case 'ADQUIRIDO':
        return <Badge variant="success" size="sm">Adquirido</Badge>;
      case 'EM_AQUISICAO':
        return <Badge variant="teal" size="sm">Em Aquisição</Badge>;
      case 'CONCLUIDO':
        return <Badge variant="neutral" size="sm">Concluído</Badge>;
      case 'VENCIDO':
        return <Badge variant="danger" size="sm">Vencido</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-atrio-teal" />
              Minhas Férias
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Consulte seu saldo de períodos aquisitivos, prazos legais e programe seu descanso.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchVacations}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
              disabled={loading || (summary?.totalDaysAvailable || 0) <= 0}
            >
              Solicitar Férias
            </Button>
          </div>
        </div>

        {/* Cards de Métricas - Carrossel no Mobile / Grade no Desktop */}
        <div className="flex overflow-x-auto pb-3 pt-1 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 snap-x snap-mandatory no-scrollbar sm:pb-0 touch-pan-x">
          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-emerald-500">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Saldo Disponível
              </span>
              <p className="text-2xl font-black text-slate-800">
                {summary?.totalDaysAvailable || 0} <span className="text-xs font-normal text-slate-400">dias</span>
              </p>
            </div>
          </Card>

          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-amber-500">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dias Agendados
              </span>
              <p className="text-2xl font-black text-slate-800">
                {summary?.totalDaysScheduled || 0} <span className="text-xs font-normal text-slate-400">dias</span>
              </p>
            </div>
          </Card>

          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-indigo-500">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Dias Gozados
              </span>
              <p className="text-2xl font-black text-slate-800">
                {summary?.totalDaysTaken || 0} <span className="text-xs font-normal text-slate-400">dias</span>
              </p>
            </div>
          </Card>

          <Card padding="md" className="w-[72vw] xs:w-[260px] sm:w-auto shrink-0 snap-start flex items-center gap-4 border-l-4 border-l-rose-500">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Limite Concessivo
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {summary?.periods && summary.periods[0]
                  ? formatDate(summary.periods[0].deadlineDate)
                  : 'N/A'}
              </p>
            </div>
          </Card>
        </div>

        {/* Tabela de Períodos Aquisitivos */}
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-atrio-text-primary">
                Períodos Aquisitivos e Concessivos
              </h3>
              <p className="text-xs text-atrio-text-secondary">
                Histórico legal dos seus ciclos de 12 meses de trabalho e prazos limites para usufruto.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Período Aquisitivo</th>
                  <th className="py-2.5 px-3">Limite Concessivo</th>
                  <th className="py-2.5 px-3 text-center">Direito</th>
                  <th className="py-2.5 px-3 text-center">Gozados</th>
                  <th className="py-2.5 px-3 text-center">Agendados</th>
                  <th className="py-2.5 px-3 text-center">Disponível</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.periods?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {formatDate(p.vestingStartDate)} a {formatDate(p.vestingEndDate)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {formatDate(p.deadlineDate)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-700">{p.daysEntitled}d</td>
                    <td className="py-2.5 px-3 text-center text-slate-500">{p.daysTaken}d</td>
                    <td className="py-2.5 px-3 text-center text-amber-600 font-semibold">{p.daysScheduled}d</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-600">{p.daysRemaining}d</td>
                    <td className="py-2.5 px-3">{getStatusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Histórico de Solicitações */}
        <Card padding="md" className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-atrio-text-primary">
              Histórico de Solicitações de Férias
            </h3>
            <p className="text-xs text-atrio-text-secondary">
              Acompanhe as datas programadas, opções de abono e pareceres da chefia e RH.
            </p>
          </div>

          {summary?.requests?.length > 0 ? (
            <div className="space-y-3">
              {summary.requests.map((req: any) => {
                const canCancel = ['PENDENTE_GESTOR', 'PENDENTE_RH'].includes(req.status);

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <strong className="text-sm text-atrio-navy font-bold">
                          {formatDate(req.startDate)} a {formatDate(req.endDate)}
                        </strong>
                        <Badge variant="teal" size="sm">
                          {req.daysCount} dias de gozo
                        </Badge>
                        {req.sellDaysCount > 0 && (
                          <Badge variant="neutral" size="sm">
                            + {req.sellDaysCount} dias de abono
                          </Badge>
                        )}
                        {req.advanceThirteenth && (
                          <Badge variant="info" size="sm">
                            Adiantamento 13º
                          </Badge>
                        )}
                        {getStatusBadge(req.status)}
                      </div>

                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                        >
                          Cancelar Solicitação
                        </button>
                      )}
                    </div>

                    {req.notes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong>Minha Observação:</strong> {req.notes}
                      </p>
                    )}

                    {req.managerNotes && (
                      <p className="text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Parecer do Gestor ({req.manager?.name || 'Gestor'}):</strong>{' '}
                          {req.managerNotes}
                        </span>
                      </p>
                    )}

                    {req.rhNotes && (
                      <p className="text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Parecer do RH:</strong> {req.rhNotes}
                        </span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma solicitação de férias registrada.
            </div>
          )}
        </Card>

        {/* Modal de Solicitação */}
        <RequestVacationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchVacations}
          periods={summary?.periods || []}
        />
      </div>
    </AppLayout>
  );
};
