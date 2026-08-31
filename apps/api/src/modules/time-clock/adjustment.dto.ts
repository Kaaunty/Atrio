import { z } from 'zod';

export const adjustmentTypeEnum = z.enum([
  'INCLUSAO',
  'ALTERACAO',
  'EXCLUSAO_DUPLICADA',
  'JUSTIFICATIVA_FALTA',
]);

export const adjustmentStatusEnum = z.enum([
  'PENDENTE_GESTOR',
  'PENDENTE_RH',
  'APROVADO',
  'REJEITADO',
  'CANCELADO',
]);

export const createAdjustmentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'A data deve estar no formato YYYY-MM-DD'),
  adjustmentType: adjustmentTypeEnum,
  targetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'O horário deve estar no formato HH:mm (ex: 08:00)'),
  originalEntryId: z.string().uuid('ID de marcação original inválido').optional().nullable(),
  reason: z.string().min(3, 'O motivo deve conter pelo menos 3 caracteres'),
  notes: z.string().optional().nullable(),
  attachmentUrl: z.string().url('URL do anexo inválida').optional().nullable(),
});

export const reviewAdjustmentSchema = z.object({
  notes: z.string().min(2, 'O parecer da avaliação é obrigatório'),
});

export const queryAdjustmentsSchema = z.object({
  status: adjustmentStatusEnum.optional(),
  employeeId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departmentId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
export type ReviewAdjustmentInput = z.infer<typeof reviewAdjustmentSchema>;
export type QueryAdjustmentsInput = z.infer<typeof queryAdjustmentsSchema>;
