import React from 'react';
import { Clock, CheckCircle2, TrendingUp, TrendingDown, Layers, AlertCircle } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Horas Previstas */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Horas Previstas
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Clock className="w-3 h-3" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            {cleanFormatted(totalExpectedFormatted)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Carga horária da escala</p>
        </div>
      </div>

      {/* 2. Horas Realizadas */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Horas Realizadas
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3 h-3" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
            {cleanFormatted(totalActualFormatted)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Tempo líquido trabalhado</p>
        </div>
      </div>

      {/* 3. Saldo do Mês */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Saldo do Mês
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {isMonthPositive ? (
              <TrendingUp className="w-3 h-3 text-emerald-600" />
            ) : isMonthNegative ? (
              <TrendingDown className="w-3 h-3 text-rose-600" />
            ) : (
              <Clock className="w-3 h-3 text-slate-500" />
            )}
          </div>
        </div>
        <div className="mt-2.5">
          <div
            className={`text-lg font-bold tracking-tight whitespace-nowrap ${
              isMonthPositive
                ? 'text-emerald-600'
                : isMonthNegative
                ? 'text-rose-600'
                : 'text-slate-900'
            }`}
          >
            {cleanFormatted(totalBalanceFormatted)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {isMonthPositive
              ? 'Crédito no período'
              : isMonthNegative
              ? 'Débito no período'
              : 'Jornada cumprida'}
          </p>
        </div>
      </div>

      {/* 4. Banco de Horas */}
      <div
        onClick={onOpenBalanceExtract}
        className={`bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between ${
          onOpenBalanceExtract ? 'cursor-pointer hover:border-slate-300 transition-colors group' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Banco de Horas
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Layers className="w-3 h-3" />
          </div>
        </div>
        <div className="mt-2.5">
          <div
            className={`text-lg font-bold tracking-tight whitespace-nowrap ${
              isAccPositive
                ? 'text-emerald-600'
                : isAccNegative
                ? 'text-rose-600'
                : 'text-slate-900'
            }`}
          >
            {cleanFormatted(accumulatedClosingFormatted)}
          </div>
          <div className="flex items-center justify-between mt-0.5 gap-1">
            <span className="text-[10px] text-slate-400">Saldo Total Acumulado</span>
            {onOpenBalanceExtract && (
              <span className="text-[9px] text-teal-600 font-bold group-hover:underline shrink-0">
                Extrato →
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Divergências */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between overflow-hidden">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Divergências
          </span>
          <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {divergencesCount > 0 ? (
              <AlertCircle className="w-3 h-3 text-amber-600" />
            ) : (
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            )}
          </div>
        </div>
        <div className="mt-2.5 flex items-end justify-between gap-1">
          <div className="flex items-baseline gap-1 whitespace-nowrap">
            <span
              className={`text-lg font-bold ${
                divergencesCount > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {divergencesCount}
            </span>
            <span className="text-[10px] text-slate-400">
              {divergencesCount === 1 ? 'alerta' : 'alertas'}
            </span>
          </div>
          <div className="shrink-0">
            {divergencesCount > 0 ? (
              <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                Pendente
              </span>
            ) : (
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                Regular
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
