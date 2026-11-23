import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SearchableSelect, SearchableOption } from './SearchableSelect';
import { employeeService, Employee, EmployeeStatus } from '../../services/employeeService';

export interface EmployeeSelectProps {
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  helperText?: string;
  error?: string;
  value: string;
  onChange: (employeeId: string) => void;
  status?: EmployeeStatus;
}

const PAGE_SIZE = 50;

const toOption = (e: Employee): SearchableOption => ({
  value: e.id,
  label: e.name,
  subLabel: `Mat. ${e.registrationNumber || '—'}${e.department?.name ? ` • ${e.department.name}` : ''}`,
  badge: e.status && e.status !== 'ATIVO' ? e.status : undefined,
});

/**
 * Seletor de colaborador com pesquisa no servidor (nome, CPF, e-mail ou matrícula).
 * Não depende de carregar todos os colaboradores: busca sob demanda, então funciona
 * para qualquer tamanho de base.
 */
export const EmployeeSelect: React.FC<EmployeeSelectProps> = ({
  label,
  required,
  disabled,
  placeholder = 'Selecione um colaborador...',
  helperText,
  error,
  value,
  onChange,
  status,
}) => {
  const [options, setOptions] = useState<SearchableOption[]>([]);
  const [loading, setLoading] = useState(false);
  // Guarda todo colaborador já visto para manter o rótulo do selecionado após novas buscas.
  const seen = useRef<Map<string, SearchableOption>>(new Map());
  const requestId = useRef(0);

  const search = useCallback(
    async (term: string) => {
      const current = ++requestId.current;
      try {
        setLoading(true);
        const res = await employeeService.getEmployees({
          search: term.trim() || undefined,
          status,
          pageSize: PAGE_SIZE,
        });
        if (current !== requestId.current) return; // resposta antiga
        const list = (res.data || []).map(toOption);
        list.forEach((o) => seen.current.set(o.value, o));
        setOptions(list);
      } catch (err) {
        if (current === requestId.current) setOptions([]);
        console.error('Erro ao buscar colaboradores:', err);
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    search('');
  }, [search]);

  // Valor pré-selecionado que não está na primeira página: busca o cadastro pelo id.
  useEffect(() => {
    if (!value || seen.current.has(value)) return;
    let cancelled = false;
    employeeService
      .getEmployee(value)
      .then((emp) => {
        if (cancelled || !emp) return;
        const opt = toOption(emp);
        seen.current.set(opt.value, opt);
        setOptions((prev) => [...prev]); // força re-render com o rótulo
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <SearchableSelect
      label={label}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      helperText={helperText}
      error={error}
      searchPlaceholder="Pesquisar por nome, CPF, e-mail ou matrícula..."
      emptyMessage="Nenhum colaborador encontrado"
      value={value}
      onChange={onChange}
      onSearchChange={search}
      loading={loading}
      options={options}
      selectedOptionFallback={value ? seen.current.get(value) : undefined}
    />
  );
};
