import React from 'react';
import { Clock, CheckCircle2, TrendingUp, TrendingDown, Layers, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface TimeClockSummaryProps {
  totalExpectedFormatted: string;
  totalActualFormatted: string;
  totalBalanceFormatted: string;
  totalBalanceMinutes: number;
  accumulatedClosingFormatted: string;
  accumulatedClosingMinutes?: number;
  divergencesCount: number;
  totalExtraFormatted?: string;
  totalDelayFormatted?: string;
  totalAbsenceFormatted?: string;
  onOpenBalanceExtract?: () => void;
}

export const TimeClockSummaryCards: React.FC<TimeClockSummaryProps> = ({
  totalExpectedFormatted,
  totalActualFormatted,
  totalBalanceFormatted,
  totalBalanceMinutes,
  accumulatedClosingFormatted,
  accumulatedClosingMinutes = 0,
  divergencesCount,
  onOpenBalanceExtract,
}) => {
  const isMonthPositive = totalBalanceMinutes > 0;
  const isMonthNegative = totalBalanceMinutes < 0;
  const isAccPositive = accumulatedClosingMinutes > 0;
  const isAccNegative = accumulatedClosingMinutes < 0;

  const cleanFormatted = (val?: string) => {
    if (!val || val.includes('NaN')) return '00h 00m';
    return val.replace(/\s+/g, ' ').trim();
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* 1. Horas Previstas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Horas Previstas
          </span>
          <div className="w-8 h-8 rounded-xl bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            {cleanFormatted(totalExpectedFormatted)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Carga horária da escala</p>
        </div>
      </div>

      {/* 2. Horas Realizadas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Horas Realizadas
          </span>
          <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight font-sans">
            {cleanFormatted(totalActualFormatted)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">Tempo líquido trabalhado</p>
        </div>
      </div>

      {/* 3. Saldo do Mês */}
      <div
        className={`bg-white border rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
          isMonthPositive
            ? 'border-emerald-200 bg-gradient-to-br from-white via-emerald-50/20 to-emerald-50/40 ring-1 ring-emerald-500/20'
            : isMonthNegative
            ? 'border-rose-200 bg-gradient-to-br from-white via-rose-50/20 to-rose-50/40 ring-1 ring-rose-500/20'
            : 'border-slate-200/90'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Saldo do Mês
          </span>
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              isMonthPositive
                ? 'bg-emerald-100/80 text-emerald-700'
                : isMonthNegative
                ? 'bg-rose-100/80 text-rose-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {isMonthPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : isMonthNegative ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-extrabold tracking-tight font-sans ${
              isMonthPositive
                ? 'text-emerald-600'
                : isMonthNegative
                ? 'text-rose-600'
                : 'text-slate-900'
            }`}
          >
            {cleanFormatted(totalBalanceFormatted)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {isMonthPositive
              ? 'Crédito no período'
              : isMonthNegative
              ? 'Débito / Atraso no período'
              : 'Jornada cumprida'}
          </p>
        </div>
      </div>

      {/* 4. Banco de Horas */}
      <div
        onClick={onOpenBalanceExtract}
        className={`bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
          onOpenBalanceExtract ? 'cursor-pointer group hover:border-teal-300' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Banco de Horas
          </span>
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-extrabold tracking-tight font-sans ${
              isAccPositive
                ? 'text-emerald-600'
                : isAccNegative
                ? 'text-rose-600'
                : 'text-slate-900'
            }`}
          >
            {cleanFormatted(accumulatedClosingFormatted)}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-medium text-slate-400">Saldo Total Acumulado</span>
            {onOpenBalanceExtract && (
              <span className="text-[10px] text-teal-600 font-bold group-hover:underline flex items-center gap-0.5">
                Extrato →
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Divergências */}
      <div
        className={`bg-white border rounded-2xl p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
          divergencesCount > 0
            ? 'border-amber-200 bg-gradient-to-br from-white via-amber-50/20 to-amber-50/40 ring-1 ring-amber-500/20'
            : 'border-slate-200/90'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Divergências
          </span>
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              divergencesCount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {divergencesCount > 0 ? (
              <AlertCircle className="w-4 h-4 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <span
              className={`text-2xl font-extrabold font-sans ${
                divergencesCount > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {divergencesCount}
            </span>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {divergencesCount === 1 ? 'dia com alerta' : 'dias com alerta'}
            </p>
          </div>
          <div>
            {divergencesCount > 0 ? (
              <Badge variant="warning" size="sm">
                Ajuste pendente
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Espelho regular
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
