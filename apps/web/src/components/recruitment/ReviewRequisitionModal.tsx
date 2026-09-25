import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

export interface ReviewRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  requisition: any | null;
  action: 'approve' | 'reject' | null;
}

export const ReviewRequisitionModal: React.FC<ReviewRequisitionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  requisition,
  action,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!requisition || !action) return;

    try {
      setLoading(true);
      setError(null);
      await api.post(`/recruitment/requisitions/${requisition.id}/${action}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao processar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={action === 'approve' ? 'Aprovar Solicitação de Vaga' : 'Rejeitar Solicitação de Vaga'}
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant={action === 'approve' ? 'primary' : 'danger'}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : action === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {requisition && (
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <p>
              <strong>Setor:</strong> {requisition.department?.name || '-'}
            </p>
            <p>
              <strong>Quantidade solicitada:</strong> {requisition.requestedQuantity}
            </p>
            <p>
              <strong>Tipo de contrato:</strong> {requisition.contractType}
            </p>
            <p>
              <strong>Justificativa:</strong> {requisition.justification}
            </p>
            {requisition.workforceRequestId && (
              <p className="text-blue-700">
                <strong>Originado do QLP:</strong>{' '}
                <span className="font-mono">{requisition.workforceRequestId}</span>
              </p>
            )}
          </div>
          <p className="text-slate-600">
            {action === 'approve'
              ? 'Ao aprovar, o gestor solicitante poderá ter a vaga publicada pelo RH.'
              : 'Ao rejeitar, esta solicitação não poderá mais ser aprovada.'}
          </p>
        </div>
      )}
    </Modal>
  );
};
