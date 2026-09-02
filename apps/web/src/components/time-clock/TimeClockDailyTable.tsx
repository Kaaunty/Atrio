import React from 'react';
import { AlertCircle, Edit3 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface DailyRowItem {
  date: string;
  dayOfWeek: number;
  dayOfWeekName: string;
  e1: string;
  s1: string;
  e2: string;
  s2: string;
  extraEntries?: string[];
  expectedWorkFormatted: string;
  expectedWorkMinutes: number;
  actualWorkFormatted: string;
  actualWorkMinutes: number;
  balanceFormatted: string;
  balanceMinutes: number;
  status: string;
  divergenceReasons: string[];
}

export interface TimeClockDailyTableProps {
  days: DailyRowItem[];
  todayDateStr?: string;
  onRequestAdjustment?: (day: DailyRowItem) => void;
  showActions?: boolean;
}

export const TimeClockDailyTable: React.FC<TimeClockDailyTableProps> = ({
  days,
  todayDateStr,
  onRequestAdjustment,
  showActions = true,
}) => {
  const getStatusBadge = (status: string, reasons: string[]) => {
    switch (status) {
      case 'OK':
        return (
          <Badge variant="success" size="sm" dot>
            OK
          </Badge>
        );
      case 'DIVERGENCIA':
        return (
          <div className="flex items-center gap-1.5" title={reasons.join('\n')}>
            <Badge variant="danger" size="sm" dot>
              Divergência
            </Badge>
            {reasons.length > 0 && (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 cursor-help" />
            )}
          </div>
        );
      case 'FOLGA':
        return (
          <Badge variant="neutral" size="sm">
            Folga / FDS
          </Badge>
        );
      case 'FERIADO':
        return (
          <Badge variant="info" size="sm">
            Feriado
          </Badge>
        );
      case 'FERIAS':
        return (
          <Badge variant="teal" size="sm">
            Férias
          </Badge>
        );
      case 'FALTA':
        return (
          <Badge variant="danger" size="sm" dot>
            Falta
          </Badge>
        );
      case 'AFASTAMENTO':
        return (
          <Badge variant="warning" size="sm">
            Afastamento
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-atrio-border bg-white shadow-sm">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50/80 border-b border-atrio-border text-[11px] font-bold text-atrio-text-secondary uppercase tracking-wider select-none">
            <th className="py-3.5 px-4">Data</th>
            <th className="py-3.5 px-3">Dia</th>
            <th className="py-3.5 px-3 text-center">Entrada 1</th>
            <th className="py-3.5 px-3 text-center">Saída Almoço</th>
            <th className="py-3.5 px-3 text-center">Retorno</th>
            <th className="py-3.5 px-3 text-center">Saída 2</th>
            <th className="py-3.5 px-3 text-right">Previsto</th>
            <th className="py-3.5 px-3 text-right">Realizado</th>
            <th className="py-3.5 px-3 text-right">Saldo</th>
            <th className="py-3.5 px-4 text-center">Status</th>
            {showActions && <th className="py-3.5 px-4 text-right print:hidden">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans text-[13px]">
          {days.map((day) => {
            const isToday = day.date === todayDateStr;
            const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
            const hasDivergence = day.status === 'DIVERGENCIA' || day.status === 'FALTA';
            const isPositive = day.balanceMinutes > 0;
            const isNegative = day.balanceMinutes < 0;

            let rowBg = '';
            if (isToday) {
              rowBg = 'bg-teal-50/40 font-medium ring-1 ring-inset ring-atrio-teal/30';
            } else if (isWeekend && day.actualWorkMinutes === 0) {
              rowBg = 'bg-slate-50/50 text-slate-500';
            } else if (hasDivergence) {
              rowBg = 'bg-rose-50/20';
            }

            return (
              <tr
                key={day.date}
                className={`transition-colors hover:bg-slate-50/80 ${rowBg}`}
              >
                {/* Data */}
                <td className="py-3 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold font-mono text-atrio-text-primary">
                      {formatDateDisplay(day.date)}
                    </span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-atrio-teal text-white tracking-wide uppercase">
                        Hoje
                      </span>
                    )}
                  </div>
                </td>

                {/* Dia da Semana */}
                <td className="py-3 px-3 whitespace-nowrap text-atrio-text-secondary">
                  {day.dayOfWeekName}
                </td>

                {/* E1 */}
                <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-medium">
                  {day.e1 !== '---' ? (
                    <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {day.e1}
                    </span>
                  ) : (
                    <span className="text-slate-300">---</span>
                  )}
                </td>

                {/* S1 */}
                <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-medium">
                  {day.s1 !== '---' ? (
                    <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {day.s1}
                    </span>
                  ) : (
                    <span className="text-slate-300">---</span>
                  )}
                </td>

                {/* E2 */}
                <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-medium">
                  {day.e2 !== '---' ? (
                    <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {day.e2}
                    </span>
                  ) : (
                    <span className="text-slate-300">---</span>
                  )}
                </td>

                {/* S2 */}
                <td className="py-3 px-3 text-center whitespace-nowrap font-mono font-medium">
                  <div className="flex flex-col items-center gap-1">
                    {day.s2 !== '---' ? (
                      <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {day.s2}
                      </span>
                    ) : (
                      <span className="text-slate-300">---</span>
                    )}
                    {day.extraEntries && day.extraEntries.length > 0 && (
                      <span
                        className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-bold"
                        title={`Batidas adicionais no dia: ${day.extraEntries.join(', ')}`}
                      >
                        +{day.extraEntries.join(', ')}
                      </span>
                    )}
                  </div>
                </td>

                {/* Previsto */}
                <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 font-medium">
                  {!day.expectedWorkFormatted || day.expectedWorkFormatted.includes('NaN')
                    ? '00h 00m'
                    : day.expectedWorkFormatted}
                </td>

                {/* Realizado */}
                <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-semibold text-slate-900">
                  {!day.actualWorkFormatted || day.actualWorkFormatted.includes('NaN')
                    ? '00h 00m'
                    : day.actualWorkFormatted}
                </td>

                {/* Saldo Diário */}
                <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                  {isPositive ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80">
                      {day.balanceFormatted}
                    </span>
                  ) : isNegative ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-rose-50 text-rose-700 font-bold border border-rose-200/80">
                      {day.balanceFormatted}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">
                      {!day.balanceFormatted || day.balanceFormatted.includes('NaN')
                        ? '00h 00m'
                        : day.balanceFormatted}
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3 px-4 whitespace-nowrap text-center">
                  <div className="flex justify-center">
                    {getStatusBadge(day.status, day.divergenceReasons)}
                  </div>
                </td>

                {/* Ações */}
                {showActions && (
                  <td className="py-3 px-4 text-right whitespace-nowrap print:hidden">
                    {hasDivergence ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Edit3 className="w-3.5 h-3.5 text-atrio-teal" />}
                        onClick={() => onRequestAdjustment?.(day)}
                        className="text-xs text-atrio-navy hover:text-atrio-teal hover:border-atrio-teal py-1 px-2.5"
                      >
                        Ajustar
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRequestAdjustment?.(day)}
                        className="text-slate-400 hover:text-atrio-navy p-1 rounded transition-colors"
                        title="Detalhes / Solicitar ajuste avulso"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
