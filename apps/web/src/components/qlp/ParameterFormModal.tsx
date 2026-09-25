import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { api } from '../../services/api';
import {
  CONTRACT_TYPE_OPTIONS,
  LABOR_CLASSIFICATION_OPTIONS,
  SHIFT_TYPE_OPTIONS,
} from './qlpConstants';

interface DepartmentOption {
  id: string;
  name: string;
}

interface PositionOption {
  id: string;
  title: string;
}

export interface ParameterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  parameter?: any | null;
}

const emptyForm = () => ({
  departmentId: '',
  positionId: '',
  shiftType: '',
  laborClassification: 'DIRETA',
  minQuantity: '0',
  plannedQuantity: '0',
  maxQuantity: '0',
  allowedContractTypes: ['CLT'] as string[],
  effectiveFrom: new Date().toISOString().split('T')[0],
  effectiveTo: '',
  active: true,
});

export const ParameterFormModal: React.FC<ParameterFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  parameter,
}) => {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(parameter?.id);

  useEffect(() => {
    if (!isOpen) return;

    api
      .get('/departments', { params: { active: 'true' } })
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]));

    setError(null);

    if (parameter) {
      setForm({
        departmentId: parameter.departmentId || parameter.department?.id || '',
        positionId: parameter.positionId || parameter.position?.id || '',
        shiftType: parameter.shiftType || '',
        laborClassification: parameter.laborClassification || 'DIRETA',
        minQuantity: String(parameter.minQuantity ?? 0),
        plannedQuantity: String(parameter.plannedQuantity ?? 0),
        maxQuantity: String(parameter.maxQuantity ?? 0),
        allowedContractTypes:
          parameter.allowedContractTypes && parameter.allowedContractTypes.length > 0
            ? parameter.allowedContractTypes
            : ['CLT'],
        effectiveFrom: (parameter.effectiveFrom || '').split('T')[0] || new Date().toISOString().split('T')[0],
        effectiveTo: parameter.effectiveTo ? parameter.effectiveTo.split('T')[0] : '',
        active: parameter.active ?? true,
      });
    } else {
      setForm(emptyForm());
    }
  }, [isOpen, parameter]);

  useEffect(() => {
    if (!isOpen) return;
    if (!form.departmentId) {
      setPositions([]);
      return;
    }
    api
      .get('/positions', { params: { departmentId: form.departmentId, pageSize: 200, active: 'true' } })
      .then((res) => setPositions(res.data.data || []))
      .catch(() => setPositions([]));
  }, [isOpen, form.departmentId]);

  const toggleContractType = (value: string) => {
    setForm((prev) => {
      const has = prev.allowedContractTypes.includes(value);
      const next = has
        ? prev.allowedContractTypes.filter((v) => v !== value)
        : [...prev.allowedContractTypes, value];
      return { ...prev, allowedContractTypes: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const minQuantity = parseInt(form.minQuantity, 10) || 0;
    const plannedQuantity = parseInt(form.plannedQuantity, 10) || 0;
    const maxQuantity = parseInt(form.maxQuantity, 10) || 0;

    if (minQuantity > plannedQuantity) {
      setError('A quantidade mínima não pode ser maior que a quantidade ideal');
      return;
    }
    if (plannedQuantity > maxQuantity) {
      setError('A quantidade ideal não pode ser maior que a quantidade máxima');
      return;
    }
    if (form.allowedContractTypes.length === 0) {
      setError('Selecione ao menos um tipo de vínculo permitido');
      return;
    }

    const payload: Record<string, any> = {
      departmentId: form.departmentId,
      positionId: form.positionId || null,
      shiftType: form.shiftType || null,
      laborClassification: form.laborClassification,
      minQuantity,
      plannedQuantity,
      maxQuantity,
      allowedContractTypes: form.allowedContractTypes,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      active: form.active,
    };

    try {
      setSubmitting(true);
      if (isEditing) {
        await api.patch(`/qlp/parameters/${parameter.id}`, payload);
      } else {
        await api.post('/qlp/parameters', payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar parâmetro de dimensionamento');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Parâmetro de Dimensionamento' : 'Novo Parâmetro de Dimensionamento'}
      subtitle="Defina as quantidades mínima, ideal e máxima permitidas para a função/setor"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Setor"
            required
            value={form.departmentId}
            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, positionId: '' }))}
          >
            <option value="">Selecione o setor...</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>

          <Select
            label="Função (opcional)"
            value={form.positionId}
            onChange={(e) => setForm((f) => ({ ...f, positionId: e.target.value }))}
            disabled={!form.departmentId}
          >
            <option value="">Todas as funções do setor</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Turno (opcional)"
            value={form.shiftType}
            onChange={(e) => setForm((f) => ({ ...f, shiftType: e.target.value }))}
          >
            <option value="">Todos os turnos</option>
            {SHIFT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            label="Classificação de Mão de Obra"
            required
            value={form.laborClassification}
            onChange={(e) => setForm((f) => ({ ...f, laborClassification: e.target.value }))}
          >
            {LABOR_CLASSIFICATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Quantidade Mínima"
            type="number"
            min={0}
            required
            value={form.minQuantity}
            onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))}
          />
          <Input
            label="Quantidade Ideal"
            type="number"
            min={0}
            required
            value={form.plannedQuantity}
            onChange={(e) => setForm((f) => ({ ...f, plannedQuantity: e.target.value }))}
          />
          <Input
            label="Quantidade Máxima"
            type="number"
            min={0}
            required
            value={form.maxQuantity}
            onChange={(e) => setForm((f) => ({ ...f, maxQuantity: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-atrio-text-primary mb-1.5">
            Tipos de Vínculo Permitidos *
          </label>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_TYPE_OPTIONS.map((o) => {
              const active = form.allowedContractTypes.includes(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggleContractType(o.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-atrio-teal text-white border-atrio-teal'
                      : 'bg-white text-slate-600 border-atrio-border hover:bg-slate-50'
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Vigência - Início"
            type="date"
            required
            value={form.effectiveFrom}
            onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
          />
          <Input
            label="Vigência - Fim (opcional)"
            type="date"
            value={form.effectiveTo}
            onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="rounded border-atrio-border text-atrio-teal focus:ring-atrio-teal"
          />
          Parâmetro ativo
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting || !form.departmentId}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Parâmetro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
