import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface SearchableSelectProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  onSearchChange?: (term: string) => void;
  loading?: boolean;
  className?: string;
  selectedOptionFallback?: SearchableOption;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  error,
  helperText,
  required,
  disabled,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Digite para pesquisar...',
  emptyMessage = 'Nenhum colaborador encontrado',
  options,
  value,
  onChange,
  onSearchChange,
  loading = false,
  className,
  selectedOptionFallback,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const onSearchChangeRef = useRef(onSearchChange);
  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  const lastSearchRef = useRef<string | null>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) ||
    (selectedOptionFallback?.value === value ? selectedOptionFallback : undefined);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foco no input ao abrir e reset de busca ao fechar
  useEffect(() => {
    if (isOpen) {
      lastSearchRef.current = '';
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
      lastSearchRef.current = null;
    }
  }, [isOpen]);

  // Dispara busca remota com debounce SOMENTE quando o dropdown estiver aberto e o usuário digitar
  useEffect(() => {
    if (!isOpen || !onSearchChangeRef.current) return;
    if (lastSearchRef.current === searchTerm) return;

    const timer = setTimeout(() => {
      lastSearchRef.current = searchTerm;
      onSearchChangeRef.current?.(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Se houver busca remota ativa, renderiza a lista fornecida pelo backend.
  // Caso contrário, faz filtro local instantâneo.
  const filteredOptions = onSearchChange
    ? options
    : options.filter((opt) => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        const matchLabel = opt.label.toLowerCase().includes(term);
        const matchSubLabel = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
        const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
        return matchLabel || matchSubLabel || matchBadge;
      });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="w-full space-y-1.5" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Botão Gatilho / Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={twMerge(
            clsx(
              'flex items-center justify-between w-full rounded-lg border bg-white px-3 py-2 text-sm text-left transition-colors cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-atrio-border hover:border-slate-300',
              className
            )
          )}
        >
          <div className="flex-1 min-w-0 pr-2">
            {selectedOption ? (
              <div className="truncate">
                <span className="font-medium text-slate-800">{selectedOption.label}</span>
                {selectedOption.subLabel && (
                  <span className="text-xs text-slate-500 ml-1.5 font-normal">
                    {selectedOption.subLabel}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400 font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
            {/* Input de Pesquisa */}
            <div className="p-2 border-b border-slate-100 bg-slate-50/70">
              <div className="relative flex items-center">
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 absolute left-2.5 text-atrio-teal animate-spin pointer-events-none" />
                ) : (
                  <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white rounded-md border border-slate-200 focus:outline-none focus:ring-1 focus:ring-atrio-teal focus:border-atrio-teal"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Opções */}
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
              {loading && filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-atrio-teal" />
                  Buscando colaboradores...
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={clsx(
                        'w-full text-left px-3 py-2.5 text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer',
                        isSelected
                          ? 'bg-atrio-teal/10 text-atrio-navy font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 font-normal">
                            {opt.subLabel}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-atrio-teal shrink-0 ml-1" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
};
