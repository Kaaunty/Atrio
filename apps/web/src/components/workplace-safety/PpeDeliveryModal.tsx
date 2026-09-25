import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { api } from '../../services/api';

export interface PpeDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ppes: any[];
}

const MOVEMENT_TYPES = [
  { value: 'ENTREGA', label: 'Entrega' },
  { value: 'SUBSTITUICAO', label: 'Substituição' },
  { value: 'DEVOLUCAO', label: 'Devolução' },
];

export const PpeDeliveryModal: React.FC<PpeDeliveryModalProps> = ({ isOpen, onClose, onSuccess, ppes }) => {
  const [employeeOptions, setEmployeeOptions] = useState<SearchableOption[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [ppeId, setPpeId] = useState('');
  const [movementType, setMovementType] = useState('ENTREGA');
  const [quantity, setQuantity] = useState('1');
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmployeeId('');
      setPpeId(ppes[0]?.id || '');
      setMovementType('ENTREGA');
      setQuantity('1');
      setSignatureConfirmed(false);
      setNotes('');
      setError(null);

      api
        .get('/employees', { params: { pageSize: 500 } })
        .then((res) => {
          const employees = res.data.data || [];
          setEmployeeOptions(
            employees.map((emp: any) => ({
              value: emp.id,
              label: emp.name,
              subLabel: emp.registrationNumber ? `Matrícula ${emp.registrationNumber}` : undefined,
            }))
          );
        })
        .catch(() => setEmployeeOptions([]));
    }
  }, [isOpen, ppes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !ppeId) return;

    try {
      setSubmitting(true);
      setError(null);

      await api.post('/workplace-safety/ppes/deliveries', {
        ppeId,
        employeeId,
        movementType,
        quantity: Number(quantity),
        signatureConfirmed,
        notes: notes.trim() ? notes : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar movimentação de EPI');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Movimentação de EPI"
      subtitle="Entrega, substituição ou devolução de equipamento"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Select
          label="Equipamento (EPI)"
          value={ppeId}
          onChange={(e) => setPpeId(e.target.value)}
          required
          options={ppes.map((p) => ({ value: p.id, label: `${p.name} (Estoque: ${p.stockQuantity})` }))}
        />

        <SearchableSelect
          label="Colaborador"
          required
          placeholder="Selecione o colaborador..."
          searchPlaceholder="Buscar colaborador..."
          options={employeeOptions}
          value={employeeId}
          onChange={setEmployeeId}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Tipo de Movimentação"
            value={movementType}
            onChange={(e) => setMovementType(e.target.value)}
            required
            options={MOVEMENT_TYPES}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quantidade <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-atrio-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={signatureConfirmed}
            onChange={(e) => setSignatureConfirmed(e.target.checked)}
          />
          Ciência/assinatura do colaborador confirmada
        </label>

        <Textarea
          label="Observações"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Informações adicionais sobre a movimentação..."
          rows={2}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting || !employeeId || !ppeId}>
            {submitting ? 'Registrando...' : 'Registrar Movimentação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
