import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

export interface FeedbackMetric {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}

export interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
  metrics?: FeedbackMetric[];
  confirmText?: string;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  isOpen,
  onClose,
  type = 'success',
  title,
  description,
  metrics,
  confirmText = 'Entendido',
}) => {
  const iconMap = {
    success: <CheckCircle2 className="w-10 h-10 text-emerald-600" />,
    warning: <AlertTriangle className="w-10 h-10 text-amber-600" />,
    error: <XCircle className="w-10 h-10 text-rose-600" />,
    info: <Info className="w-10 h-10 text-indigo-600" />,
  };

  const bgMap = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    error: 'bg-rose-50 border-rose-200 text-rose-900',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" size="md" onClick={onClose} className="px-6">
            {confirmText}
          </Button>
        </div>
      }
    >
      <div className="p-4 sm:p-6 text-center space-y-4">
        {/* Ícone com fundo colorido suave */}
        <div className="flex justify-center">
          <div className={`p-3 rounded-full border shadow-sm ${bgMap[type]}`}>
            {iconMap[type]}
          </div>
        </div>

        {/* Título & Descrição */}
        <div className="space-y-1.5">
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm font-medium text-slate-600 whitespace-pre-line leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Cards de Métricas (caso haja dados estruturados) */}
        {metrics && metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2 text-left">
            {metrics.map((m, idx) => (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-center space-x-3 shadow-sm hover:border-slate-300 transition-colors"
              >
                {m.icon && <div className="text-indigo-600 shrink-0">{m.icon}</div>}
                <div className="min-w-0 flex-1">
                  <div className="text-lg font-black text-slate-900 leading-none">{m.value}</div>
                  <div className="text-xs font-semibold text-slate-500 mt-1 truncate">{m.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
