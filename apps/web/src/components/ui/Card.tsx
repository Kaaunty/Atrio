import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  hoverable = false,
  className,
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'bg-atrio-surface border border-atrio-border rounded-xl shadow-sm transition-all',
          paddingStyles[padding],
          hoverable && 'hover:border-atrio-teal/50 hover:shadow-md cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
