import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  RefreshCw, 
  AlertCircle, 
  UserCheck 
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { api } from '../../services/api';

export const RhAdjustmentsPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('PENDENTE_RH');
  const [searchTerm, setSearchTerm] = useState('');

  // Modais de Deliberação
  const [selectedAdjustment, setSelectedAdjustment] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/time-clock/adjustments/rh');
      setItems(res.data.items || []);
    } catch (err) {
      console.error('Erro ao buscar homologações de ponto:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const handleOpenReview = (adj: any, type: 'APPROVE' | 'REJECT') => {
    setSelectedAdjustment(adj);
    setActionType(type);
    setReviewNotes(
      type === 'APPROVE'
        ? 'Homologado conforme parecer da chefia imediata e apuração CLT.'
        : ''
    );
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment || !actionType) return;

    if (!reviewNotes.trim()) {
      setActionError('O parecer do RH é obrigatório');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      if (actionType === 'APPROVE') {
        await api.post(`/time-clock/adjustments/${selectedAdjustment.id}/rh-approve`, {
          notes: reviewNotes,
        });
      } else {
        await api.post(`/time-clock/adjustments/${selectedAdjustment.id}/rh-reject`, {
          notes: reviewNotes,
        });
      }

      setSelectedAdjustment(null);
      setActionType(null);
      await fetchAdjustments();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Erro ao processar homologação');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      item.employee?.name?.toLowerCase().includes(term) ||
      item.employee?.registrationNumber?.toLowerCase().includes(term) ||
      item.employee?.department?.name?.toLowerCase().includes(term) ||
      item.reason?.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const pendingRhCount = items.filter((i) => i.status === 'PENDENTE_RH').length;
  const pendingGestorCount = items.filter((i) => i.status === 'PENDENTE_GESTOR').length;

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDENTE_RH':
        return <Badge variant="info" size="sm" dot>Aguardando RH</Badge>;
      case 'PENDENTE_GESTOR':
        return <Badge variant="warning" size="sm" dot>Aguardando Gestor</Badge>;
      case 'APROVADO':
        return <Badge variant="success" size="sm" dot>Homologado</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="sm" dot>Rejeitado</Badge>;
      case 'CANCELADO':
        return <Badge variant="neutral" size="sm">Cancelado</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getAdjustmentTypeLabel = (type: string) => {
    switch (type) {
      case 'INCLUSAO':
        return 'Inclusão de Batida';
      case 'ALTERACAO':
        return 'Alteração de Horário';
      case 'EXCLUSAO_DUPLICADA':
        return 'Excluir Duplicada';
      case 'JUSTIFICATIVA_FALTA':
        return 'Justificativa Falta';
      default:
        return type;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <ShieldCheck className="w-6 h-6 text-atrio-teal" />
              Homologação de Ajustes de Ponto (RH)
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Fila central do Recursos Humanos para validação legal, homologação e recálculo automático de espelho.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={fetchAdjustments}
            disabled={loading}
          >
            Atualizar Fila
          </Button>
        </div>

        {/* Filtros e Abas de Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 rounded-xl border border-atrio-border shadow-sm">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'PENDENTE_RH', label: `Fila RH (${pendingRhCount})` },
              { key: 'PENDENTE_GESTOR', label: `Com Gestor (${pendingGestorCount})` },
              { key: 'APROVADO', label: 'Homologados' },
              { key: 'REJEITADO', label: 'Rejeitados' },
              { key: 'ALL', label: 'Todos' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.key
                    ? 'bg-atrio-navy text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar colaborador, setor, motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
            />
          </div>
        </div>

        {/* Lista de Solicitações */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} padding="md" className="animate-pulse h-32 bg-slate-100/60" />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map((adj) => {
              const canRhReview = ['PENDENTE_RH', 'PENDENTE_GESTOR'].includes(adj.status);

              return (
                <Card
                  key={adj.id}
                  padding="md"
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-bold text-atrio-text-primary text-sm">
                        {adj.employee?.name}
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        Matrícula: {adj.employee?.registrationNumber}
                      </span>
                      <span className="text-xs text-slate-500">
                        • {adj.employee?.department?.name || 'Geral'}
                      </span>
                      {getStatusBadge(adj.status)}
                      <Badge variant="teal" size="sm">
                        {getAdjustmentTypeLabel(adj.adjustmentType)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">Data do Ponto:</span>{' '}
                        <strong className="text-slate-800">{formatDate(adj.date)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Horário Ajustado:</span>{' '}
                        <strong className="text-atrio-navy font-mono text-sm">{adj.targetTime}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Motivo:</span>{' '}
                        <span className="font-medium text-slate-700">{adj.reason}</span>
                      </div>
                    </div>

                    {adj.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong>Justificativa do Colaborador:</strong> {adj.notes}
                      </p>
                    )}

                    {adj.managerNotes && (
                      <p className="text-xs text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-200 flex items-start gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Parecer do Gestor ({adj.manager?.name || 'Gestor'}):</strong>{' '}
                          {adj.managerNotes}
                        </span>
                      </p>
                    )}

                    {adj.rhNotes && (
                      <p className="text-xs text-emerald-800 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200 flex items-start gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Parecer do RH:</strong> {adj.rhNotes}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Ações do RH */}
                  {canRhReview && (
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<XCircle className="w-4 h-4 text-rose-500" />}
                        onClick={() => handleOpenReview(adj, 'REJECT')}
                        className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                      >
                        Rejeitar
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={<CheckCircle2 className="w-4 h-4" />}
                        onClick={() => handleOpenReview(adj, 'APPROVE')}
                      >
                        Homologar
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card padding="lg" className="text-center py-16 text-slate-400">
            Nenhuma solicitação encontrada para o filtro selecionado.
          </Card>
        )}

        {/* Modal de Homologação do RH */}
        <Modal
          isOpen={Boolean(selectedAdjustment && actionType)}
          onClose={() => {
            setSelectedAdjustment(null);
            setActionType(null);
          }}
          title={
            actionType === 'APPROVE'
              ? 'Homologar Ajuste de Ponto'
              : 'Rejeitar Solicitação de Ajuste'
          }
          maxWidth="md"
        >
          {selectedAdjustment && (
            <form onSubmit={handleConfirmAction} className="space-y-4">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p>
                  <strong>Colaborador:</strong> {selectedAdjustment.employee?.name} (
                  {selectedAdjustment.employee?.department?.name})
                </p>
                <p>
                  <strong>Data:</strong> {formatDate(selectedAdjustment.date)} •{' '}
                  <strong>Horário Ajustado:</strong> {selectedAdjustment.targetTime}
                </p>
                {selectedAdjustment.managerNotes && (
                  <p className="text-blue-700">
                    <strong>Parecer do Gestor:</strong> {selectedAdjustment.managerNotes}
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
                    setSelectedAdjustment(null);
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
