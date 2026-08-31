import { z } from 'zod';
import { isValidCPF } from '../../shared/utils/cpf.js';

export const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  complement: z.string().optional(),
});

export const emergencyContactSchema = z.object({
  name: z.string().optional(),
  relationship: z.string().optional(),
  phone: z.string().optional(),
});

export const contractTypeEnum = z.enum([
  'CLT',
  'PJ',
  'ESTAGIO',
  'APRENDIZ',
  'TEMPORARIO',
]);

export const employeeStatusEnum = z.enum([
  'ATIVO',
  'FERIAS',
  'AFASTADO',
  'DESLIGADO',
]);

export const timelineEventTypeEnum = z.enum([
  'ADMISSAO',
  'MUDANCA_CARGO',
  'MUDANCA_SETOR',
  'MUDANCA_GESTOR',
  'ALTERACAO_SALARIAL',
  'FERIAS',
  'AFASTAMENTO',
  'DESLIGAMENTO',
  'OUTRO',
]);

export const createEmployeeSchema = z.object({
  name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres'),
  cpf: z
    .string()
    .min(11, 'CPF inválido')
    .refine((val) => isValidCPF(val), {
      message: 'CPF matematicamente inválido',
    }),
  email: z.string().email('E-mail corporativo ou pessoal inválido'),
  registrationNumber: z
    .string()
    .min(1, 'A matrícula do colaborador é obrigatória'),
  code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined)),
  address: addressSchema.optional().nullable(),
  emergencyContact: emergencyContactSchema.optional().nullable(),
  avatarUrl: z.string().url('URL do avatar inválida').optional().nullable(),
  salary: z.coerce.number().min(0, 'Salário deve ser maior ou igual a zero').optional().nullable(),

  companyId: z.string().uuid('ID da empresa inválido'),
  unitId: z.string().uuid('ID da unidade inválido').optional().nullable(),
  departmentId: z.string().uuid('ID do setor inválido').optional().nullable(),
  positionId: z.string().uuid('ID do cargo inválido').optional().nullable(),
  managerId: z.string().uuid('ID do gestor inválido').optional().nullable(),
  userId: z.string().uuid('ID do usuário de acesso inválido').optional().nullable(),

  admissionDate: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val : new Date(val))),
  contractType: contractTypeEnum.optional().default('CLT'),
  workScheduleId: z.string().optional().nullable(),
  status: employeeStatusEnum.optional().default('ATIVO'),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2, 'O nome deve conter pelo menos 2 caracteres').optional(),
  cpf: z
    .string()
    .min(11, 'CPF inválido')
    .refine((val) => isValidCPF(val), {
      message: 'CPF matematicamente inválido',
    })
    .optional(),
  email: z.string().email('E-mail corporativo ou pessoal inválido').optional(),
  registrationNumber: z.string().min(1, 'A matrícula não pode ficar vazia').optional(),
  code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined)),
  address: addressSchema.optional().nullable(),
  emergencyContact: emergencyContactSchema.optional().nullable(),
  avatarUrl: z.string().url('URL do avatar inválida').optional().nullable(),
  salary: z.coerce.number().min(0, 'Salário deve ser maior ou igual a zero').optional().nullable(),

  companyId: z.string().uuid('ID da empresa inválido').optional(),
  unitId: z.string().uuid('ID da unidade inválido').optional().nullable(),
  departmentId: z.string().uuid('ID do setor inválido').optional().nullable(),
  positionId: z.string().uuid('ID do cargo inválido').optional().nullable(),
  managerId: z.string().uuid('ID do gestor inválido').optional().nullable(),
  userId: z.string().uuid('ID do usuário de acesso inválido').optional().nullable(),

  admissionDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  contractType: contractTypeEnum.optional(),
  workScheduleId: z.string().optional().nullable(),
  status: employeeStatusEnum.optional(),
  terminationDate: z
    .union([z.string(), z.date()])
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined)),

  // Campos auxiliares para registro customizado na Timeline
  reason: z.string().optional(),
  eventDate: z
    .union([z.string(), z.date()])
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
});

export const createTimelineEventSchema = z.object({
  eventType: timelineEventTypeEnum,
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
  eventDate: z
    .union([z.string(), z.date()])
    .transform((val) => (val instanceof Date ? val : new Date(val))),
  previousData: z.record(z.any()).optional().nullable(),
  newData: z.record(z.any()).optional().nullable(),
});

export const queryEmployeeSchema = z.object({
  search: z.string().optional(),
  companyId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  status: employeeStatusEnum.optional(),
  contractType: contractTypeEnum.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateEmployeeInput = z.input<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.input<typeof updateEmployeeSchema>;
export type CreateTimelineEventInput = z.input<typeof createTimelineEventSchema>;
export type QueryEmployeeInput = z.input<typeof queryEmployeeSchema>;
