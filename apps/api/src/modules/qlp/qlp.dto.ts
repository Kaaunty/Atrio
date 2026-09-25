import { z } from 'zod';

export const shiftTypeEnum = z.enum(['MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'ADMINISTRATIVO']);
export const laborClassificationEnum = z.enum(['DIRETA', 'INDIRETA']);
export const contractTypeEnum = z.enum(['CLT', 'PJ', 'ESTAGIO', 'APRENDIZ', 'TEMPORARIO']);
export const workforceRequestTypeEnum = z.enum(['REPOSICAO', 'COBERTURA_AFASTAMENTO', 'AMPLIACAO']);
export const workforceRequestStatusEnum = z.enum([
  'PENDENTE',
  'APROVADO',
  'REJEITADO',
  'ENCAMINHADO_RECRUTAMENTO',
]);
export const workforceRequestDecisionEnum = z.enum(['APROVADO', 'REJEITADO', 'ENCAMINHADO_RECRUTAMENTO']);

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD');

// ==========================================
// PARÂMETROS DE DIMENSIONAMENTO
// ==========================================

export const createWorkforceParameterSchema = z
  .object({
    departmentId: z.string().uuid('Setor inválido'),
    positionId: z.string().uuid('Função inválida').optional().nullable(),
    shiftType: shiftTypeEnum.optional().nullable(),
    laborClassification: laborClassificationEnum.default('DIRETA'),
    minQuantity: z.number().int().min(0, 'Não pode ser negativo'),
    plannedQuantity: z.number().int().min(0, 'Não pode ser negativo'),
    maxQuantity: z.number().int().min(0, 'Não pode ser negativo'),
    allowedContractTypes: z
      .array(contractTypeEnum)
      .min(1, 'Selecione ao menos um tipo de vínculo permitido'),
    effectiveFrom: dateStringSchema,
    effectiveTo: dateStringSchema.optional().nullable(),
    active: z.boolean().default(true),
  })
  .refine((data) => data.minQuantity <= data.plannedQuantity, {
    message: 'A quantidade mínima não pode ser maior que a quantidade ideal',
    path: ['minQuantity'],
  })
  .refine((data) => data.plannedQuantity <= data.maxQuantity, {
    message: 'A quantidade ideal não pode ser maior que a quantidade máxima',
    path: ['plannedQuantity'],
  });

export const updateWorkforceParameterSchema = z
  .object({
    departmentId: z.string().uuid('Setor inválido').optional(),
    positionId: z.string().uuid('Função inválida').optional().nullable(),
    shiftType: shiftTypeEnum.optional().nullable(),
    laborClassification: laborClassificationEnum.optional(),
    minQuantity: z.number().int().min(0, 'Não pode ser negativo').optional(),
    plannedQuantity: z.number().int().min(0, 'Não pode ser negativo').optional(),
    maxQuantity: z.number().int().min(0, 'Não pode ser negativo').optional(),
    allowedContractTypes: z.array(contractTypeEnum).min(1).optional(),
    effectiveFrom: dateStringSchema.optional(),
    effectiveTo: dateStringSchema.optional().nullable(),
    active: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.minQuantity === undefined ||
      data.plannedQuantity === undefined ||
      data.minQuantity <= data.plannedQuantity,
    { message: 'A quantidade mínima não pode ser maior que a quantidade ideal', path: ['minQuantity'] }
  )
  .refine(
    (data) =>
      data.plannedQuantity === undefined ||
      data.maxQuantity === undefined ||
      data.plannedQuantity <= data.maxQuantity,
    { message: 'A quantidade ideal não pode ser maior que a quantidade máxima', path: ['plannedQuantity'] }
  );

export const queryParametersSchema = z.object({
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  shiftType: shiftTypeEnum.optional(),
  laborClassification: laborClassificationEnum.optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

// ==========================================
// PAINEL / CONSULTA DE LOTAÇÃO
// ==========================================

export const queryDashboardSchema = z.object({
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  shiftType: shiftTypeEnum.optional(),
  contractType: contractTypeEnum.optional(),
  laborClassification: laborClassificationEnum.optional(),
});

export const queryEmployeesSchema = z.object({
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  shiftType: shiftTypeEnum.optional(),
  contractType: contractTypeEnum.optional(),
  laborClassification: laborClassificationEnum.optional(),
  status: z.enum(['ATIVO', 'FERIAS', 'AFASTADO', 'DESLIGADO']).optional(),
});

// ==========================================
// SOLICITAÇÕES DE MOVIMENTAÇÃO DE QUADRO
// ==========================================

export const createWorkforceRequestSchema = z.object({
  departmentId: z.string().uuid('Setor inválido'),
  positionId: z.string().uuid('Função inválida').optional().nullable(),
  shiftType: shiftTypeEnum.optional().nullable(),
  requestType: workforceRequestTypeEnum,
  quantity: z.number().int().min(1, 'A quantidade deve ser de ao menos 1 vaga'),
  justification: z.string().min(10, 'Justifique a solicitação com ao menos 10 caracteres'),
});

export const decideWorkforceRequestSchema = z.object({
  status: workforceRequestDecisionEnum,
  decisionNote: z.string().min(2, 'O parecer da decisão é obrigatório'),
});

export const queryRequestsSchema = z.object({
  departmentId: z.string().uuid().optional(),
  status: workforceRequestStatusEnum.optional(),
  requestType: workforceRequestTypeEnum.optional(),
});

export type CreateWorkforceParameterInput = z.infer<typeof createWorkforceParameterSchema>;
export type UpdateWorkforceParameterInput = z.infer<typeof updateWorkforceParameterSchema>;
export type QueryParametersInput = z.infer<typeof queryParametersSchema>;
export type QueryDashboardInput = z.infer<typeof queryDashboardSchema>;
export type QueryEmployeesInput = z.infer<typeof queryEmployeesSchema>;
export type CreateWorkforceRequestInput = z.infer<typeof createWorkforceRequestSchema>;
export type DecideWorkforceRequestInput = z.infer<typeof decideWorkforceRequestSchema>;
export type QueryRequestsInput = z.infer<typeof queryRequestsSchema>;
