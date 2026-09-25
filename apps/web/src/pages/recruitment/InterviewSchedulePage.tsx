import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { InterviewModal } from '../../components/recruitment/InterviewModal';

export const InterviewSchedulePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('recrutamento.gerenciar');

  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingInterview, setEditingInterview] = useState<any | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/recruitment/interviews');
      setInterviews(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar entrevistas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/recruitment/interviews/${deleteTarget.id}`);
      setDeleteTarget(null);
      await fetchInterviews();
    } catch (err) {
      console.error('Erro ao excluir entrevista:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isPast = (dateStr: string) => new Date(dateStr).getTime() < Date.now();

  const sorted = [...interviews].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <CalendarClock className="w-6 h-6 text-atrio-teal" />
              Agenda de Entrevistas
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Gerencie o agendamento e o feedback das entrevistas dos processos seletivos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchInterviews}
              disabled={loading}
            >
              Atualizar
            </Button>
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingInterview(null);
                  setShowModal(true);
                }}
              >
                Agendar Entrevista
              </Button>
            )}
          </div>
        </div>

        <Card padding="md" className="space-y-4">
          <h3 className="text-sm font-bold text-atrio-text-primary">Entrevistas ({sorted.length})</h3>

          {sorted.length > 0 ? (
            <div className="space-y-3">
              {sorted.map((interview: any) => (
                <div
                  key={interview.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <strong className="text-sm text-slate-800 font-bold">
                        {interview.application?.candidate?.name || 'Candidato'}
                      </strong>
                      <span className="text-slate-500">{interview.application?.jobOpening?.title || 'Vaga'}</span>
                      {isPast(interview.scheduledAt) ? (
                        <Badge variant="neutral" size="sm">Realizada</Badge>
                      ) : (
                        <Badge variant="info" size="sm" dot>Agendada</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-slate-600 font-medium flex-wrap">
                      <span className="font-mono">{formatDateTime(interview.scheduledAt)}</span>
                      {interview.location && <span>Local: {interview.location}</span>}
                      {Array.isArray(interview.interviewers) && interview.interviewers.length > 0 && (
                        <span>
                          Entrevistador(es): {interview.interviewers.map((i: any) => i.name).join(', ')}
                        </span>
                      )}
                    </div>

                    {interview.feedback && (
                      <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <strong>Feedback:</strong> {interview.feedback}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Pencil className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setEditingInterview(interview);
                          setShowModal(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                        onClick={() => setDeleteTarget(interview)}
                        className="hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                      >
                        Excluir
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">Nenhuma entrevista agendada.</div>
          )}
        </Card>

        <InterviewModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingInterview(null);
          }}
          onSuccess={fetchInterviews}
          interview={editingInterview}
        />

        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Excluir Entrevista"
          description="Tem certeza que deseja excluir este agendamento de entrevista? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          cancelText="Cancelar"
          variant="danger"
          isLoading={deleteLoading}
        />
      </div>
    </AppLayout>
  );
};
