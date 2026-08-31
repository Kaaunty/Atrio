import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { api } from '../../services/api';

export interface ScheduleRuleDayItem {
  dayOfWeek: number;
  isWorkDay: boolean;
  expectedWorkMinutes: number;
  intervals: { start: string; end: string }[];
}

export interface WorkScheduleData {
  id?: string;
  name: string;
  description?: string | null;
  weeklyHours: number;
  toleranceMinutes: number;
  lunchIntervalMinutes: number;
  flexibleInterval: boolean;
  scheduleRules: ScheduleRuleDayItem[];
  active?: boolean;
}

interface WorkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scheduleToEdit?: WorkScheduleData | null;
}

const DEFAULT_DAYS: ScheduleRuleDayItem[] = [
  { dayOfWeek: 0, isWorkDay: false, expectedWorkMinutes: 0, intervals: [] },
  {
    dayOfWeek: 1,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:48' }],
  },
  {
    dayOfWeek: 2,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:48' }],
  },
  {
    dayOfWeek: 3,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:48' }],
  },
  {
    dayOfWeek: 4,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:48' }],
  },
  {
    dayOfWeek: 5,
    isWorkDay: true,
    expectedWorkMinutes: 528,
    intervals: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:48' }],
  },
  { dayOfWeek: 6, isWorkDay: false, expectedWorkMinutes: 0, intervals: [] },
];

const DAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export const WorkScheduleModal: React.FC<WorkScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  scheduleToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(44);
  const [toleranceMinutes, setToleranceMinutes] = useState(10);
  const [lunchIntervalMinutes, setLunchIntervalMinutes] = useState(60);
  const [flexibleInterval, setFlexibleInterval] = useState(true);
  const [rules, setRules] = useState<ScheduleRuleDayItem[]>(DEFAULT_DAYS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scheduleToEdit) {
      setName(scheduleToEdit.name);
      setDescription(scheduleToEdit.description || '');
      setWeeklyHours(scheduleToEdit.weeklyHours);
      setToleranceMinutes(scheduleToEdit.toleranceMinutes);
      setLunchIntervalMinutes(scheduleToEdit.lunchIntervalMinutes);
      setFlexibleInterval(scheduleToEdit.flexibleInterval);
      setRules(
        scheduleToEdit.scheduleRules && scheduleToEdit.scheduleRules.length === 7
          ? scheduleToEdit.scheduleRules
          : DEFAULT_DAYS
      );
    } else {
      setName('');
      setDescription('');
      setWeeklyHours(44);
      setToleranceMinutes(10);
      setLunchIntervalMinutes(60);
      setFlexibleInterval(true);
      setRules(DEFAULT_DAYS);
    }
    setError(null);
  }, [scheduleToEdit, isOpen]);

  const handleToggleWorkDay = (index: number) => {
    const updated = [...rules];
    const current = updated[index];
    const isNowWorkDay = !current.isWorkDay;
    updated[index] = {
      ...current,
      isWorkDay: isNowWorkDay,
      expectedWorkMinutes: isNowWorkDay ? 528 : 0,
      intervals: isNowWorkDay
        ? [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:48' }]
        : [],
    };
    setRules(updated);
  };

  const handleIntervalChange = (
    dayIndex: number,
    intervalIndex: number,
    field: 'start' | 'end',
    val: string
  ) => {
    const updated = [...rules];
    const day = { ...updated[dayIndex] };
    const ints = [...day.intervals];
    ints[intervalIndex] = { ...ints[intervalIndex], [field]: val };
    day.intervals = ints;
    updated[dayIndex] = day;
    setRules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome da escala é obrigatório');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name,
        description: description || null,
        weeklyHours: Number(weeklyHours),
        toleranceMinutes: Number(toleranceMinutes),
        lunchIntervalMinutes: Number(lunchIntervalMinutes),
        flexibleInterval,
        scheduleRules: rules,
      };

      if (scheduleToEdit?.id) {
        await api.put(`/work-schedules/${scheduleToEdit.id}`, payload);
      } else {
        await api.post('/work-schedules', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao salvar escala de trabalho');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={scheduleToEdit ? 'Editar Escala de Trabalho' : 'Nova Escala de Trabalho'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome da Escala"
            placeholder="Ex: Administrativo 44h - 08:00 às 18:00"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Descrição / Observação"
            placeholder="Ex: Padrão para escritório matriz"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Carga Semanal (Horas)"
            type="number"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            min={1}
            max={60}
            required
          />
          <Input
            label="Tolerância CLT (Minutos diários)"
            type="number"
            value={toleranceMinutes}
            onChange={(e) => setToleranceMinutes(Number(e.target.value))}
            min={0}
            max={60}
            required
          />
          <Input
            label="Intervalo de Almoço (Minutos)"
            type="number"
            value={lunchIntervalMinutes}
            onChange={(e) => setLunchIntervalMinutes(Number(e.target.value))}
            min={0}
            max={180}
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="flexInterval"
            checked={flexibleInterval}
            onChange={(e) => setFlexibleInterval(e.target.checked)}
            className="w-4 h-4 text-atrio-teal rounded border-slate-300 focus:ring-atrio-teal"
          />
          <label htmlFor="flexInterval" className="text-sm font-medium text-atrio-text-primary select-none cursor-pointer">
            Intervalo Flexível (permite pequenas variações no início/fim de almoço sem gerar divergência)
          </label>
        </div>

        {/* Grade semanal de horários previstos */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-atrio-text-secondary mb-3">
            Horários Previstos por Dia da Semana
          </h4>
          <div className="border border-atrio-border rounded-xl divide-y divide-slate-100 overflow-hidden">
            {rules.map((r, idx) => (
              <div
                key={idx}
                className={`p-3 flex items-center justify-between gap-4 text-sm ${
                  r.isWorkDay ? 'bg-white' : 'bg-slate-50 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3 w-40">
                  <input
                    type="checkbox"
                    checked={r.isWorkDay}
                    onChange={() => handleToggleWorkDay(idx)}
                    className="w-4 h-4 text-atrio-teal rounded border-slate-300 focus:ring-atrio-teal"
                  />
                  <span className={`font-medium ${r.isWorkDay ? 'text-slate-800' : 'text-slate-500'}`}>
                    {DAY_LABELS[r.dayOfWeek]}
                  </span>
                </div>

                {r.isWorkDay ? (
                  <div className="flex-1 flex items-center gap-3 justify-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">1º Turno:</span>
                      <input
                        type="time"
                        value={r.intervals[0]?.start || '08:00'}
                        onChange={(e) => handleIntervalChange(idx, 0, 'start', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                      <span className="text-xs text-slate-400">às</span>
                      <input
                        type="time"
                        value={r.intervals[0]?.end || '12:00'}
                        onChange={(e) => handleIntervalChange(idx, 0, 'end', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-xs text-slate-500">2º Turno:</span>
                      <input
                        type="time"
                        value={r.intervals[1]?.start || '13:00'}
                        onChange={(e) => handleIntervalChange(idx, 1, 'start', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                      <span className="text-xs text-slate-400">às</span>
                      <input
                        type="time"
                        value={r.intervals[1]?.end || '17:48'}
                        onChange={(e) => handleIntervalChange(idx, 1, 'end', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">Folga / Dia não trabalhado</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-atrio-border">
          <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : scheduleToEdit ? 'Atualizar Escala' : 'Cadastrar Escala'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
