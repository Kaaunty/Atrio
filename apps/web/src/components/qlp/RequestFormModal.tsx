import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';
import { SHIFT_TYPE_OPTIONS, WORKFORCE_REQUEST_TYPE_OPTIONS } from './qlpConstants';

interface DepartmentOption {
  id: string;
  name: string;
}

interface PositionOption {
  id: string;
  title: string;
}

export interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = () => ({
  departmentId: '',
  positionId: '',
  shiftType: '',
  requestType: 'REPOSICAO',
  quantity: '1',
  justification: '',
});

export const RequestFormModal: React.FC<RequestFormModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm());
    setError(null);
    api
      .get('/departments', { params: { active: 'true' } })
      .then((res) => setDepartments(res.data.data || []))
      .catch(() => setDepartments([]));
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const quantity = parseInt(form.quantity, 10) || 0;
    if (quantity <= 0) {
      setError('A quantidade solicitada deve ser maior que zero');
      return;
    }
    if (form.justification.trim().length < 10) {
      setError('A justificativa deve ter ao menos 10 caracteres');
      return;
    }

    const payload = {
      departmentId: form.departmentId,
      positionId: form.positionId || null,
      shiftType: form.shiftType || null,
      requestType: form.requestType,
      quantity,
      justification: form.justification.trim(),
    };

    try {
      setSubmitting(true);
      await api.post('/qlp/requests', payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar solicitação de movimentação de quadro');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Solicitação de Movimentação de Quadro"
      subtitle="Solicite reposição, cobertura de afastamento ou ampliação de quadro"
      maxWidth="lg"
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
            <option value="">Não especificado</option>
            {SHIFT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            label="Tipo de Solicitação"
            required
            value={form.requestType}
            onChange={(e) => setForm((f) => ({ ...f, requestType: e.target.value }))}
          >
            {WORKFORCE_REQUEST_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          label="Quantidade Solicitada"
          type="number"
          min={1}
          required
          value={form.quantity}
          onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
        />

        <Textarea
          label="Justificativa"
          required
          rows={4}
          placeholder="Descreva o motivo da solicitação..."
          value={form.justification}
          onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting || !form.departmentId}>
            {submitting ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
