import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'teal' | 'navy';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border transition-colors';

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const variantStyles = {
    // Sucesso (#16A34A): Ativo, Aprovado, Concluído
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    // Atenção (#D97706): Pendente, Aguardando gestor/RH, Prazo próximo
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    // Erro (#DC2626): Rejeitado, Vencido, Bloqueado, Divergência crítica
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    // Informação (#2563EB): Em análise, Em andamento, Informativos
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    // Neutro (#64748B): Cancelado, Inativo, Arquivado, Rascunho
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    // Destaque da Marca (Teal #0EAAA3)
    teal: 'bg-atrio-teal-light text-atrio-teal-dark border-atrio-teal/20',
    // Institucional (Navy #082E5C)
    navy: 'bg-blue-50 text-atrio-navy border-blue-200',
  };

  const dotColors = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-400',
    teal: 'bg-atrio-teal',
    navy: 'bg-atrio-navy',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
