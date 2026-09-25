import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { SearchableSelect, SearchableOption } from '../ui/SearchableSelect';
import { api } from '../../services/api';

export interface CipaMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  member?: any | null;
}

const ROLE_OPTIONS = [
  { value: 'REPRESENTANTE_EMPREGADOR', label: 'Representante do Empregador' },
  { value: 'REPRESENTANTE_EMPREGADO', label: 'Representante do Empregado' },
];

export const CipaMemberModal: React.FC<CipaMemberModalProps> = ({ isOpen, onClose, onSuccess, member }) => {
  const isEditing = Boolean(member?.id);

  const [employeeOptions, setEmployeeOptions] = useState<SearchableOption[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [role, setRole] = useState('REPRESENTANTE_EMPREGADO');
  const [termStart, setTermStart] = useState('');
  const [termEnd, setTermEnd] = useState('');
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEmployeeId(member?.employeeId || '');
      setRole(member?.role || 'REPRESENTANTE_EMPREGADO');
      setTermStart(member?.termStart ? member.termStart.split('T')[0] : '');
      setTermEnd(member?.termEnd ? member.termEnd.split('T')[0] : '');
      setActive(member?.active ?? true);
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
  }, [isOpen, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = { employeeId, role, termStart, termEnd, active };

      if (isEditing) {
        await api.patch(`/workplace-safety/cipa/members/${member.id}`, payload);
      } else {
        await api.post('/workplace-safety/cipa/members', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar membro da CIPA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Membro da CIPA' : 'Novo Membro da CIPA'}
      subtitle="Comissão Interna de Prevenção de Acidentes"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <SearchableSelect
          label="Colaborador"
          required
          placeholder="Selecione o colaborador..."
          searchPlaceholder="Buscar colaborador..."
          options={employeeOptions}
          value={employeeId}
          onChange={setEmployeeId}
        />

        <Select label="Função na CIPA" value={role} onChange={(e) => setRole(e.target.value)} required options={ROLE_OPTIONS} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Início do Mandato" type="date" value={termStart} onChange={(e) => setTermStart(e.target.value)} required />
          <Input label="Término do Mandato" type="date" value={termEnd} onChange={(e) => setTermEnd(e.target.value)} required />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Membro ativo
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting || !employeeId}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Membro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
