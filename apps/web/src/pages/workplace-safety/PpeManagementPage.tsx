import React, { useState, useEffect, useCallback } from 'react';
import { HardHat, Plus, Package, TrendingDown, Truck, Edit2, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { PpeModal } from '../../components/workplace-safety/PpeModal';
import { PpeDeliveryModal } from '../../components/workplace-safety/PpeDeliveryModal';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const MOVEMENT_LABELS: Record<string, string> = {
  ENTREGA: 'Entrega',
  SUBSTITUICAO: 'Substituição',
  DEVOLUCAO: 'Devolução',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

export const PpeManagementPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('seguranca-trabalho.gerenciar');

  const [ppes, setPpes] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ppeModalOpen, setPpeModalOpen] = useState(false);
  const [editingPpe, setEditingPpe] = useState<any | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ppesRes, deliveriesRes] = await Promise.all([
        api.get('/workplace-safety/ppes'),
        api.get('/workplace-safety/ppes/deliveries'),
      ]);
      setPpes(ppesRes.data.data || []);
      setDeliveries(deliveriesRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao carregar EPIs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEdit = (ppe: any) => {
    setEditingPpe(ppe);
    setPpeModalOpen(true);
  };

  const handleNew = () => {
    setEditingPpe(null);
    setPpeModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/workplace-safety/ppes/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao excluir EPI');
    } finally {
      setDeleting(false);
    }
  };

  const totalStock = ppes.reduce((sum, p) => sum + (p.stockQuantity || 0), 0);
  const lowStockCount = ppes.filter((p) => p.active && p.stockQuantity <= 5).length;
  const activeCount = ppes.filter((p) => p.active).length;

  return (
    <AppLayout title="Gestão de EPIs" subtitle="Equipamentos de Proteção Individual, entregas e controle de estoque">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-atrio-teal/10 flex items-center justify-center">
              <HardHat className="w-5 h-5 text-atrio-teal" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-atrio-navy">EPIs e Movimentações</h1>
              <p className="text-xs text-slate-500">Cadastro, estoque e histórico de entregas</p>
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" icon={<Truck className="w-4 h-4" />} onClick={() => setDeliveryModalOpen(true)}>
                Registrar Movimentação
              </Button>
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleNew}>
                Novo EPI
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-atrio-teal/10 flex items-center justify-center">
                <Package className="w-4.5 h-4.5 text-atrio-teal" />
              </div>
              <div>
                <p className="text-xs text-slate-500">EPIs Cadastrados</p>
                <p className="text-xl font-bold text-atrio-navy">{activeCount}</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-atrio-navy/10 flex items-center justify-center">
                <Package className="w-4.5 h-4.5 text-atrio-navy" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total em Estoque</p>
                <p className="text-xl font-bold text-atrio-navy">{totalStock}</p>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingDown className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Estoque Baixo (≤5)</p>
                <p className="text-xl font-bold text-atrio-navy">{lowStockCount}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card padding="none">
          <div className="p-4 border-b border-atrio-border">
            <h2 className="text-sm font-bold text-atrio-navy">Catálogo de EPIs</h2>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-400">Carregando...</div>
          ) : ppes.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Nenhum EPI cadastrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-atrio-border text-left text-xs text-slate-500">
                    <th className="p-3 font-semibold">Nome</th>
                    <th className="p-3 font-semibold">CA</th>
                    <th className="p-3 font-semibold">Categoria</th>
                    <th className="p-3 font-semibold">Estoque</th>
                    <th className="p-3 font-semibold">Status</th>
                    {canManage && <th className="p-3 font-semibold text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {ppes.map((p) => (
                    <tr key={p.id} className="border-b border-atrio-border last:border-0">
                      <td className="p-3 font-medium text-atrio-navy">{p.name}</td>
                      <td className="p-3 text-slate-600">{p.ca || '-'}</td>
                      <td className="p-3 text-slate-600">{p.category}</td>
                      <td className="p-3">
                        <Badge variant={p.stockQuantity <= 5 ? 'danger' : 'success'} size="sm" dot>
                          {p.stockQuantity} un.
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={p.active ? 'success' : 'neutral'} size="sm">
                          {p.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      {canManage && (
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleEdit(p)} className="p-1.5 text-slate-500 hover:text-atrio-teal rounded-lg hover:bg-slate-100">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card padding="none">
          <div className="p-4 border-b border-atrio-border">
            <h2 className="text-sm font-bold text-atrio-navy">Histórico de Movimentações</h2>
          </div>
          {deliveries.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400">Nenhuma movimentação registrada.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-atrio-border text-left text-xs text-slate-500">
                    <th className="p-3 font-semibold">Colaborador</th>
                    <th className="p-3 font-semibold">EPI</th>
                    <th className="p-3 font-semibold">Tipo</th>
                    <th className="p-3 font-semibold">Qtd.</th>
                    <th className="p-3 font-semibold">Data</th>
                    <th className="p-3 font-semibold">Assinatura</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((d) => (
                    <tr key={d.id} className="border-b border-atrio-border last:border-0">
                      <td className="p-3 font-medium text-atrio-navy">{d.employee?.name || '-'}</td>
                      <td className="p-3 text-slate-600">{d.ppe?.name || '-'}</td>
                      <td className="p-3">
                        <Badge variant="info" size="sm">
                          {MOVEMENT_LABELS[d.movementType] || d.movementType}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-600">{d.quantity}</td>
                      <td className="p-3 text-slate-600">{formatDate(d.deliveryDate)}</td>
                      <td className="p-3">
                        <Badge variant={d.signatureConfirmed ? 'success' : 'warning'} size="sm">
                          {d.signatureConfirmed ? 'Confirmada' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <PpeModal
        isOpen={ppeModalOpen}
        onClose={() => setPpeModalOpen(false)}
        onSuccess={fetchData}
        ppe={editingPpe}
      />
      <PpeDeliveryModal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        onSuccess={fetchData}
        ppes={ppes.filter((p) => p.active)}
      />
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir EPI"
        description={`Tem certeza que deseja excluir o EPI "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        variant="danger"
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default PpeManagementPage;
