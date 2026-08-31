import React from 'react';
import { Clock, CheckCircle2, TrendingUp, TrendingDown, Building2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Horas Previstas */}
      <Card padding="sm" className="relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-atrio-text-secondary uppercase tracking-wider">
            Horas Previstas
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-atrio-navy flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-atrio-text-primary tracking-tight font-mono">
            {!totalExpectedFormatted || totalExpectedFormatted.includes('NaN')
              ? '00h 00m'
              : totalExpectedFormatted}
          </div>
          <p className="text-[11px] text-atrio-text-secondary mt-1">Carga horária da escala</p>
        </div>
      </Card>

      {/* 2. Horas Realizadas */}
      <Card padding="sm" className="relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-atrio-text-secondary uppercase tracking-wider">
            Horas Realizadas
          </span>
          <div className="w-8 h-8 rounded-lg bg-atrio-teal-light text-atrio-teal-dark flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-atrio-text-primary tracking-tight font-mono">
            {!totalActualFormatted || totalActualFormatted.includes('NaN')
              ? '00h 00m'
              : totalActualFormatted}
          </div>
          <p className="text-[11px] text-atrio-text-secondary mt-1">Tempo líquido trabalhado</p>
        </div>
      </Card>

      {/* 3. Saldo do Mês */}
      <Card
        padding="sm"
        className={`relative overflow-hidden flex flex-col justify-between border-l-4 ${
          isMonthPositive
            ? 'border-l-emerald-500 bg-emerald-50/20'
            : isMonthNegative
            ? 'border-l-rose-500 bg-rose-50/20'
            : 'border-l-slate-400'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-atrio-text-secondary uppercase tracking-wider">
            Saldo do Mês
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isMonthPositive
                ? 'bg-emerald-100 text-emerald-700'
                : isMonthNegative
                ? 'bg-rose-100 text-rose-700'
                : 'bg-slate-100 text-slate-700'
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
            className={`text-2xl font-bold tracking-tight font-mono ${
              isMonthPositive
                ? 'text-emerald-700'
                : isMonthNegative
                ? 'text-rose-700'
                : 'text-atrio-text-primary'
            }`}
          >
            {!totalBalanceFormatted || totalBalanceFormatted.includes('NaN')
              ? '00h 00m'
              : totalBalanceFormatted}
          </div>
          <p className="text-[11px] text-atrio-text-secondary mt-1">
            {isMonthPositive
              ? 'Crédito no período'
              : isMonthNegative
              ? 'Débito / Atraso no período'
              : 'Jornada cumprida'}
          </p>
        </div>
      </Card>

      {/* 4. Banco de Horas Acumulado */}
      <Card
        padding="sm"
        hoverable={Boolean(onOpenBalanceExtract)}
        onClick={onOpenBalanceExtract}
        className="relative overflow-hidden flex flex-col justify-between group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-atrio-text-secondary uppercase tracking-wider">
            Banco de Horas
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div
            className={`text-2xl font-bold tracking-tight font-mono ${
              isAccPositive
                ? 'text-emerald-700'
                : isAccNegative
                ? 'text-rose-700'
                : 'text-atrio-text-primary'
            }`}
          >
            {!accumulatedClosingFormatted || accumulatedClosingFormatted.includes('NaN')
              ? '00h 00m'
              : accumulatedClosingFormatted}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-atrio-text-secondary">Saldo Total Acumulado</span>
            {onOpenBalanceExtract && (
              <span className="text-[10px] text-atrio-teal font-medium group-hover:underline">
                Ver extrato →
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 5. Divergências / Pendências */}
      <Card
        padding="sm"
        className={`relative overflow-hidden flex flex-col justify-between ${
          divergencesCount > 0 ? 'bg-amber-50/40 border-amber-200' : ''
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-atrio-text-secondary uppercase tracking-wider">
            Divergências
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              divergencesCount > 0
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {divergencesCount > 0 ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono ${
                divergencesCount > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}
            >
              {divergencesCount}
            </span>
            <span className="text-xs text-atrio-text-secondary">
              {divergencesCount === 1 ? 'dia com alerta' : 'dias com alerta'}
            </span>
          </div>
          <div className="mt-1">
            {divergencesCount > 0 ? (
              <Badge variant="warning" size="sm">
                Ajuste recomendado
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                Espelho regular
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
