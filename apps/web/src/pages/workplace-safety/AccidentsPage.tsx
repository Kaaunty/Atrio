import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Edit2, Trash2, ClipboardList } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AccidentModal } from '../../components/workplace-safety/AccidentModal';
import { CorrectiveActionModal } from '../../components/workplace-safety/CorrectiveActionModal';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_LABELS: Record<string, string> = {
  ACIDENTE: 'Acidente',
  INCIDENTE: 'Incidente',
  QUASE_ACIDENTE: 'Quase Acidente',
};

const TYPE_VARIANTS: Record<string, any> = {
  ACIDENTE: 'danger',
  INCIDENTE: 'warning',
  QUASE_ACIDENTE: 'info',
};

const STATUS_LABELS: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_INVESTIGACAO: 'Em Investigação',
  CONCLUIDO: 'Concluído',
};

const STATUS_VARIANTS: Record<string, any> = {
  ABERTO: 'danger',
  EM_INVESTIGACAO: 'warning',
  CONCLUIDO: 'success',
};

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AccidentsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seguranca-trabalho.gerenciar');

  const [accidents, setAccidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccident, setEditingAccident] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionAccidentId, setActionAccidentId] = useState<string | undefined>(undefined);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/workplace-safety/accidents');
      setAccidents(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar acidentes/incidentes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (accident: any) => {
    setEditingAccident(accident);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingAccident(null);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/accidents/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir registro');
    } finally {
      setDeleting(false);
    }
  };

  const handleNewAction = (accidentId: string) => {
    setActionAccidentId(accidentId);
    setActionModalOpen(true);
  };

  const openCount = accidents.filter((a) => a.status === 'ABERTO').length;
  const investigatingCount = accidents.filter((a) => a.status === 'EM_INVESTIGACAO').length;
  const accidentCount = accidents.filter((a) => a.type === 'ACIDENTE').length;

  return (
    <AppLayout title="Acidentes e Incidentes" subtitle="Registro, investigação e comunicação de acidentes de trabalho (CAT)">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-atrio-navy">Acidentes e Incidentes</h1>
              <p className="text-xs text-slate-500">Registro de ocorrências e ações corretivas</p>
            </div>
          </div>
          {canManage && (
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleNew}>
              Registrar Ocorrência
            </Button>
          )}
        </div>

        {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="md">
            <p className="text-xs text-slate-500">Acidentes Registrados</p>
            <p className="text-xl font-bold text-atrio-navy">{accidentCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-slate-500">Em Aberto</p>
            <p className="text-xl font-bold text-rose-600">{openCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-xs text-slate-500">Em Investigação</p>
            <p className="text-xl font-bold text-amber-600">{investigatingCount}</p>
          </Card>
        </div>

        <Card padding="none">
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
          ) : accidents.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Nenhuma ocorrência registrada.</div>
          ) : (
            <div className="divide-y divide-atrio-border">
              {accidents.map((a) => (
                <div key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant={TYPE_VARIANTS[a.type] || 'neutral'} size="sm" dot>
                          {TYPE_LABELS[a.type] || a.type}
                        </Badge>
                        <Badge variant={STATUS_VARIANTS[a.status] || 'neutral'} size="sm">
                          {STATUS_LABELS[a.status] || a.status}
                        </Badge>
                        {a.catNumber && <Badge variant="navy" size="sm">CAT {a.catNumber}</Badge>}
                      </div>
                      <p className="text-sm font-medium text-atrio-navy">{a.description}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {a.employee?.name ? `${a.employee.name} · ` : ''}
                        {a.department?.name ? `${a.department.name} · ` : ''}
                        {formatDateTime(a.occurredAt)}
                      </p>
                      {a.investigation && <p className="text-xs text-slate-600 mt-1.5">Investigação: {a.investigation}</p>}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleNewAction(a.id)}
                          className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100"
                          title="Nova ação corretiva"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEdit(a)} className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(a)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100">
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

      <AccidentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchData} accident={editingAccident} />
      <CorrectiveActionModal
        isOpen={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        onSuccess={fetchData}
        fixedAccidentId={actionAccidentId}
      />
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir Registro"
        description="Tem certeza que deseja excluir este registro de acidente/incidente? Esta ação não pode ser desfeita."
        variant="danger"
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default AccidentsPage;
