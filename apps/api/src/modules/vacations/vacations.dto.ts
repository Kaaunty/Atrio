import { z } from 'zod';

export const vacationPeriodStatusEnum = z.enum([
  'EM_AQUISICAO',
  'ADQUIRIDO',
  'CONCLUIDO',
  'VENCIDO',
]);

export const vacationRequestStatusEnum = z.enum([
  'PENDENTE_GESTOR',
  'PENDENTE_RH',
  'APROVADO',
  'REJEITADO',
  'CANCELADO',
]);

export const createVacationRequestSchema = z.object({
  vacationPeriodId: z.string().uuid('ID do período aquisitivo inválido'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término deve estar no formato YYYY-MM-DD'),
  sellDaysCount: z.number().int().min(0, 'Não pode ser negativo').max(10, 'Abono pecuniário máximo é de 10 dias (1/3)').default(0),
  advanceThirteenth: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export const reviewVacationSchema = z.object({
  notes: z.string().min(2, 'O parecer da avaliação é obrigatório'),
});

export const queryTeamCalendarSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  departmentId: z.string().uuid().optional(),
});

export type CreateVacationRequestInput = z.infer<typeof createVacationRequestSchema>;
export type ReviewVacationInput = z.infer<typeof reviewVacationSchema>;
export type QueryTeamCalendarInput = z.infer<typeof queryTeamCalendarSchema>;
