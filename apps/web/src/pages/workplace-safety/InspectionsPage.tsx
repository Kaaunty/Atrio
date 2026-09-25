import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardCheck, Plus, Edit2, Trash2, ListPlus } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { InspectionModal } from '../../components/workplace-safety/InspectionModal';
import { CorrectiveActionModal } from '../../components/workplace-safety/CorrectiveActionModal';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_INVESTIGACAO: 'Em Andamento',
  CONCLUIDO: 'Concluído',
};

const STATUS_VARIANTS: Record<string, any> = {
  ABERTO: 'danger',
  EM_INVESTIGACAO: 'warning',
  CONCLUIDO: 'success',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export const InspectionsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seguranca-trabalho.gerenciar');

  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionInspectionId, setActionInspectionId] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/workplace-safety/inspections');
      setInspections(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar inspeções');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (inspection: any) => {
    setEditingInspection(inspection);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingInspection(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/inspections/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir inspeção');
    } finally {
      setDeleting(false);
    }
  };

  const handleNewAction = (inspectionId: string) => {
    setActionInspectionId(inspectionId);
    setActionModalOpen(true);
  };

  const openCount = inspections.filter((i) => i.status === 'ABERTO').length;
  const withIrregularities = inspections.filter((i) => i.irregularitiesFound).length;

  return (
    <AppLayout title="Inspeções de Segurança" subtitle="Checklists de conformidade e não conformidades identificadas">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-atrio-teal/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-atrio-teal" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-atrio-navy">Inspeções de Segurança</h1>
              <p className="text-xs text-slate-500">Checklist e não conformidades</p>
            </div>
          </div>
          {canManage && (
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleNew}>
              Nova Inspeção
            </Button>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="md">
            <p className="text-xs text-slate-500">Total de Inspeções</p>
            <p className="text-xl font-bold text-atrio-navy">{inspections.length}</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-slate-500">Em Aberto</p>
            <p className="text-xl font-bold text-rose-600">{openCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-slate-500">Com Irregularidades</p>
            <p className="text-xl font-bold text-amber-600">{withIrregularities}</p>
          </Card>
        </div>

        <Card padding="none">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
          ) : inspections.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Nenhuma inspeção registrada.</div>
          ) : (
            <div className="divide-y divide-atrio-border">
              {inspections.map((i) => (
                <div key={i.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={STATUS_VARIANTS[i.status] || 'neutral'} size="sm" dot>
                          {STATUS_LABELS[i.status] || i.status}
                        </Badge>
                        <span className="text-xs text-slate-500">{formatDate(i.inspectionDate)}</span>
                      </div>
                      <p className="text-sm font-medium text-atrio-navy">
                        {i.department?.name || 'Inspeção Geral'} — Inspetor: {i.inspector?.name || '-'}
                      </p>
                      {i.irregularitiesFound && (
                        <p className="text-xs text-rose-600 mt-1">Irregularidades: {i.irregularitiesFound}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">{(i.checklist as any[])?.length || 0} item(ns) no checklist</p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleNewAction(i.id)}
                          className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100"
                          title="Nova ação corretiva"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEdit(i)} className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(i)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <InspectionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchData} inspection={editingInspection} />
      <CorrectiveActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onSuccess={fetchData}
        fixedInspectionId={actionInspectionId}
      />
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Inspeção"
        description="Tem certeza que deseja excluir esta inspeção? Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default InspectionsPage;
