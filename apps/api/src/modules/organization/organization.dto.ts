import { z } from 'zod';
import { cleanCNPJ, isValidCNPJ } from '../../shared/utils/cnpj.js';

// -----------------------------------------------------------------------------
// EMPRESAS (COMPANIES)
// -----------------------------------------------------------------------------

export const createCompanySchema = z.object({
  legalName: z.string({ required_error: 'Razão Social é obrigatória' }).min(2, 'Razão Social deve ter pelo menos 2 caracteres'),
  tradeName: z.string({ required_error: 'Nome Fantasia é obrigatório' }).min(2, 'Nome Fantasia deve ter pelo menos 2 caracteres'),
  cnpj: z
    .string({ required_error: 'CNPJ é obrigatório' })
    .transform((val) => cleanCNPJ(val))
    .refine((val) => isValidCNPJ(val), {
      message: 'CNPJ inválido (verifique os dígitos informados)',
    }),
  active: z.boolean().optional().default(true),
});

export const updateCompanySchema = z.object({
  legalName: z.string().min(2, 'Razão Social deve ter pelo menos 2 caracteres').optional(),
  tradeName: z.string().min(2, 'Nome Fantasia deve ter pelo menos 2 caracteres').optional(),
  cnpj: z
    .string()
    .transform((val) => cleanCNPJ(val))
    .refine((val) => isValidCNPJ(val), {
      message: 'CNPJ inválido (verifique os dígitos informados)',
    })
    .optional(),
  active: z.boolean().optional(),
});

export const queryCompanySchema = z.object({
  search: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type QueryCompanyInput = z.infer<typeof queryCompanySchema>;

// -----------------------------------------------------------------------------
// UNIDADES (UNITS)
// -----------------------------------------------------------------------------

export const createUnitSchema = z.object({
  companyId: z.string({ required_error: 'ID da empresa é obrigatório' }).uuid('ID da empresa inválido'),
  name: z.string({ required_error: 'Nome da unidade é obrigatório' }).min(2, 'Nome da unidade deve ter pelo menos 2 caracteres'),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const updateUnitSchema = z.object({
  companyId: z.string().uuid('ID da empresa inválido').optional(),
  name: z.string().min(2, 'Nome da unidade deve ter pelo menos 2 caracteres').optional(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const queryUnitSchema = z.object({
  companyId: z.string().uuid().optional(),
  search: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type QueryUnitInput = z.infer<typeof queryUnitSchema>;

// -----------------------------------------------------------------------------
// SETORES / DEPARTAMENTOS (DEPARTMENTS)
// -----------------------------------------------------------------------------

export const createDepartmentSchema = z.object({
  companyId: z.string({ required_error: 'ID da empresa é obrigatório' }).uuid('ID da empresa inválido'),
  name: z.string({ required_error: 'Nome do setor é obrigatório' }).min(2, 'Nome do setor deve ter pelo menos 2 caracteres'),
  code: z.string().optional().nullable(),
  costCenter: z.string().optional().nullable(),
  parentId: z.string().uuid('ID do setor pai inválido').optional().nullable(),
  managerId: z.string().uuid('ID do gestor inválido').optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z.object({
  companyId: z.string().uuid('ID da empresa inválido').optional(),
  name: z.string().min(2, 'Nome do setor deve ter pelo menos 2 caracteres').optional(),
  code: z.string().optional().nullable(),
  costCenter: z.string().optional().nullable(),
  parentId: z.string().uuid('ID do setor pai inválido').optional().nullable(),
  managerId: z.string().uuid('ID do gestor inválido').optional().nullable(),
  active: z.boolean().optional(),
});

export const queryDepartmentSchema = z.object({
  companyId: z.string().uuid().optional(),
  search: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type QueryDepartmentInput = z.infer<typeof queryDepartmentSchema>;

// -----------------------------------------------------------------------------
// CARGOS (POSITIONS)
// -----------------------------------------------------------------------------

export const PositionLevels = [
  'Estagiário',
  'Júnior',
  'Pleno',
  'Sênior',
  'Especialista',
  'Líder Técnico',
  'Coordenador',
  'Gerente',
  'Diretor',
  'C-Level',
] as const;

export const createPositionSchema = z.object({
  departmentId: z.string().uuid('ID do setor inválido').optional().nullable(),
  title: z.string({ required_error: 'Título do cargo é obrigatório' }).min(2, 'Título do cargo deve ter pelo menos 2 caracteres'),
  level: z.string({ required_error: 'Nível de senioridade é obrigatório' }).min(1, 'Nível é obrigatório'),
  description: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  active: z.boolean().optional().default(true),
});

export const updatePositionSchema = z.object({
  departmentId: z.string().uuid('ID do setor inválido').optional().nullable(),
  title: z.string().min(2, 'Título do cargo deve ter pelo menos 2 caracteres').optional(),
  level: z.string().min(1, 'Nível é obrigatório').optional(),
  description: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const queryPositionSchema = z.object({
  departmentId: z.string().uuid().optional(),
  level: z.string().optional(),
  search: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreatePositionInput = z.infer<typeof createPositionSchema>;
export type UpdatePositionInput = z.infer<typeof updatePositionSchema>;
export type QueryPositionInput = z.infer<typeof queryPositionSchema>;
