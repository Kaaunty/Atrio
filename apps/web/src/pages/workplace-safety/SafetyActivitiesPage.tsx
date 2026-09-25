import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { SafetyActivityModal } from '../../components/workplace-safety/SafetyActivityModal';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  SIPATMA: 'SIPATMA',
  DDS: 'DDS',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export const SafetyActivitiesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seguranca-trabalho.gerenciar');

  const [activities, setActivities] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/workplace-safety/activities');
      setActivities(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/activities/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir atividade');
    } finally {
      setDeleting(false);
    }
  };

  const toggleAttendance = async (participantId: string, attended: boolean) => {
    try {
      await api.patch(`/workplace-safety/activities/participants/${participantId}`, { attended: !attended });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao atualizar presença');
    }
  };

  const sipatmaCount = activities.filter((a) => a.type === 'SIPATMA').length;
  const ddsCount = activities.filter((a) => a.type === 'DDS').length;

  return (
    <AppLayout title="Atividades SIPATMA/DDS" subtitle="Semana de prevenção e diálogos diários de segurança">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-atrio-teal/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-atrio-teal" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-atrio-navy">Atividades SIPATMA/DDS</h1>
              <p className="text-xs text-slate-500">{sipatmaCount} SIPATMA · {ddsCount} DDS</p>
            </div>
          </div>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingActivity(null);
                setModalOpen(true);
              }}
            >
              Nova Atividade
            </Button>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        <Card padding="none">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
          ) : activities.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Nenhuma atividade cadastrada.</div>
          ) : (
            <div className="divide-y divide-atrio-border">
              {activities.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={a.type === 'SIPATMA' ? 'navy' : 'teal'} size="sm">
                          {TYPE_LABELS[a.type] || a.type}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatDate(a.activityDate)}</span>
                      </div>
                      <p className="text-sm font-medium text-atrio-navy">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {a.department?.name ? `${a.department.name} · ` : ''}
                        {a.responsible?.name ? `Responsável: ${a.responsible.name} · ` : ''}
                        {(a.participants || []).length} participante(s)
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingActivity(a);
                            setModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {expandedId === a.id && (a.participants || []).length > 0 && (
                    <div className="mt-3 pl-3 border-l-2 border-atrio-border space-y-1.5">
                      {a.participants.map((p: any) => (
                        <div key={p.id} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{p.employee?.name || '-'}</span>
                          <button
                            onClick={() => canManage && toggleAttendance(p.id, p.attended)}
                            className={`flex items-center gap-1 ${canManage ? 'cursor-pointer' : 'cursor-default'}`}
                            disabled={!canManage}
                          >
                            {p.attended ? (
                              <Badge variant="success" size="sm" dot>
                                <UserCheck className="w-3 h-3 inline mr-1" />
                                Presente
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm" dot>
                                <UserX className="w-3 h-3 inline mr-1" />
                                Ausente
                              </Badge>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <SafetyActivityModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchData} activity={editingActivity} />
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Atividade"
        description="Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default SafetyActivitiesPage;
