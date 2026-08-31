import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

export const RhVacationsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais de Homologação
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRhData = async () => {
    try {
      setLoading(true);
      const [alertRes, pendRes] = await Promise.all([
        api.get('/vacations/rh/expiring-alerts'),
        api.get('/vacations/rh/pending'),
      ]);
      setAlerts(alertRes.data.data || []);
      setPendingRequests(pendRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados de férias do RH:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRhData();
  }, []);

  const handleOpenAction = (req: any, type: 'APPROVE' | 'REJECT') => {
    setSelectedRequest(req);
    setActionType(type);
    setReviewNotes(
      type === 'APPROVE'
        ? 'Homologado conforme parecer da chefia e conformidade CLT.'
        : ''
    );
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !actionType) return;

    if (!reviewNotes.trim()) {
      setActionError('O parecer do RH é obrigatório');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      if (actionType === 'APPROVE') {
        await api.post(`/vacations/requests/${selectedRequest.id}/rh-approve`, {
          notes: reviewNotes,
        });
      } else {
        await api.post(`/vacations/requests/${selectedRequest.id}/rh-reject`, {
          notes: reviewNotes,
        });
      }

      setSelectedRequest(null);
      setActionType(null);
      await fetchRhData();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Erro ao homologar férias');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getUrgencyBadge = (urgency: string, daysUntil: number) => {
    if (urgency === 'VENCIDO') {
      return <Badge variant="danger" size="sm" dot>Vencido ({Math.abs(daysUntil)}d atrás)</Badge>;
    }
    if (urgency === 'CRITICO') {
      return <Badge variant="danger" size="sm" dot>Crítico (Vence em {daysUntil}d)</Badge>;
    }
    if (urgency === 'ALERTA') {
      return <Badge variant="warning" size="sm" dot>Alerta (Vence em {daysUntil}d)</Badge>;
    }
    return <Badge variant="neutral" size="sm">Normal</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_RH':
        return <Badge variant="info" size="sm" dot>Pronto para Homologação</Badge>;
      case 'PENDENTE_GESTOR':
        return <Badge variant="warning" size="sm" dot>Com Gestor</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Homologado</Badge>;
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
              <ShieldCheck className="w-6 h-6 text-atrio-teal" />
              Painel de Gestão de Férias (RH)
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Monitore prazos concessivos para evitar passivos trabalhistas e homologue férias da empresa.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchRhData}
            disabled={loading}
          >
            Atualizar Painel
          </Button>
        </div>

        {/* Alertas de Vencimento de Período Concessivo */}
        <Card padding="md" className="space-y-4 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Alertas de Vencimento Concessivo ({alerts.length})
              </h3>
              <p className="text-xs text-atrio-text-secondary">
                Colaboradores com períodos aquisitivos que expiram em até 90 dias (risco de férias em dobro - CLT Art. 137).
              </p>
            </div>
          </div>

          {alerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3">Setor</th>
                    <th className="py-2.5 px-3">Gestor Imediato</th>
                    <th className="py-2.5 px-3">Período Aquisitivo</th>
                    <th className="py-2.5 px-3">Prazo Concessivo</th>
                    <th className="py-2.5 px-3 text-center">Saldo Restante</th>
                    <th className="py-2.5 px-3">Urgência</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alerts.map((alt: any) => (
                    <tr key={alt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-800 font-bold">{alt.employee?.name}</strong>
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Matrícula: {alt.employee?.registrationNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{alt.employee?.department?.name || 'Geral'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{alt.employee?.manager?.name || 'Diretoria'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {formatDate(alt.vestingStartDate)} a {formatDate(alt.vestingEndDate)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        {formatDate(alt.deadlineDate)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                        {alt.daysRemaining} dias
                      </td>
                      <td className="py-2.5 px-3">{getUrgencyBadge(alt.urgencyLevel, alt.daysUntilDeadline)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs">
              Excelente! Nenhum colaborador com férias próximas do vencimento concessivo.
            </div>
          )}
        </Card>

        {/* Fila Central de Homologação */}
        <Card padding="md" className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-atrio-teal" />
              Fila Central de Homologação de Férias ({pendingRequests.length})
            </h3>
            <p className="text-xs text-atrio-text-secondary">
              Solicitações com parecer da chefia imediata aguardando lançamento e homologação do RH.
            </p>
          </div>

          {pendingRequests.length > 0 ? (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-slate-300 transition-colors"
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
                        Período:{' '}
                        <strong className="text-atrio-navy font-bold">
                          {formatDate(req.startDate)} a {formatDate(req.endDate)}
                        </strong>
                      </span>
                      <span>({req.daysCount} dias de gozo)</span>
                      {req.sellDaysCount > 0 && <span>+ {req.sellDaysCount} dias de abono pecuniário</span>}
                      {req.advanceThirteenth && <span className="text-indigo-600 font-bold">• 13º Adiantado</span>}
                    </div>

                    {req.managerNotes && (
                      <p className="text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Parecer do Gestor ({req.manager?.name || 'Gestor'}):</strong>{' '}
                          {req.managerNotes}
                        </span>
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
                      Homologar Férias
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma solicitação de férias aguardando homologação no momento.
            </div>
          )}
        </Card>

        {/* Modal de Homologação do RH */}
        <Modal
          isOpen={Boolean(selectedRequest && actionType)}
          onClose={() => {
            setSelectedRequest(null);
            setActionType(null);
          }}
          title={actionType === 'APPROVE' ? 'Homologar e Agendar Férias (RH)' : 'Rejeitar Solicitação de Férias'}
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
                  <strong>Período:</strong> {formatDate(selectedRequest.startDate)} a{' '}
                  {formatDate(selectedRequest.endDate)} ({selectedRequest.daysCount} dias)
                </p>
                {selectedRequest.managerNotes && (
                  <p className="text-blue-700">
                    <strong>Parecer do Gestor:</strong> {selectedRequest.managerNotes}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Parecer da Homologação (RH) *
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Insira o despacho do RH para homologação e auditoria legal..."
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
                    ? 'Homologando...'
                    : actionType === 'APPROVE'
                    ? 'Confirmar Homologação'
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
