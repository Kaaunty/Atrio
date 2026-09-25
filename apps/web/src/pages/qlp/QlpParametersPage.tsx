import React, { useEffect, useState } from 'react';
import { Settings2, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { ParameterFormModal } from '../../components/qlp/ParameterFormModal';
import { api } from '../../services/api';
import { LABOR_CLASSIFICATION_OPTIONS, SHIFT_TYPE_OPTIONS, labelFor } from '../../components/qlp/qlpConstants';

interface DepartmentOption {
  id: string;
  name: string;
}

export const QlpParametersPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [parameters, setParameters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParameter, setEditingParameter] = useState<any | null>(null);
  const [deletingParameter, setDeletingParameter] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api
      .get('/departments', { params: { active: 'true' } })
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]));
  }, []);

  const fetchParameters = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (departmentFilter) params.departmentId = departmentFilter;
      const res = await api.get('/qlp/parameters', { params });
      setParameters(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar parâmetros de dimensionamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParameters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departmentFilter]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleOpenCreate = () => {
    setEditingParameter(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (parameter: any) => {
    setEditingParameter(parameter);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingParameter) return;
    try {
      setDeleting(true);
      await api.delete(`/qlp/parameters/${deletingParameter.id}`);
      setDeletingParameter(null);
      await fetchParameters();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover parâmetro de dimensionamento');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-atrio-text-primary tracking-tight flex items-center gap-2.5">
              <Settings2 className="w-6 h-6 text-atrio-teal" />
              Parâmetros de Dimensionamento
            </h1>
            <p className="text-sm text-atrio-text-secondary mt-1">
              Defina as quantidades mínima, ideal e máxima de colaboradores por setor, função e turno.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              onClick={fetchParameters}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
              Novo Parâmetro
            </Button>
          </div>
        </div>

        <Card padding="md" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Setor"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="">Todos os setores</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Setor</th>
                  <th className="py-2.5 px-3">Função</th>
                  <th className="py-2.5 px-3">Turno</th>
                  <th className="py-2.5 px-3">Classificação</th>
                  <th className="py-2.5 px-3 text-center">Mín.</th>
                  <th className="py-2.5 px-3 text-center">Ideal</th>
                  <th className="py-2.5 px-3 text-center">Máx.</th>
                  <th className="py-2.5 px-3">Vigência</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parameters.map((param) => (
                  <tr key={param.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-slate-800">{param.department?.name || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-600">{param.position?.title || 'Todas'}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {param.shiftType ? labelFor(SHIFT_TYPE_OPTIONS, param.shiftType) : 'Todos'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {labelFor(LABOR_CLASSIFICATION_OPTIONS, param.laborClassification)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{param.minQuantity}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{param.plannedQuantity}</td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">{param.maxQuantity}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono">
                      {formatDate(param.effectiveFrom)}
                      {param.effectiveTo ? ` — ${formatDate(param.effectiveTo)}` : ''}
                    </td>
                    <td className="py-2.5 px-3">
                      {param.active ? (
                        <Badge variant="success" size="sm" dot>Ativo</Badge>
                      ) : (
                        <Badge variant="neutral" size="sm">Inativo</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(param)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-atrio-teal hover:bg-teal-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingParameter(param)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && parameters.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum parâmetro de dimensionamento cadastrado.
              </div>
            )}
          </div>
        </Card>
      </div>

      <ParameterFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={fetchParameters}
        parameter={editingParameter}
      />

      <ConfirmModal
        isOpen={Boolean(deletingParameter)}
        onClose={() => setDeletingParameter(null)}
        onConfirm={handleDelete}
        title="Remover Parâmetro de Dimensionamento"
        description="Tem certeza que deseja remover este parâmetro de dimensionamento? Esta ação não pode ser desfeita."
        variant="danger"
        confirmText="Remover"
        isLoading={deleting}
      />
    </AppLayout>
  );
};
