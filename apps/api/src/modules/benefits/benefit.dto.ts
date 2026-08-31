import { z } from 'zod';

export const BenefitCategoryEnum = z.enum([
  'ALIMENTACAO',
  'TRANSPORTE',
  'SAUDE',
  'ODONTOLOGICO',
  'EDUCACAO',
  'CONVENIO',
  'OUTRO',
]);

export const EmployeeBenefitStatusEnum = z.enum([
  'ATIVO',
  'SUSPENSO',
  'CANCELADO',
]);

export const DependentSchema = z.object({
  name: z.string().min(1),
  relationship: z.string().min(1),
  birthDate: z.string().optional(),
  cpf: z.string().optional(),
});

export const CreateBenefitSchema = z.object({
  name: z.string().min(1, 'Nome do benefício é obrigatório'),
  provider: z.string().min(1, 'Fornecedor é obrigatório'),
  category: BenefitCategoryEnum.default('ALIMENTACAO'),
  description: z.string().optional(),
  deductionRule: z.string().optional(),
  active: z.boolean().default(true),
});

export const AssignEmployeeBenefitSchema = z.object({
  benefitId: z.string().uuid('ID do benefício inválido'),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
  cardNumberLast4: z.string().optional(),
  monthlyValue: z.number().min(0).default(0),
  employeeDeductionValue: z.number().min(0).default(0),
  dependentsIncluded: z.array(DependentSchema).optional(),
});

export const UpdateEmployeeBenefitSchema = z.object({
  status: EmployeeBenefitStatusEnum.optional(),
  endDate: z.string().optional(),
  cardNumberLast4: z.string().optional(),
  monthlyValue: z.number().min(0).optional(),
  employeeDeductionValue: z.number().min(0).optional(),
  dependentsIncluded: z.array(DependentSchema).optional(),
});

export type CreateBenefitDto = z.infer<typeof CreateBenefitSchema>;
export type AssignEmployeeBenefitDto = z.infer<typeof AssignEmployeeBenefitSchema>;
export type UpdateEmployeeBenefitDto = z.infer<typeof UpdateEmployeeBenefitSchema>;
