import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { api } from '../../services/api';

export interface AccidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accident?: any | null;
}

const TYPE_OPTIONS = [
  { value: 'ACIDENTE', label: 'Acidente' },
  { value: 'INCIDENTE', label: 'Incidente' },
  { value: 'QUASE_ACIDENTE', label: 'Quase Acidente' },
];

const STATUS_OPTIONS = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'EM_INVESTIGACAO', label: 'Em Investigação' },
  { value: 'CONCLUIDO', label: 'Concluído' },
];

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateOnly(value?: string | null): string {
  if (!value) return '';
  return value.split('T')[0];
}

export const AccidentModal: React.FC<AccidentModalProps> = ({ isOpen, onClose, onSuccess, accident }) => {
  const isEditing = Boolean(accident?.id);

  const [employeeOptions, setEmployeeOptions] = useState<SearchableOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<SearchableOption[]>([]);
  const [employeeDepartmentById, setEmployeeDepartmentById] = useState<Record<string, string>>({});

  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [type, setType] = useState('ACIDENTE');
  const [occurredAt, setOccurredAt] = useState('');
  const [description, setDescription] = useState('');
  const [investigation, setInvestigation] = useState('');
  const [correctiveActionsSummary, setCorrectiveActionsSummary] = useState('');
  const [catNumber, setCatNumber] = useState('');
  const [catIssuedAt, setCatIssuedAt] = useState('');
  const [status, setStatus] = useState('ABERTO');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(accident?.employeeId || '');
      setDepartmentId(accident?.departmentId || '');
      setType(accident?.type || 'ACIDENTE');
      setOccurredAt(toDateTimeLocal(accident?.occurredAt));
      setDescription(accident?.description || '');
      setInvestigation(accident?.investigation || '');
      setCorrectiveActionsSummary(accident?.correctiveActionsSummary || '');
      setCatNumber(accident?.catNumber || '');
      setCatIssuedAt(toDateOnly(accident?.catIssuedAt));
      setStatus(accident?.status || 'ABERTO');
      setError(null);

      Promise.all([
        api.get('/employees', { params: { pageSize: 500 } }),
        api.get('/departments'),
      ])
        .then(([empRes, deptRes]) => {
          const employees = empRes.data.data || [];
          setEmployeeDepartmentById(
            Object.fromEntries(
              employees
                .filter((emp: any) => emp.departmentId || emp.department?.id)
                .map((emp: any) => [emp.id, emp.departmentId || emp.department.id])
            )
          );
          setEmployeeOptions(
            employees.map((emp: any) => ({
              value: emp.id,
              label: emp.name,
              subLabel: emp.registrationNumber ? `Matrícula ${emp.registrationNumber}` : undefined,
            }))
          );
          const departments = deptRes.data.data || [];
          setDepartmentOptions(departments.map((d: any) => ({ value: d.id, label: d.name })));
        })
        .catch(() => {
          setEmployeeOptions([]);
          setDepartmentOptions([]);
        });
    }
  }, [isOpen, accident]);

  useEffect(() => {
    if (!employeeId) return;
    const employeeDepartmentId = employeeDepartmentById[employeeId];
    if (employeeDepartmentId) setDepartmentId(employeeDepartmentId);
  }, [employeeId, employeeDepartmentById]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {
        departmentId: departmentId || null,
        employeeId: employeeId || null,
        type,
        occurredAt: occurredAt ? new Date(occurredAt).toISOString() : '',
        description,
        investigation: investigation.trim() ? investigation : null,
        correctiveActionsSummary: correctiveActionsSummary.trim() ? correctiveActionsSummary : null,
        catNumber: catNumber.trim() ? catNumber : null,
        catIssuedAt: catIssuedAt || null,
        status,
      };

      if (isEditing) {
        await api.patch(`/workplace-safety/accidents/${accident.id}`, payload);
      } else {
        await api.post('/workplace-safety/accidents', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar acidente/incidente');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Acidente/Incidente' : 'Registrar Acidente/Incidente'}
      subtitle="Registro de acidente, incidente ou quase acidente de trabalho"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} required options={TYPE_OPTIONS} />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Data/Hora da Ocorrência <span className="text-rose-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-atrio-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SearchableSelect
            label="Colaborador Envolvido"
            placeholder="Selecione o colaborador..."
            searchPlaceholder="Buscar colaborador..."
            options={employeeOptions}
            value={employeeId}
            onChange={setEmployeeId}
          />
          <SearchableSelect
            label="Setor/Departamento"
            placeholder="Selecione o setor..."
            searchPlaceholder="Buscar setor..."
            options={departmentOptions}
            value={departmentId}
            onChange={setDepartmentId}
          />
        </div>

        <Textarea
          label="Descrição da Ocorrência"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          placeholder="Descreva como ocorreu o acidente/incidente..."
        />

        <Textarea
          label="Investigação"
          value={investigation}
          onChange={(e) => setInvestigation(e.target.value)}
          rows={2}
          placeholder="Causas identificadas, análise da ocorrência..."
        />

        <Textarea
          label="Resumo das Ações Corretivas"
          value={correctiveActionsSummary}
          onChange={(e) => setCorrectiveActionsSummary(e.target.value)}
          rows={2}
          placeholder="Resumo das providências tomadas..."
        />

        <div className="grid grid-cols-3 gap-3">
          <Input label="Número da CAT" value={catNumber} onChange={(e) => setCatNumber(e.target.value)} placeholder="Ex: CAT-2026-0001" />
          <Input
            label="Data de Emissão da CAT"
            type="date"
            value={catIssuedAt}
            onChange={(e) => setCatIssuedAt(e.target.value)}
          />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} required options={STATUS_OPTIONS} />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Registrar Ocorrência'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
