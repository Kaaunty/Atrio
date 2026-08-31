import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  AlertCircle,
  Send
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { WorkflowStepper } from '../../components/requests/WorkflowStepper';
import { api } from '../../services/api';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [canReview, setCanReview] = useState<boolean>(false);

  // Modais de Ação
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Novo comentário avulso
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/requests/${id}`);
      setData(res.data.data.request);
      setCanReview(res.data.data.canReview);
    } catch (err) {
      console.error('Erro ao carregar detalhes da solicitação:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  const handleOpenAction = (type: 'APPROVE' | 'REJECT') => {
    setActionType(type);
    setReviewComment(type === 'APPROVE' ? 'Etapa aprovada com sucesso.' : '');
    setActionError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !actionType) return;

    if (!reviewComment.trim()) {
      setActionError('O parecer é obrigatório');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      if (actionType === 'APPROVE') {
        await api.post(`/requests/${id}/approve`, { comment: reviewComment });
      } else {
        await api.post(`/requests/${id}/reject`, { comment: reviewComment });
      }

      setActionType(null);
      await fetchDetails();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Erro ao processar ação');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newComment.trim()) return;

    try {
      setCommentLoading(true);
      await api.post(`/requests/${id}/comment`, { comment: newComment });
      setNewComment('');
      await fetchDetails();
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    } finally {
      setCommentLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!id || !confirm('Tem certeza que deseja cancelar esta solicitação?')) return;
    try {
      await api.post(`/requests/${id}/cancel`);
      await fetchDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cancelar solicitação');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_GESTOR':
        return <Badge variant="warning" size="md" dot>Aguardando Gestor</Badge>;
      case 'AGUARDANDO_RH':
        return <Badge variant="info" size="md" dot>Em Análise RH</Badge>;
      case 'EM_ANDAMENTO':
        return <Badge variant="teal" size="md" dot>Em Andamento</Badge>;
      case 'ABERTO':
        return <Badge variant="neutral" size="md" dot>Aberto</Badge>;
      case 'CONCLUIDO':
      case 'APROVADO':
        return <Badge variant="success" size="md" dot>Concluído</Badge>;
      case 'REJEITADO':
        return <Badge variant="danger" size="md" dot>Rejeitado</Badge>;
      case 'CANCELADO':
        return <Badge variant="neutral" size="md">Cancelado</Badge>;
      default:
        return <Badge variant="neutral" size="md">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENTE':
        return <Badge variant="danger" size="md">Prioridade Urgente</Badge>;
      case 'ALTA':
        return <Badge variant="warning" size="md">Prioridade Alta</Badge>;
      case 'MEDIA':
        return <Badge variant="info" size="md">Prioridade Média</Badge>;
      case 'BAIXA':
        return <Badge variant="neutral" size="md">Prioridade Baixa</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-slate-400">
          Carregando detalhes da solicitação...
        </div>
      </AppLayout>
    );
  }

  if (!data) {
    return (
      <AppLayout>
        <Card padding="lg" className="text-center py-16 text-slate-400">
          Solicitação não encontrada.
        </Card>
      </AppLayout>
    );
  }

  const steps = data.workflow?.steps || [];
  const isFinished = ['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(data.status);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Barra Superior de Navegação */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/solicitacoes')}
            className="text-xs font-bold text-slate-500 hover:text-atrio-navy flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar para Solicitações
          </button>

          {!isFinished && (
            <button
              type="button"
              onClick={handleCancelRequest}
              className="text-xs font-semibold text-rose-500 hover:text-rose-700 hover:underline"
            >
              Cancelar Solicitação
            </button>
          )}
        </div>

        {/* Cabeçalho da Solicitação */}
        <div className="bg-white border border-atrio-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-atrio-navy text-white font-mono text-xs font-bold">
                  {data.requestNumber}
                </span>
                <span className="text-xs text-atrio-text-secondary font-medium">
                  {data.requestType?.name}
                </span>
              </div>
              <h1 className="text-xl font-bold text-atrio-text-primary tracking-tight">
                {data.title}
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              {getStatusBadge(data.status)}
              {getPriorityBadge(data.priority)}
            </div>
          </div>

          {/* Stepper Visual da Esteira de Aprovação */}
          {steps.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <WorkflowStepper
                steps={steps}
                currentStepOrder={data.currentStepOrder}
                status={data.status}
              />
            </div>
          )}
        </div>

        {/* Grade de Conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Coluna Principal: Respostas e Detalhes (2 colunas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Informações do Solicitante */}
            <Card padding="md" className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary">
                Dados do Solicitante
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Nome:</span>{' '}
                  <strong className="text-slate-800">{data.requester?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Matrícula:</span>{' '}
                  <span className="font-mono font-bold text-slate-700">{data.requester?.registrationNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400">Setor:</span>{' '}
                  <span className="text-slate-700">{data.requester?.department?.name || 'Geral'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Cargo:</span>{' '}
                  <span className="text-slate-700">{data.requester?.position?.title || 'Colaborador'}</span>
                </div>
              </div>
            </Card>

            {/* Respostas do Formulário */}
            {data.formData && Object.keys(data.formData).length > 0 && (
              <Card padding="md" className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary">
                  Informações Preenchidas
                </h3>
                <div className="space-y-3 divide-y divide-slate-100 text-xs">
                  {Object.entries(data.formData).map(([key, val]: [string, any]) => (
                    <div key={key} className="pt-2 first:pt-0">
                      <span className="font-semibold text-slate-500 capitalize">{key}:</span>
                      <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">
                        {String(val) || 'Não informado'}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Descrição Adicional */}
            {data.description && (
              <Card padding="md" className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary">
                  Observações Adicionais
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {data.description}
                </p>
              </Card>
            )}

            {/* Anexos */}
            {data.attachments && data.attachments.length > 0 && (
              <Card padding="md" className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary">
                  Documentos & Anexos ({data.attachments.length})
                </h3>
                <div className="space-y-2">
                  {data.attachments.map((att: any) => (
                    <div
                      key={att.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-atrio-teal" />
                        <span className="font-medium text-slate-700">{att.fileName}</span>
                      </div>
                      <a
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-atrio-teal hover:underline flex items-center gap-1 font-semibold"
                      >
                        Abrir Anexo <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Linha do Tempo & Histórico */}
            <Card padding="md" className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary">
                Histórico & Despachos ({data.history?.length || 0})
              </h3>

              <div className="space-y-3">
                {data.history?.map((h: any) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <strong className="text-atrio-text-primary">
                          {h.actor?.employee?.name || h.actor?.email || 'Sistema'}
                        </strong>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                          {h.action}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {formatDate(h.createdAt)}
                      </span>
                    </div>

                    {h.stepName && (
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Etapa: {h.stepName}
                      </p>
                    )}

                    {h.comment && (
                      <p className="text-slate-700 bg-white p-2 rounded border border-slate-100 leading-relaxed">
                        {h.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Formulário de Novo Comentário */}
              <form onSubmit={handleSendComment} className="pt-3 border-t border-slate-100 space-y-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicionar despacho ou mensagem interna nesta solicitação..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    type="submit"
                    icon={<Send className="w-3.5 h-3.5" />}
                    disabled={commentLoading || !newComment.trim()}
                  >
                    Enviar Mensagem
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Coluna Lateral: Painel de Ações do Aprovador (1 coluna) */}
          <div className="space-y-4">
            {canReview && !isFinished && (
              <Card padding="md" className="space-y-4 border-atrio-teal shadow-md ring-2 ring-atrio-teal/10">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-atrio-teal">
                    Ação Requerida
                  </span>
                  <h3 className="text-base font-bold text-atrio-text-primary">
                    Deliberação da Etapa
                  </h3>
                  <p className="text-xs text-atrio-text-secondary mt-0.5">
                    Você possui autorização para avaliar a etapa atual desta solicitação.
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <Button
                    variant="primary"
                    className="w-full justify-center"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => handleOpenAction('APPROVE')}
                  >
                    Aprovar Etapa
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full justify-center hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                    icon={<XCircle className="w-4 h-4 text-rose-500" />}
                    onClick={() => handleOpenAction('REJECT')}
                  >
                    Rejeitar Solicitação
                  </Button>
                </div>
              </Card>
            )}

            {/* Informações de Auditoria e Prazos */}
            <Card padding="md" className="space-y-3 text-xs text-slate-600">
              <h4 className="font-bold text-atrio-text-primary uppercase tracking-wider text-[11px]">
                Informações do Processo
              </h4>
              <div className="space-y-2 divide-y divide-slate-100">
                <div className="pt-2 first:pt-0 flex justify-between">
                  <span className="text-slate-400">Data de Abertura:</span>
                  <span className="font-mono text-slate-700">{formatDate(data.createdAt)}</span>
                </div>
                {data.closedAt && (
                  <div className="pt-2 flex justify-between">
                    <span className="text-slate-400">Data de Conclusão:</span>
                    <span className="font-mono text-slate-700">{formatDate(data.closedAt)}</span>
                  </div>
                )}
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-400">Etapa Atual:</span>
                  <span className="font-bold text-atrio-navy">
                    {data.currentStepOrder} de {steps.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Modal de Deliberação (Aprovação / Rejeição) */}
        <Modal
          isOpen={Boolean(actionType)}
          onClose={() => setActionType(null)}
          title={actionType === 'APPROVE' ? 'Aprovar Etapa da Solicitação' : 'Rejeitar Solicitação'}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmAction} className="space-y-4">
            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                Parecer da Avaliação *
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  actionType === 'APPROVE'
                    ? 'Descreva a validação ou despacho...'
                    : 'Informe o motivo da recusa para ciência do solicitante...'
                }
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
                onClick={() => setActionType(null)}
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
        </Modal>
      </div>
    </AppLayout>
  );
};
