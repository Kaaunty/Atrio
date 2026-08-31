import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'teal' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    // Botão primário oficial: Navy #082E5C
    primary: 'bg-atrio-navy text-white hover:bg-atrio-navy-dark focus:ring-atrio-navy shadow-sm',
    // Botão secundário oficial: Fundo branco, borda neutra, texto navy
    secondary: 'bg-white text-atrio-navy border border-atrio-border hover:bg-slate-50 focus:ring-slate-300 shadow-sm',
    // Ações de marca / destaque: Teal #0EAAA3
    teal: 'bg-atrio-teal text-white hover:bg-atrio-teal-dark focus:ring-atrio-teal shadow-sm',
    // Ações destrutivas: Danger #DC2626
    danger: 'bg-semantic-danger text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
    // Ghost / Transparente
    ghost: 'text-atrio-text-secondary hover:text-atrio-text-primary hover:bg-slate-100',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
