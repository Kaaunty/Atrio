import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { api } from '../../services/api';

export interface CorrectiveActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action?: any | null;
  /** When creating an action from a specific accident, pre-fill and lock sourceType/accidentId */
  fixedAccidentId?: string;
  /** When creating an action from a specific inspection, pre-fill and lock sourceType/inspectionId */
  fixedInspectionId?: string;
}

const STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'EM_ANDAMENTO', label: 'Em Andamento' },
  { value: 'CONCLUIDA', label: 'Concluída' },
];

export const CorrectiveActionModal: React.FC<CorrectiveActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  action,
  fixedAccidentId,
  fixedInspectionId,
}) => {
  const isEditing = Boolean(action?.id);

  const [employeeOptions, setEmployeeOptions] = useState<SearchableOption[]>([]);

  const [sourceType, setSourceType] = useState<'ACCIDENT' | 'INSPECTION'>('ACCIDENT');
  const [description, setDescription] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PENDENTE');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceLocked = isEditing || Boolean(fixedAccidentId) || Boolean(fixedInspectionId);

  useEffect(() => {
    if (isOpen) {
      setSourceType(action?.sourceType || (fixedInspectionId ? 'INSPECTION' : 'ACCIDENT'));
      setDescription(action?.description || '');
      setResponsibleId(action?.responsibleId || '');
      setDueDate(action?.dueDate ? action.dueDate.split('T')[0] : '');
      setStatus(action?.status || 'PENDENTE');
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
  }, [isOpen, action, fixedAccidentId, fixedInspectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (isEditing) {
        await api.patch(`/workplace-safety/corrective-actions/${action.id}`, {
          description,
          responsibleId: responsibleId || null,
          dueDate,
          status,
        });
      } else {
        await api.post('/workplace-safety/corrective-actions', {
          sourceType,
          accidentId: sourceType === 'ACCIDENT' ? action?.accidentId || fixedAccidentId : undefined,
          inspectionId: sourceType === 'INSPECTION' ? action?.inspectionId || fixedInspectionId : undefined,
          description,
          responsibleId: responsibleId || null,
          dueDate,
          status,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar ação corretiva');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Ação Corretiva' : 'Nova Ação Corretiva'}
      subtitle="Plano de ação para tratamento de não conformidades"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!sourceLocked && (
          <Select
            label="Origem"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as 'ACCIDENT' | 'INSPECTION')}
            required
            options={[
              { value: 'ACCIDENT', label: 'Acidente/Incidente' },
              { value: 'INSPECTION', label: 'Inspeção' },
            ]}
          />
        )}

        <Textarea
          label="Descrição da Ação"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="Descreva a ação corretiva a ser tomada..."
        />

        <SearchableSelect
          label="Responsável"
          placeholder="Selecione o responsável..."
          searchPlaceholder="Buscar colaborador..."
          options={employeeOptions}
          value={responsibleId}
          onChange={setResponsibleId}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Prazo" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} required options={STATUS_OPTIONS} />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Ação Corretiva'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
