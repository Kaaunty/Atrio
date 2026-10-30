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

export const queryRhPeriodsSchema = z.object({
  companyId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  status: vacationPeriodStatusEnum.optional(),
  urgency: z.enum(['VENCIDO', 'CRITICO', 'ALERTA', 'NORMAL']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});

export const scheduleVacationRhSchema = z.object({
  vacationPeriodId: z.string().uuid('ID do período aquisitivo inválido'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de término deve estar no formato YYYY-MM-DD'),
  sellDaysCount: z.coerce.number().int().min(0).max(10).default(0),
  advanceThirteenth: z.boolean().default(false),
  notes: z.string().optional().nullable(),
  autoApprove: z.boolean().default(true),
});

export const updateVacationPeriodRhSchema = z.object({
  daysEntitled: z.coerce.number().int().min(0).max(60).optional(),
  daysTaken: z.coerce.number().int().min(0).max(60).optional(),
  daysScheduled: z.coerce.number().int().min(0).max(60).optional(),
  daysRemaining: z.coerce.number().int().min(0).max(60).optional(),
  deadlineDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vestingStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vestingEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateVacationRequestInput = z.infer<typeof createVacationRequestSchema>;
export type ReviewVacationInput = z.infer<typeof reviewVacationSchema>;
export type QueryTeamCalendarInput = z.infer<typeof queryTeamCalendarSchema>;
export type QueryRhPeriodsInput = z.infer<typeof queryRhPeriodsSchema>;
export type ScheduleVacationRhInput = z.infer<typeof scheduleVacationRhSchema>;
export type UpdateVacationPeriodRhInput = z.infer<typeof updateVacationPeriodRhSchema>;
