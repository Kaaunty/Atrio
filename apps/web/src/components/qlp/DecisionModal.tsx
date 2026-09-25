import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

export interface DecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: { id: string; requestType?: string } | null;
  decision: 'APROVADO' | 'REJEITADO' | null;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  request,
  decision,
}) => {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError(null);
    }
  }, [isOpen, request]);

  const isApproval = decision === 'APROVADO';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !decision) return;
    setError(null);

    if (!isApproval && note.trim().length < 5) {
      setError('Informe o motivo da rejeição (mínimo 5 caracteres)');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/qlp/requests/${request.id}/decision`, {
        status: decision,
        decisionNote: note.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao registrar decisão da solicitação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isApproval ? 'Aprovar Solicitação de Quadro' : 'Rejeitar Solicitação de Quadro'}
      subtitle={
        isApproval
          ? 'Confirme a aprovação da solicitação de movimentação de quadro'
          : 'Informe o motivo da rejeição desta solicitação'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Textarea
          label={isApproval ? 'Observação (opcional)' : 'Motivo da rejeição'}
          required={!isApproval}
          rows={4}
          placeholder={isApproval ? 'Observações sobre a aprovação...' : 'Explique por que a solicitação está sendo rejeitada...'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            variant={isApproval ? 'primary' : 'danger'}
            size="sm"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Enviando...' : isApproval ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
