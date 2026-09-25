// Constantes compartilhadas entre as telas/modais do módulo QLP
// (Quadro de Lotação de Pessoal), espelhando os enums do backend
// (apps/api/src/modules/qlp/qlp.dto.ts).

export const SHIFT_TYPE_OPTIONS = [
  { value: 'MANHA', label: 'Manhã' },
  { value: 'TARDE', label: 'Tarde' },
  { value: 'NOITE', label: 'Noite' },
  { value: 'INTEGRAL', label: 'Integral' },
  { value: 'ADMINISTRATIVO', label: 'Administrativo' },
];

export const LABOR_CLASSIFICATION_OPTIONS = [
  { value: 'DIRETA', label: 'Mão de obra direta' },
  { value: 'INDIRETA', label: 'Mão de obra indireta' },
];

export const CONTRACT_TYPE_OPTIONS = [
  { value: 'CLT', label: 'CLT' },
  { value: 'PJ', label: 'PJ' },
  { value: 'ESTAGIO', label: 'Estágio' },
  { value: 'APRENDIZ', label: 'Aprendiz' },
  { value: 'TEMPORARIO', label: 'Temporário' },
];

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'FERIAS', label: 'Em férias' },
  { value: 'AFASTADO', label: 'Afastado' },
  { value: 'DESLIGADO', label: 'Desligado' },
];

export const WORKFORCE_REQUEST_TYPE_OPTIONS = [
  { value: 'REPOSICAO', label: 'Reposição' },
  { value: 'COBERTURA_AFASTAMENTO', label: 'Cobertura de afastamento' },
  { value: 'AMPLIACAO', label: 'Ampliação de quadro' },
];

export const WORKFORCE_REQUEST_STATUS_OPTIONS = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'APROVADO', label: 'Aprovado' },
  { value: 'REJEITADO', label: 'Rejeitado' },
  { value: 'ENCAMINHADO_RECRUTAMENTO', label: 'Encaminhado ao Recrutamento' },
];

export function labelFor(options: { value: string; label: string }[], value?: string | null): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label || value;
}
