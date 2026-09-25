import React, { useEffect, useState } from 'react';
import { ClipboardList, RefreshCw, Plus, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { RequestFormModal } from '../../components/qlp/RequestFormModal';
import { DecisionModal } from '../../components/qlp/DecisionModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import {
  WORKFORCE_REQUEST_STATUS_OPTIONS,
  WORKFORCE_REQUEST_TYPE_OPTIONS,
  labelFor,
} from '../../components/qlp/qlpConstants';

const statusBadge = (status: string) => {
  switch (status) {
    case 'PENDENTE':
      return <Badge variant="warning" size="sm" dot>Pendente</Badge>;
    case 'APROVADO':
      return <Badge variant="success" size="sm" dot>Aprovado</Badge>;
    case 'REJEITADO':
      return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
    case 'ENCAMINHADO_RECRUTAMENTO':
      return <Badge variant="info" size="sm" dot>Encaminhado ao Recrutamento</Badge>;
    default:
      return <Badge variant="neutral" size="sm">{status}</Badge>;
  }
};

export const QlpRequestsPage: React.FC = () => {
  const { hasPermission, hasRole, user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{
    request: any;
    decision: 'APROVADO' | 'REJEITADO';
  } | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const canApprove = hasPermission('qlp.aprovar');
  const canCreate = hasPermission('qlp.solicitar');
  const isPrivileged = hasRole('ADMIN', 'RH');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/qlp/requests', { params });
      setRequests(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar solicitações de movimentação de quadro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação de movimentação de quadro?')) return;
    try {
      setCancellingId(id);
      await api.delete(`/qlp/requests/${id}`);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cancelar solicitação');
    } finally {
      setCancellingId(null);
    }
  };

  const canCancelRequest = (req: any) => {
    if (req.status !== 'PENDENTE') return false;
    if (isPrivileged) return true;
    return req.requestedById === user?.id;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-6 h-6 text-atrio-teal" />
              Solicitações de Movimentação de Quadro
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Acompanhe pedidos de reposição, cobertura de afastamento e ampliação de quadro.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchRequests}
              disabled={loading}
            >
              Atualizar
            </Button>
            {canCreate && (
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsFormOpen(true)}>
                Nova Solicitação
              </Button>
            )}
          </div>
        </div>

        <Card padding="md" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Todos os status</option>
              {WORKFORCE_REQUEST_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          {requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <strong className="text-sm text-atrio-navy font-bold">
                        {req.department?.name || '—'}
                        {req.position?.title ? ` · ${req.position.title}` : ''}
                      </strong>
                      <Badge variant="teal" size="sm">
                        {labelFor(WORKFORCE_REQUEST_TYPE_OPTIONS, req.requestType)}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {req.quantity} vaga(s)
                      </Badge>
                      {statusBadge(req.status)}
                    </div>

                    <div className="flex items-center gap-2">
                      {canApprove && req.status === 'PENDENTE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setDecisionTarget({ request: req, decision: 'APROVADO' })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDecisionTarget({ request: req, decision: 'REJEITADO' })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeitar
                          </button>
                        </>
                      )}
                      {canCancelRequest(req) && (
                        <button
                          type="button"
                          onClick={() => handleCancel(req.id)}
                          disabled={cancellingId === req.id}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline disabled:opacity-50"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <strong>Justificativa:</strong> {req.justification}
                  </p>

                  <div className="flex items-center gap-3 text-slate-400">
                    <span>
                      Solicitado por <strong className="text-slate-600">{req.requestedBy?.employee?.name || req.requestedBy?.email || '—'}</strong> em{' '}
                      {formatDate(req.createdAt)}
                    </span>
                  </div>

                  {req.decisionNote && (
                    <p className="text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200">
                      <strong>Parecer:</strong> {req.decisionNote}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma solicitação de movimentação de quadro encontrada.
            </div>
          )}
        </Card>
      </div>

      <RequestFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSuccess={fetchRequests} />

      <DecisionModal
        isOpen={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        onSuccess={fetchRequests}
        request={decisionTarget?.request || null}
        decision={decisionTarget?.decision || null}
      />
    </AppLayout>
  );
};
