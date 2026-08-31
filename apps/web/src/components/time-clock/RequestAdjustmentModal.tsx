import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../services/api';
import { DailyRowItem } from './TimeClockDailyTable';

export interface RequestAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDay?: DailyRowItem | null;
}

const REASON_PRESETS = [
  'Esquecimento de marcação de ponto',
  'Serviço / Atendimento externo a cliente',
  'Consulta / Procedimento médico',
  'Falha técnica / Leitor biométrico',
  'Trabalho remoto / Regime Home Office',
  'Reunião externa com diretoria / parceiro',
  'Outro motivo (especificar abaixo)',
];

export const RequestAdjustmentModal: React.FC<RequestAdjustmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDay,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<string>('INCLUSAO');
  const [targetTime, setTargetTime] = useState<string>('08:00');
  const [reason, setReason] = useState<string>(REASON_PRESETS[0]);
  const [notes, setNotes] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDay) {
      if (selectedDay.e1 !== '---' && selectedDay.s1 === '---') {
        setAdjustmentType('INCLUSAO');
        setTargetTime('12:00');
      } else if (selectedDay.e2 !== '---' && selectedDay.s2 === '---') {
        setAdjustmentType('INCLUSAO');
        setTargetTime('18:00');
      } else if (selectedDay.status === 'FALTA') {
        setAdjustmentType('JUSTIFICATIVA_FALTA');
        setTargetTime('08:00');
      } else {
        setAdjustmentType('ALTERACAO');
        setTargetTime('08:00');
      }
      setReason(REASON_PRESETS[0]);
      setNotes('');
      setAttachmentUrl('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [selectedDay, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay) return;

    try {
      setLoading(true);
      setError(null);

      await api.post('/time-clock/adjustments', {
        date: selectedDay.date,
        adjustmentType,
        targetTime,
        reason,
        notes: notes.trim() ? notes : null,
        attachmentUrl: attachmentUrl.trim() ? attachmentUrl : null,
      });

      setSuccessMsg(
        'Solicitação de ajuste enviada com sucesso! Ela foi encaminhada para a fila de aprovação do seu gestor.'
      );

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao criar solicitação de ajuste');
    } finally {
      setLoading(false);
    }
  };

  const getDayFormatted = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitar Ajuste / Correção de Ponto"
      maxWidth="lg"
    >
      {selectedDay && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold">Solicitação Registrada!</p>
                <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Contexto do Dia Selecionado */}
              <div className="p-3.5 bg-slate-50 border border-atrio-border rounded-xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-atrio-text-primary">
                    Data: {getDayFormatted(selectedDay.date)} ({selectedDay.dayOfWeekName})
                  </span>
                  <Badge
                    variant={selectedDay.status === 'OK' ? 'success' : 'danger'}
                    size="sm"
                  >
                    Status: {selectedDay.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 font-mono text-slate-700">
                  <span className="text-slate-500 font-sans">Marcações do dia:</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    E1: {selectedDay.e1}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    S1: {selectedDay.s1}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    E2: {selectedDay.e2}
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    S2: {selectedDay.s2}
                  </span>
                </div>

                {selectedDay.divergenceReasons.length > 0 && (
                  <div className="text-rose-600 font-medium pt-1 border-t border-slate-200">
                    Motivo da Divergência: {selectedDay.divergenceReasons.join(' • ')}
                  </div>
                )}
              </div>

              {/* Tipo de Ajuste */}
              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1.5 uppercase tracking-wider">
                  Tipo de Ajuste *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'INCLUSAO', label: 'Inclusão de Batida' },
                    { key: 'ALTERACAO', label: 'Alteração de Horário' },
                    { key: 'EXCLUSAO_DUPLICADA', label: 'Excluir Duplicada' },
                    { key: 'JUSTIFICATIVA_FALTA', label: 'Justificar Falta/Atraso' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setAdjustmentType(t.key)}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        adjustmentType === t.key
                          ? 'bg-atrio-navy text-white border-atrio-navy shadow-sm'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horário Solicitado e Motivo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Horário Correto *
                  </label>
                  <input
                    type="time"
                    value={targetTime}
                    onChange={(e) => setTargetTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                    Motivo Padronizado *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                  >
                    {REASON_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Justificativa Detalhada */}
              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Justificativa / Observação Detalhada
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Descreva o que ocorreu para auxiliar seu gestor e o RH na aprovação..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>

              {/* Anexo / Comprovante Opcional */}
              <div>
                <label className="block text-xs font-bold text-atrio-text-primary mb-1">
                  Link de Comprovante / Atestado (Opcional)
                </label>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Enviando Solicitação...' : 'Enviar para o Gestor'}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </Modal>
  );
};
