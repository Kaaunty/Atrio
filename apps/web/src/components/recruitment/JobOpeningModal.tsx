import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

export interface JobOpeningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  opening?: any | null;
}

export const JobOpeningModal: React.FC<JobOpeningModalProps> = ({ isOpen, onClose, onSuccess, opening }) => {
  const isEdit = Boolean(opening?.id);

  const [approvedRequisitions, setApprovedRequisitions] = useState<any[]>([]);
  const [jobRequisitionId, setJobRequisitionId] = useState('');
  const [title, setTitle] = useState('');
  const [requirements, setRequirements] = useState('');
  const [activities, setActivities] = useState('');
  const [conditions, setConditions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [status, setStatus] = useState('ABERTA');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    if (isEdit && opening) {
      setJobRequisitionId(opening.jobRequisitionId || '');
      setTitle(opening.title || '');
      setRequirements(opening.requirements || '');
      setActivities(opening.activities || '');
      setConditions(opening.conditions || '');
      setDeadline(opening.deadline ? String(opening.deadline).split('T')[0] : '');
      setIsInternal(Boolean(opening.isInternal));
      setStatus(opening.status || 'ABERTA');
    } else {
      setJobRequisitionId('');
      setTitle('');
      setRequirements('');
      setActivities('');
      setConditions('');
      setDeadline('');
      setIsInternal(false);
      setStatus('ABERTA');
    }

    if (!isEdit) {
      const fetchApproved = async () => {
        try {
          const res = await api.get('/recruitment/requisitions', { params: { status: 'APROVADA' } });
          setApprovedRequisitions(res.data.data || []);
        } catch (err) {
          console.error('Erro ao carregar solicitações aprovadas:', err);
        }
      };
      fetchApproved();
    }
  }, [isOpen, isEdit, opening]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (title.trim().length < 3) {
      setError('O título da vaga deve ter pelo menos 3 caracteres');
      return;
    }
    if (requirements.trim().length < 3) {
      setError('Os requisitos da vaga são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEdit) {
        await api.patch(`/recruitment/openings/${opening.id}`, {
          title: title.trim(),
          requirements: requirements.trim(),
          activities: activities.trim() || undefined,
          conditions: conditions.trim() || undefined,
          deadline: deadline || undefined,
          isInternal,
          status,
        });
      } else {
        await api.post('/recruitment/openings', {
          jobRequisitionId: jobRequisitionId || undefined,
          title: title.trim(),
          requirements: requirements.trim(),
          activities: activities.trim() || undefined,
          conditions: conditions.trim() || undefined,
          deadline: deadline || undefined,
          isInternal,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar vaga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Vaga' : 'Criar Nova Vaga'}
      subtitle={
        isEdit
          ? undefined
          : 'Crie a partir de uma solicitação já aprovada ou diretamente, sem solicitação prévia'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isEdit && (
          <Select
            label="Solicitação de Vaga Aprovada (opcional)"
            value={jobRequisitionId}
            onChange={(e) => setJobRequisitionId(e.target.value)}
          >
            <option value="">Criar vaga diretamente, sem solicitação vinculada</option>
            {approvedRequisitions.map((req) => (
              <option key={req.id} value={req.id}>
                {req.department?.name || 'Setor'} — {req.requestedQuantity} vaga(s) — {req.contractType}
              </option>
            ))}
          </Select>
        )}

        <Input
          label="Título da Vaga"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Desenvolvedor(a) Backend Pleno"
        />

        <Textarea
          label="Requisitos"
          required
          rows={3}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="Descreva os requisitos técnicos e comportamentais da vaga..."
        />

        <Textarea
          label="Atividades (opcional)"
          rows={3}
          value={activities}
          onChange={(e) => setActivities(e.target.value)}
          placeholder="Descreva as principais atividades do cargo..."
        />

        <Textarea
          label="Condições (opcional)"
          rows={2}
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          placeholder="Salário, benefícios, local de trabalho..."
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Prazo (opcional)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          {isEdit && (
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ABERTA">Aberta</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="ENCERRADA">Encerrada</option>
              <option value="CANCELADA">Cancelada</option>
            </Select>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-atrio-text-primary">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="rounded border-atrio-border text-atrio-teal focus:ring-atrio-teal"
          />
          Vaga interna (recrutamento interno)
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Vaga'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
