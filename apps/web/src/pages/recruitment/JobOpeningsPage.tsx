import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Pencil,
  ClipboardList,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { JobRequisitionModal } from '../../components/recruitment/JobRequisitionModal';
import { ReviewRequisitionModal } from '../../components/recruitment/ReviewRequisitionModal';
import { JobOpeningModal } from '../../components/recruitment/JobOpeningModal';

const REQUISITION_STATUS_BADGE = (status: string) => {
  switch (status) {
    case 'PENDENTE':
      return <Badge variant="warning" size="sm" dot>Pendente</Badge>;
    case 'APROVADA':
      return <Badge variant="success" size="sm">Aprovada</Badge>;
    case 'REJEITADA':
      return <Badge variant="danger" size="sm">Rejeitada</Badge>;
    default:
      return <Badge variant="neutral" size="sm">{status}</Badge>;
  }
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

export const JobOpeningsPage: React.FC = () => {
  const { hasPermission } = useAuth();

  const canReview = hasPermission('recrutamento.aprovar');
  const canManageOpenings = hasPermission('recrutamento.gerenciar');
  const canSolicit = hasPermission('recrutamento.solicitar');

  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [openings, setOpenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);

  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [editingOpening, setEditingOpening] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const requests: Promise<any>[] = [api.get('/recruitment/openings')];

      if (canReview) {
        requests.push(api.get('/recruitment/requisitions/pending'));
      } else if (canSolicit) {
        requests.push(api.get('/recruitment/requisitions/me'));
      } else {
        requests.push(Promise.resolve({ data: { data: [] } }));
      }

      const [openingsRes, requisitionsRes] = await Promise.all(requests);
      setOpenings(openingsRes.data.data || []);
      setRequisitions(requisitionsRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar vagas e solicitações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const openReview = (req: any, action: 'approve' | 'reject') => {
    setReviewTarget(req);
    setReviewAction(action);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-atrio-teal" />
              Vagas e Solicitações
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Gerencie solicitações de vagas e o ciclo de vida das vagas abertas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchData}
              disabled={loading}
            >
              Atualizar
            </Button>
            {canSolicit && (
              <Button variant="teal" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowRequisitionModal(true)}>
                Nova Solicitação
              </Button>
            )}
            {canManageOpenings && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingOpening(null);
                  setShowOpeningModal(true);
                }}
              >
                Nova Vaga
              </Button>
            )}
          </div>
        </div>

        {(canReview || canSolicit) && (
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-atrio-teal" />
              {canReview ? `Solicitações Pendentes (${requisitions.length})` : `Minhas Solicitações (${requisitions.length})`}
            </h3>

            {requisitions.length > 0 ? (
              <div className="space-y-3">
                {requisitions.map((req: any) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <strong className="text-sm text-slate-800 font-bold">{req.department?.name || 'Setor'}</strong>
                        <span className="text-slate-500">{req.requestedQuantity} vaga(s) • {req.contractType}</span>
                        {REQUISITION_STATUS_BADGE(req.status)}
                      </div>
                      <p className="text-slate-600">{req.justification}</p>
                      {req.workforceRequestId && (
                        <p className="text-blue-700">
                          <strong>Originado do QLP:</strong>{' '}
                          <span className="font-mono">{req.workforceRequestId}</span>
                        </p>
                      )}
                    </div>

                    {canReview && req.status === 'PENDENTE' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<XCircle className="w-4 h-4 text-rose-500" />}
                          onClick={() => openReview(req, 'reject')}
                          className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                        >
                          Rejeitar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          onClick={() => openReview(req, 'approve')}
                        >
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">Nenhuma solicitação encontrada.</div>
            )}
          </Card>
        )}

        <Card padding="md" className="space-y-4">
          <h3 className="text-sm font-bold text-atrio-text-primary flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-atrio-teal" />
            Vagas ({openings.length})
          </h3>

          {openings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Título</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Interna</th>
                    <th className="py-2.5 px-3">Prazo</th>
                    <th className="py-2.5 px-3">Origem</th>
                    {canManageOpenings && <th className="py-2.5 px-3 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openings.map((opening: any) => (
                    <tr key={opening.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <strong className="text-slate-800 font-bold">{opening.title}</strong>
                      </td>
                      <td className="py-2.5 px-3">{OPENING_STATUS_BADGE(opening.status)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{opening.isInternal ? 'Sim' : 'Não'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(opening.deadline)}</td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {opening.jobRequisition?.workforceRequestId ? (
                          <span className="text-blue-700 font-mono text-[10px]">
                            QLP: {opening.jobRequisition.workforceRequestId}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      {canManageOpenings && (
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setEditingOpening(opening);
                              setShowOpeningModal(true);
                            }}
                          >
                            Editar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">Nenhuma vaga cadastrada.</div>
          )}
        </Card>

        <JobRequisitionModal
          isOpen={showRequisitionModal}
          onClose={() => setShowRequisitionModal(false)}
          onSuccess={fetchData}
        />

        <ReviewRequisitionModal
          isOpen={Boolean(reviewTarget && reviewAction)}
          onClose={() => {
            setReviewTarget(null);
            setReviewAction(null);
          }}
          onSuccess={fetchData}
          requisition={reviewTarget}
          action={reviewAction}
        />

        <JobOpeningModal
          isOpen={showOpeningModal}
          onClose={() => {
            setShowOpeningModal(false);
            setEditingOpening(null);
          }}
          onSuccess={fetchData}
          opening={editingOpening}
        />
      </div>
    </AppLayout>
  );
};
