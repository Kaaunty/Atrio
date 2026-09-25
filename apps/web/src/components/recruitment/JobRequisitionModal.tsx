import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

interface DepartmentOption {
  id: string;
  name: string;
}

interface PositionOption {
  id: string;
  title: string;
}

export interface JobRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const JobRequisitionModal: React.FC<JobRequisitionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [positions, setPositions] = useState<PositionOption[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [shiftType, setShiftType] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState('1');
  const [contractType, setContractType] = useState('CLT');
  const [justification, setJustification] = useState('');
  const [workforceRequestId, setWorkforceRequestId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        setDepartments(res.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar setores:', err);
      }
    };

    fetchDepartments();
    setDepartmentId('');
    setPositionId('');
    setShiftType('');
    setRequestedQuantity('1');
    setContractType('CLT');
    setJustification('');
    setWorkforceRequestId('');
    setError(null);
    setPositions([]);
  }, [isOpen]);

  useEffect(() => {
    if (!departmentId) {
      setPositions([]);
      setPositionId('');
      return;
    }

    const fetchPositions = async () => {
      try {
        const res = await api.get('/positions', { params: { departmentId } });
        setPositions(res.data.data || []);
      } catch (err) {
        console.error('Erro ao carregar cargos:', err);
        setPositions([]);
      }
    };

    fetchPositions();
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!departmentId) {
      setError('Selecione o setor solicitante');
      return;
    }
    if (justification.trim().length < 10) {
      setError('A justificativa deve ter pelo menos 10 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await api.post('/recruitment/requisitions', {
        departmentId,
        positionId: positionId || undefined,
        shiftType: shiftType || undefined,
        requestedQuantity: Number(requestedQuantity) || 1,
        contractType,
        justification: justification.trim(),
        workforceRequestId: workforceRequestId.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar solicitação de vaga');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitar Abertura de Vaga"
      subtitle="A solicitação será enviada para análise e aprovação do RH"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Select
          label="Setor Solicitante"
          required
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
        >
          <option value="">Selecione o setor...</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </Select>

        <Select
          label="Cargo (opcional)"
          value={positionId}
          onChange={(e) => setPositionId(e.target.value)}
          disabled={!departmentId || positions.length === 0}
        >
          <option value="">Nenhum cargo específico</option>
          {positions.map((pos) => (
            <option key={pos.id} value={pos.id}>
              {pos.title}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantidade de Vagas"
            type="number"
            min={1}
            required
            value={requestedQuantity}
            onChange={(e) => setRequestedQuantity(e.target.value)}
          />
          <Select
            label="Tipo de Contrato"
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
          >
            <option value="CLT">CLT</option>
            <option value="PJ">PJ</option>
            <option value="ESTAGIO">Estágio</option>
            <option value="APRENDIZ">Aprendiz</option>
            <option value="TEMPORARIO">Temporário</option>
          </Select>
        </div>

        <Select label="Turno (opcional)" value={shiftType} onChange={(e) => setShiftType(e.target.value)}>
          <option value="">Não especificado</option>
          <option value="MANHA">Manhã</option>
          <option value="TARDE">Tarde</option>
          <option value="NOITE">Noite</option>
          <option value="INTEGRAL">Integral</option>
          <option value="ADMINISTRATIVO">Administrativo</option>
        </Select>

        <Input
          label="ID da Requisição de Força de Trabalho (QLP) — opcional"
          value={workforceRequestId}
          onChange={(e) => setWorkforceRequestId(e.target.value)}
          placeholder="Cole aqui o ID originado do planejamento de força de trabalho, se houver"
        />

        <Textarea
          label="Justificativa da Solicitação"
          required
          rows={4}
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Descreva o motivo da abertura desta vaga (mínimo 10 caracteres)..."
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
