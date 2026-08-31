import React from 'react';
import { Check, Clock, X } from 'lucide-react';

export interface WorkflowStepItem {
  id?: string;
  stepOrder: number;
  name: string;
  approverType?: string;
}

export interface WorkflowStepperProps {
  steps: WorkflowStepItem[];
  currentStepOrder: number;
  status: string; // 'RASCUNHO' | 'ABERTO' | 'EM_ANDAMENTO' | 'AGUARDANDO_GESTOR' | 'AGUARDANDO_RH' | 'APROVADO' | 'REJEITADO' | 'CONCLUIDO' | 'CANCELADO'
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  currentStepOrder,
  status,
}) => {
  const isFinished = status === 'CONCLUIDO';
  const isRejected = status === 'REJEITADO';
  const isCancelled = status === 'CANCELADO';

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Linha de conexão de fundo */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-1 bg-slate-100 z-0" />

        {steps.map((step, idx) => {
          const stepNumber = step.stepOrder;
          const isCurrent = stepNumber === currentStepOrder && !isFinished && !isRejected && !isCancelled;
          const isPassed = stepNumber < currentStepOrder || isFinished;

          let icon = <span className="text-xs font-bold font-mono">{stepNumber}</span>;
          let circleBg = 'bg-white border-2 border-slate-300 text-slate-400';
          let textColor = 'text-slate-400';

          if (isPassed) {
            circleBg = 'bg-emerald-600 border-2 border-emerald-600 text-white shadow-sm';
            icon = <Check className="w-3.5 h-3.5 stroke-[3]" />;
            textColor = 'text-emerald-700 font-semibold';
          } else if (isCurrent) {
            circleBg = 'bg-atrio-navy border-2 border-atrio-teal text-white ring-4 ring-atrio-teal/20 shadow-md';
            icon = <Clock className="w-3.5 h-3.5 animate-pulse" />;
            textColor = 'text-atrio-navy font-bold';
          } else if (isRejected && stepNumber === currentStepOrder) {
            circleBg = 'bg-rose-600 border-2 border-rose-600 text-white';
            icon = <X className="w-3.5 h-3.5 stroke-[3]" />;
            textColor = 'text-rose-700 font-bold';
          }

          return (
            <div
              key={step.id || idx}
              className="relative z-10 flex flex-col items-center flex-1 text-center group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${circleBg}`}
              >
                {icon}
              </div>
              <span className={`text-[11px] mt-2 max-w-[110px] truncate leading-tight ${textColor}`}>
                {step.name}
              </span>
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                Etapa {stepNumber}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
