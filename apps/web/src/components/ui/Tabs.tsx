import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
}) => {
  return (
    <div className={twMerge('border-b border-atrio-border', className)}>
      <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={clsx(
                'group inline-flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium text-sm transition-all whitespace-nowrap',
                isActive
                  ? 'border-atrio-navy text-atrio-navy font-semibold'
                  : 'border-transparent text-slate-500 hover:text-atrio-navy hover:border-slate-300'
              )}
            >
              {tab.icon && (
                <span
                  className={clsx(
                    'shrink-0 transition-colors',
                    isActive ? 'text-atrio-teal' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={clsx(
                    'px-2 py-0.5 text-xs rounded-full font-semibold transition-colors',
                    isActive
                      ? 'bg-atrio-teal text-white'
                      : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
