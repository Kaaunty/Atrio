import React, { useState, useEffect } from 'react';
import { AlertCircle, Calendar, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { api } from '../../services/api';

export interface CipaMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meeting?: any | null;
}

interface PendingAction {
  description: string;
  responsible?: string;
  dueDate?: string;
  done: boolean;
}

export const CipaMeetingModal: React.FC<CipaMeetingModalProps> = ({ isOpen, onClose, onSuccess, meeting }) => {
  const isEditing = Boolean(meeting?.id);

  const [meetingDate, setMeetingDate] = useState('');
  const [minutes, setMinutes] = useState('');
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMeetingDate(meeting?.meetingDate ? meeting.meetingDate.split('T')[0] : '');
      setMinutes(meeting?.minutes || '');
      setPendingActions(meeting?.pendingActions?.length ? meeting.pendingActions : []);
      setError(null);
    }
  }, [isOpen, meeting]);

  const addAction = () => {
    setPendingActions((prev) => [...prev, { description: '', responsible: '', dueDate: '', done: false }]);
  };

  const updateAction = (index: number, field: keyof PendingAction, value: string | boolean) => {
    setPendingActions((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  const removeAction = (index: number) => {
    setPendingActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        meetingDate,
        minutes,
        pendingActions: pendingActions
          .filter((a) => a.description.trim())
          .map((a) => ({
            description: a.description,
            responsible: a.responsible?.trim() ? a.responsible : undefined,
            dueDate: a.dueDate?.trim() ? a.dueDate : undefined,
            done: a.done,
          })),
      };

      if (isEditing) {
        await api.patch(`/workplace-safety/cipa/meetings/${meeting.id}`, payload);
      } else {
        await api.post('/workplace-safety/cipa/meetings', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar reunião da CIPA');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Reunião da CIPA' : 'Nova Reunião da CIPA'}
      subtitle="Ata de reunião e ações pendentes"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input label="Data da Reunião" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />

        <Textarea
          label="Ata da Reunião"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          required
          rows={4}
          placeholder="Descreva os assuntos discutidos na reunião..."
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700">Ações Pendentes</label>
            <Button variant="ghost" size="sm" type="button" icon={<Plus className="w-3.5 h-3.5" />} onClick={addAction}>
              Adicionar Ação
            </Button>
          </div>
          {pendingActions.length === 0 && (
            <p className="text-xs text-slate-400 italic py-2">Nenhuma ação pendente adicionada.</p>
          )}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pendingActions.map((a, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 bg-slate-50 rounded-lg border border-atrio-border">
                <div className="col-span-5">
                  <input
                    value={a.description}
                    onChange={(e) => updateAction(index, 'description', e.target.value)}
                    placeholder="Descrição da ação"
                    className="w-full px-2.5 py-1.5 bg-white border border-atrio-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal/30"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    value={a.responsible || ''}
                    onChange={(e) => updateAction(index, 'responsible', e.target.value)}
                    placeholder="Responsável"
                    className="w-full px-2.5 py-1.5 bg-white border border-atrio-border rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal/30"
                  />
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <input
                      type="date"
                      value={a.dueDate || ''}
                      onChange={(e) => updateAction(index, 'dueDate', e.target.value)}
                      aria-label="Prazo da ação"
                      title={a.dueDate ? `Prazo: ${a.dueDate}` : 'Definir prazo'}
                      className="w-full appearance-none px-2.5 py-1.5 bg-white border border-atrio-border rounded-md text-xs text-transparent caret-transparent focus:outline-none focus:ring-2 focus:ring-atrio-teal/30"
                    />
                    <Calendar className="pointer-events-none absolute inset-0 m-auto w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                  </div>
                </div>
                <div className="col-span-1 flex justify-center pt-1.5">
                  <input type="checkbox" checked={a.done} onChange={(e) => updateAction(index, 'done', e.target.checked)} title="Concluída" />
                </div>
                <div className="col-span-1 flex justify-center pt-1">
                  <button type="button" onClick={() => removeAction(index)} className="text-rose-500 hover:text-rose-700">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={submitting}>
            {submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Registrar Reunião'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
