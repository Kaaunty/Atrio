import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api } from '../../services/api';

export interface PpeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ppe?: any | null;
}

export const PpeModal: React.FC<PpeModalProps> = ({ isOpen, onClose, onSuccess, ppe }) => {
  const isEditing = Boolean(ppe?.id);

  const [name, setName] = useState('');
  const [ca, setCa] = useState('');
  const [category, setCategory] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [active, setActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(ppe?.name || '');
      setCa(ppe?.ca || '');
      setCategory(ppe?.category || '');
      setStockQuantity(String(ppe?.stockQuantity ?? 0));
      setActive(ppe?.active ?? true);
      setError(null);
    }
  }, [isOpen, ppe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        name,
        ca: ca.trim() ? ca.trim() : null,
        category,
        stockQuantity: Number(stockQuantity),
        active,
      };

      if (isEditing) {
        await api.patch(`/workplace-safety/ppes/${ppe.id}`, payload);
      } else {
        await api.post('/workplace-safety/ppes', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar EPI');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar EPI' : 'Cadastrar Novo EPI'}
      subtitle="Equipamento de Proteção Individual"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Nome do Equipamento"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Ex: Capacete de Segurança"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Certificado de Aprovação (CA)"
            value={ca}
            onChange={(e) => setCa(e.target.value)}
            placeholder="Ex: CA-12345"
          />
          <Input
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            placeholder="Ex: Proteção da Cabeça"
          />
        </div>

        <Input
          label="Quantidade em Estoque"
          type="number"
          min={0}
          value={stockQuantity}
          onChange={(e) => setStockQuantity(e.target.value)}
          required
        />

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          EPI ativo (disponível para entrega)
        </label>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar EPI'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
