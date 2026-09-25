import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { api } from '../../services/api';

export interface SafetyActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activity?: any | null;
}

const TYPE_OPTIONS = [
  { value: 'SIPATMA', label: 'SIPATMA' },
  { value: 'DDS', label: 'DDS (Diálogo Diário de Segurança)' },
];

export const SafetyActivityModal: React.FC<SafetyActivityModalProps> = ({ isOpen, onClose, onSuccess, activity }) => {
  const isEditing = Boolean(activity?.id);

  const [employeeOptions, setEmployeeOptions] = useState<SearchableOption[]>([]);
  const [employeeDepartmentById, setEmployeeDepartmentById] = useState<Record<string, string | null>>({});
  const [departmentOptions, setDepartmentOptions] = useState<SearchableOption[]>([]);

  const [type, setType] = useState('DDS');
  const [title, setTitle] = useState('');
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [activityDate, setActivityDate] = useState('');
  const [topics, setTopics] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(activity?.type || 'DDS');
      setTitle(activity?.title || '');
      setDepartmentIds(activity?.departmentId ? [activity.departmentId] : []);
      setActivityDate(activity?.activityDate ? activity.activityDate.split('T')[0] : '');
      setTopics(activity?.topics || '');
      setResponsibleId(activity?.responsibleId || '');
      setParticipantIds(
        !isEditing && activity?.participants
          ? activity.participants.map((p: any) => p.employeeId)
          : []
      );
      setError(null);

      Promise.all([
        api.get('/employees', { params: { pageSize: 500 } }),
        api.get('/departments'),
      ])
        .then(([empRes, deptRes]) => {
          const employees = empRes.data.data || [];
          setEmployeeDepartmentById(
            Object.fromEntries(employees.map((emp: any) => [emp.id, emp.departmentId || emp.department?.id || null]))
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
          setEmployeeDepartmentById({});
          setDepartmentOptions([]);
        });
    }
  }, [isOpen, activity, isEditing]);

  const filteredEmployeeOptions = departmentIds.length === 0
    ? employeeOptions
    : employeeOptions.filter((employee) => departmentIds.includes(employeeDepartmentById[employee.value] || ''));

  const responsibleOptions = filteredEmployeeOptions;

  useEffect(() => {
    if (responsibleId && departmentIds.length > 0 && !departmentIds.includes(employeeDepartmentById[responsibleId] || '')) {
      setResponsibleId('');
    }
  }, [departmentIds, employeeDepartmentById, responsibleId]);

  const toggleDepartment = (departmentId: string) => {
    setDepartmentIds((prev) =>
      prev.includes(departmentId) ? prev.filter((id) => id !== departmentId) : [...prev, departmentId]
    );
  };

  const toggleParticipant = (employeeId: string) => {
    setParticipantIds((prev) => (prev.includes(employeeId) ? prev.filter((id) => id !== employeeId) : [...prev, employeeId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload: any = {
        type,
        title,
        departmentId: departmentIds[0] || null,
        activityDate,
        topics: topics.trim() ? topics : null,
        responsibleId: responsibleId || null,
      };

      if (isEditing) {
        await api.patch(`/workplace-safety/activities/${activity.id}`, payload);
      } else {
        payload.participantIds = participantIds;
        await api.post('/workplace-safety/activities', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar atividade de segurança');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Atividade' : 'Nova Atividade SIPATMA/DDS'}
      subtitle="Atividade de conscientização e prevenção"
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
          <Input label="Data da Atividade" type="date" value={activityDate} onChange={(e) => setActivityDate(e.target.value)} required />
        </div>

        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Ex: DDS - Uso correto de EPIs" />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Setor(es)/Departamento(s)</label>
            <div className="max-h-32 overflow-y-auto border border-atrio-border rounded-lg bg-white p-2 space-y-1">
              {departmentOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={departmentIds.includes(option.value)}
                    onChange={() => toggleDepartment(option.value)}
                  />
                  <span className="truncate">{option.label}</span>
                </label>
              ))}
              {departmentOptions.length === 0 && <span className="text-xs text-slate-400">Carregando setores...</span>}
            </div>
            <p className="text-[11px] text-slate-400">
              {departmentIds.length === 0 ? 'Todos os setores' : `${departmentIds.length} setor(es) selecionado(s)`}
            </p>
          </div>
          <SearchableSelect
            label="Responsável"
            placeholder="Selecione o responsável..."
            searchPlaceholder="Buscar colaborador..."
            options={responsibleOptions}
            value={responsibleId}
            onChange={setResponsibleId}
          />
        </div>

        <Textarea label="Temas Abordados" value={topics} onChange={(e) => setTopics(e.target.value)} rows={2} placeholder="Assuntos tratados na atividade..." />

        {!isEditing && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Participantes</label>
            <div className="max-h-40 overflow-y-auto border border-atrio-border rounded-lg p-2 space-y-1">
              {employeeOptions.length === 0 && <p className="text-xs text-slate-400 italic">Carregando colaboradores...</p>}
              {filteredEmployeeOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-700 py-0.5">
                  <input
                    type="checkbox"
                    checked={participantIds.includes(opt.value)}
                    onChange={() => toggleParticipant(opt.value)}
                  />
                  {opt.label}
                  {opt.subLabel && <span className="text-slate-400">({opt.subLabel})</span>}
                </label>
              ))}
              {employeeOptions.length > 0 && filteredEmployeeOptions.length === 0 && (
                <p className="text-xs text-slate-400 italic">Nenhum colaborador pertence aos setores selecionados.</p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{participantIds.length} colaborador(es) selecionado(s)</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Atividade'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
