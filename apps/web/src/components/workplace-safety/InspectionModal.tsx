import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { api } from '../../services/api';

export interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inspection?: any | null;
}

interface ChecklistItem {
  item: string;
  status: string;
  observation?: string;
}

const STATUS_OPTIONS = [
  { value: 'ABERTO', label: 'Aberto' },
  { value: 'EM_INVESTIGACAO', label: 'Em Investigação' },
  { value: 'CONCLUIDO', label: 'Concluído' },
];

const CHECKLIST_STATUS_OPTIONS = [
  { value: 'CONFORME', label: 'Conforme' },
  { value: 'NAO_CONFORME', label: 'Não Conforme' },
  { value: 'NAO_APLICAVEL', label: 'Não Aplicável' },
];

export const InspectionModal: React.FC<InspectionModalProps> = ({ isOpen, onClose, onSuccess, inspection }) => {
  const isEditing = Boolean(inspection?.id);

  const [employeeOptions, setEmployeeOptions] = useState<SearchableOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<SearchableOption[]>([]);
  const [employeeDepartmentById, setEmployeeDepartmentById] = useState<Record<string, string>>({});

  const [inspectorId, setInspectorId] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([{ item: '', status: 'CONFORME', observation: '' }]);
  const [irregularitiesFound, setIrregularitiesFound] = useState('');
  const [status, setStatus] = useState('ABERTO');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInspectorId(inspection?.inspectorId || '');
      setResponsibleId(inspection?.responsibleId || '');
      setDepartmentId(inspection?.departmentId || '');
      setInspectionDate(inspection?.inspectionDate ? inspection.inspectionDate.split('T')[0] : '');
      setChecklist(
        inspection?.checklist?.length ? inspection.checklist : [{ item: '', status: 'CONFORME', observation: '' }]
      );
      setIrregularitiesFound(inspection?.irregularitiesFound || '');
      setStatus(inspection?.status || 'ABERTO');
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
  }, [isOpen, inspection]);

  const responsibleOptions = departmentId
    ? employeeOptions.filter((employee) => employeeDepartmentById[employee.value] === departmentId)
    : employeeOptions;

  useEffect(() => {
    if (responsibleId && departmentId && employeeDepartmentById[responsibleId] !== departmentId) {
      setResponsibleId('');
    }
  }, [departmentId, employeeDepartmentById, responsibleId]);

  const updateChecklistItem = (index: number, field: keyof ChecklistItem, value: string) => {
    setChecklist((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const addChecklistItem = () => {
    setChecklist((prev) => [...prev, { item: '', status: 'CONFORME', observation: '' }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklist((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {
        departmentId: departmentId || null,
        inspectorId,
        inspectionDate,
        checklist: checklist.filter((c) => c.item.trim()).map((c) => ({
          item: c.item,
          status: c.status,
          observation: c.observation?.trim() ? c.observation : undefined,
        })),
        irregularitiesFound: irregularitiesFound.trim() ? irregularitiesFound : null,
        responsibleId: responsibleId || null,
        status,
      };

      if (isEditing) {
        await api.patch(`/workplace-safety/inspections/${inspection.id}`, payload);
      } else {
        await api.post('/workplace-safety/inspections', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar inspeção');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Inspeção de Segurança' : 'Nova Inspeção de Segurança'}
      subtitle="Checklist de conformidade do ambiente de trabalho"
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
          <SearchableSelect
            label="Inspetor Responsável"
            required
            placeholder="Selecione o inspetor..."
            searchPlaceholder="Buscar colaborador..."
            options={employeeOptions}
            value={inspectorId}
            onChange={setInspectorId}
          />
          <Input
            label="Data da Inspeção"
            type="date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SearchableSelect
            label="Setor/Departamento"
            placeholder="Selecione o setor..."
            searchPlaceholder="Buscar setor..."
            options={departmentOptions}
            value={departmentId}
            onChange={setDepartmentId}
          />
          <SearchableSelect
            label="Responsável pela Área"
            placeholder="Selecione o responsável..."
            searchPlaceholder="Buscar colaborador..."
            options={responsibleOptions}
            value={responsibleId}
            onChange={setResponsibleId}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">Checklist de Itens</label>
            <Button variant="ghost" size="sm" type="button" icon={<Plus className="w-3.5 h-3.5" />} onClick={addChecklistItem}>
              Adicionar Item
            </Button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {checklist.map((c, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 bg-slate-50 rounded-lg border border-atrio-border">
                <div className="col-span-5">
                  <input
                    value={c.item}
                    onChange={(e) => updateChecklistItem(index, 'item', e.target.value)}
                    placeholder="Item verificado"
                    className="w-full px-2.5 py-1.5 bg-white border border-atrio-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal/30"
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={c.status}
                    onChange={(e) => updateChecklistItem(index, 'status', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-atrio-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal/30"
                  >
                    {CHECKLIST_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <input
                    value={c.observation || ''}
                    onChange={(e) => updateChecklistItem(index, 'observation', e.target.value)}
                    placeholder="Observação"
                    className="w-full px-2.5 py-1.5 bg-white border border-atrio-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal/30"
                  />
                </div>
                <div className="col-span-1 flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => removeChecklistItem(index)}
                    className="text-rose-500 hover:text-rose-700"
                    disabled={checklist.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Textarea
          label="Irregularidades Encontradas"
          value={irregularitiesFound}
          onChange={(e) => setIrregularitiesFound(e.target.value)}
          rows={2}
          placeholder="Descreva as irregularidades identificadas na inspeção..."
        />

        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} required options={STATUS_OPTIONS} />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting || !inspectorId}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Registrar Inspeção'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
