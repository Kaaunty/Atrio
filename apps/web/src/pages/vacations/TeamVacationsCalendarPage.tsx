import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

export const TeamVacationsCalendarPage: React.FC = () => {
  const [calendarData, setCalendarData] = useState<any>({ requests: [], overlaps: [] });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de Data
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);

  // Modais de Deliberação
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const [calRes, pendRes] = await Promise.all([
        api.get(`/vacations/team/calendar?startDate=${startDate}&endDate=${endDate}`),
        api.get('/vacations/team/pending'),
      ]);
      setCalendarData(calRes.data.data || { requests: [], overlaps: [] });
      setPendingRequests(pendRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar calendário da equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [startDate, endDate]);

  const handleOpenAction = (req: any, type: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(req);
    setActionType(type);
    setReviewNotes(type === 'APPROVE' ? 'Aprovado pela chefia imediata.' : '');
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    if (!reviewNotes.trim()) {
      setActionError('O parecer é obrigatório');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      if (actionType === 'APPROVE') {
        await api.post(`/vacations/requests/${selectedRequest.id}/manager-approve`, {
          notes: reviewNotes,
        });
      } else {
        await api.post(`/vacations/requests/${selectedRequest.id}/manager-reject`, {
          notes: reviewNotes,
        });
      }

      setSelectedRequest(null);
      setActionType(null);
      await fetchCalendar();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Erro ao processar avaliação');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_GESTOR':
        return <Badge variant="warning" size="sm" dot>Aguardando Parecer</Badge>;
      case 'PENDENTE_RH':
        return <Badge variant="info" size="sm" dot>Em Análise RH</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Homologado / Agendado</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
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
              <Users className="w-6 h-6 text-atrio-teal" />
              Calendário de Férias da Equipe
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Visualize a grade de férias dos liderados, previna sobreposições críticas e delibere solicitações.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-atrio-border text-xs">
              <span className="text-slate-400 font-medium">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              />
              <span className="text-slate-400 font-medium">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchCalendar}
              disabled={loading}
            />
          </div>
        </div>

        {/* Alerta de Sobreposição Detectada */}
        {calendarData.overlaps?.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Atenção: {calendarData.overlaps.length} sobreposição(ões) de férias identificada(s) na equipe!</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {calendarData.overlaps.map((ov: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-white/80 rounded-lg border border-amber-200 text-amber-950">
                  <strong>{ov.employeeAName}</strong> e <strong>{ov.employeeBName}</strong> possuem férias simultâneas entre{' '}
                  <span className="font-bold underline">{formatDate(ov.overlapStartDate)} e {formatDate(ov.overlapEndDate)}</span>.
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fila de Pendências de Aprovação do Gestor */}
        <Card padding="md" className="space-y-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Solicitações Aguardando seu Parecer ({pendingRequests.length})
              </h3>
              <p className="text-xs text-atrio-text-secondary">
                Avalie o planejamento e cobertura operacional antes de aprovar.
              </p>
            </div>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <strong className="text-sm text-slate-800 font-bold">
                        {req.employee?.name}
                      </strong>
                      <span className="text-slate-400 font-mono">
                        Matrícula: {req.employee?.registrationNumber}
                      </span>
                      <span className="text-slate-500">• {req.employee?.department?.name || 'Geral'}</span>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="flex items-center gap-4 text-slate-600 font-medium">
                      <span>
                        Período: <strong className="text-atrio-navy">{formatDate(req.startDate)} a {formatDate(req.endDate)}</strong>
                      </span>
                      <span>({req.daysCount} dias de gozo)</span>
                      {req.sellDaysCount > 0 && <span>+ {req.sellDaysCount} dias abono</span>}
                      {req.advanceThirteenth && <span className="text-indigo-600 font-bold">• Adiantamento 13º</span>}
                    </div>

                    {req.notes && (
                      <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                        <strong>Observação do Colaborador:</strong> {req.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<XCircle className="w-4 h-4 text-rose-500" />}
                      onClick={() => handleOpenAction(req, 'REJECT')}
                      className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                    >
                      Rejeitar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => handleOpenAction(req, 'APPROVE')}
                    >
                      Aprovar Férias
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              Nenhuma solicitação de férias aguardando seu parecer no momento.
            </div>
          )}
        </Card>

        {/* Grade do Calendário da Equipe */}
        <Card padding="md" className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-atrio-text-primary">
              Programação de Ausências da Equipe
            </h3>
            <p className="text-xs text-atrio-text-secondary">
              Visão consolidada de todas as férias aprovadas e em andamento para o período filtrado.
            </p>
          </div>

          {calendarData.requests?.length > 0 ? (
            <div className="space-y-3">
              {calendarData.requests.map((req: any) => (
                <div
                  key={req.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <strong className="font-bold text-slate-800 text-sm">
                        {req.employee?.name}
                      </strong>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({req.employee?.department?.name || 'Geral'})
                      </span>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="text-slate-600">
                      Datas:{' '}
                      <strong className="text-atrio-navy font-semibold">
                        {formatDate(req.startDate)} a {formatDate(req.endDate)}
                      </strong>{' '}
                      ({req.daysCount} dias de gozo)
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 font-mono shrink-0">
                    Solicitado em: {formatDate(req.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum período de férias agendado para a equipe no intervalo selecionado.
            </div>
          )}
        </Card>

        {/* Modal de Avaliação do Gestor */}
        <Modal
          isOpen={Boolean(selectedRequest && actionType)}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title={actionType === 'APPROVE' ? 'Aprovar Férias do Colaborador' : 'Rejeitar Solicitação de Férias'}
          maxWidth="md"
        >
          {selectedRequest && (
            <form onSubmit={handleConfirmAction} className="space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Colaborador:</strong> {selectedRequest.employee?.name} (
                  {selectedRequest.employee?.department?.name})
                </p>
                <p>
                  <strong>Período Solicitado:</strong> {formatDate(selectedRequest.startDate)} a{' '}
                  {formatDate(selectedRequest.endDate)} ({selectedRequest.daysCount} dias)
                </p>
                {selectedRequest.sellDaysCount > 0 && (
                  <p className="text-emerald-700">
                    <strong>Abono Pecuniário:</strong> {selectedRequest.sellDaysCount} dias de venda
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Parecer da Chefia Imediata *
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Insira a justificativa ou orientações de cobertura operacional..."
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    setActionType(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancelar
                </Button>
                <Button
                  variant={actionType === 'APPROVE' ? 'primary' : 'danger'}
                  size="sm"
                  type="submit"
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? 'Processando...'
                    : actionType === 'APPROVE'
                    ? 'Confirmar Aprovação'
                    : 'Confirmar Rejeição'}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
};
