import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, 
  Info,
  DollarSign
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

export interface RequestVacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  periods: any[];
}

export const RequestVacationModal: React.FC<RequestVacationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  periods,
}) => {
  const availablePeriods = periods.filter(
    (p) => p.daysRemaining > 0 && ['ADQUIRIDO', 'EM_AQUISICAO', 'VENCIDO'].includes(p.status)
  );

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sellDaysCount, setSellDaysCount] = useState<number>(0);
  const [advanceThirteenth, setAdvanceThirteenth] = useState(false);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cltWarning, setCltWarning] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (availablePeriods.length > 0) {
        setSelectedPeriodId(availablePeriods[0].id);
      }
      setStartDate('');
      setEndDate('');
      setSellDaysCount(0);
      setAdvanceThirteenth(false);
      setNotes('');
      setError(null);
      setCltWarning(null);
    }
  }, [isOpen]);

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  // Calcula dias corridos e validações CLT em tempo real
  let calculatedDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e >= s) {
      const diff = Math.abs(e.getTime() - s.getTime());
      calculatedDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  useEffect(() => {
    if (!startDate || !endDate) {
      setCltWarning(null);
      return;
    }

    if (calculatedDays < 5 && calculatedDays > 0) {
      setCltWarning('Conforme a CLT (Art. 134, § 1º), nenhum período de férias pode ser inferior a 5 dias corridos.');
      return;
    }

    // Validação de Sexta/Sábado
    const dayOfWeek = new Date(`${startDate}T12:00:00Z`).getUTCDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      setCltWarning('Conforme a CLT (Art. 134, § 3º), é vedado o início das férias nos 2 dias que antecedem o repouso semanal remunerado (sexta-feira e sábado).');
      return;
    }

    if (selectedPeriod && calculatedDays + sellDaysCount > selectedPeriod.daysRemaining) {
      setCltWarning(`O total solicitado (${calculatedDays + sellDaysCount} dias) ultrapassa o saldo disponível do período (${selectedPeriod.daysRemaining} dias).`);
      return;
    }

    setCltWarning(null);
  }, [startDate, endDate, sellDaysCount, selectedPeriodId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId || !startDate || !endDate) return;

    if (cltWarning) {
      setError(cltWarning);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.post('/vacations/requests', {
        vacationPeriodId: selectedPeriodId,
        startDate,
        endDate,
        sellDaysCount: Number(sellDaysCount),
        advanceThirteenth,
        notes: notes.trim() ? notes : null,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao enviar solicitação de férias');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split('T')[0].split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Solicitar Programação de Férias"
      subtitle="Selecione o período aquisitivo, as datas desejadas e opções de abono pecuniário"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {cltWarning && !error && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{cltWarning}</span>
          </div>
        )}

        {/* Seleção do Período Aquisitivo */}
        <div>
          <label className="block text-xs font-bold text-atrio-text-primary mb-1">
            Período Aquisitivo de Direito *
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal font-medium"
          >
            {availablePeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {formatDate(p.vestingStartDate)} a {formatDate(p.vestingEndDate)} — Saldo Disponível: {p.daysRemaining} dias (Limite: {formatDate(p.deadlineDate)})
              </option>
            ))}
          </select>
        </div>

        {/* Datas de Início e Término */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-atrio-text-primary mb-1">
              Data de Início das Férias *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Dica: Inicie entre segunda e quinta-feira (Regra CLT).
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-atrio-text-primary mb-1">
              Data de Término das Férias *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
            />
            {calculatedDays > 0 && (
              <span className="text-[10px] font-bold text-atrio-navy mt-1 block">
                Total de dias de descanso: {calculatedDays} dias corridos
              </span>
            )}
          </div>
        </div>

        {/* Abono Pecuniário e 13º Salário */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <label className="block text-xs font-bold text-atrio-text-primary mb-1 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Abono Pecuniário ("Venda de Férias")
            </label>
            <select
              value={sellDaysCount}
              onChange={(e) => setSellDaysCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
            >
              <option value={0}>Nenhum abono (0 dias)</option>
              <option value={5}>5 dias de abono</option>
              <option value={10}>10 dias de abono (Máx. 1/3)</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={advanceThirteenth}
                onChange={(e) => setAdvanceThirteenth(e.target.checked)}
                className="w-4 h-4 text-atrio-teal rounded border-slate-300 focus:ring-atrio-teal"
              />
              <span>Solicitar adiantamento da 1ª parcela do 13º Salário</span>
            </label>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-bold text-atrio-text-primary mb-1">
            Observações para a Chefia Imediata (Opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Informações adicionais sobre planejamento ou cobertura..."
            rows={2}
            className="w-full px-3 py-2 bg-white border border-atrio-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-atrio-teal"
          />
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-atrio-border">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={submitting || Boolean(cltWarning) || calculatedDays === 0}
          >
            {submitting ? 'Enviando...' : 'Confirmar Solicitação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
