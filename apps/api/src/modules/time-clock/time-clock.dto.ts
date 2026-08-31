import { z } from 'zod';

export const scheduleIntervalSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora esperado HH:MM (ex: 08:00)'),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato de hora esperado HH:MM (ex: 12:00)'),
});

export const scheduleRuleDaySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0: Domingo, 1: Segunda, ..., 6: Sábado
  isWorkDay: z.boolean(),
  expectedWorkMinutes: z.number().int().min(0),
  intervals: z.array(scheduleIntervalSchema).default([]),
});

export const createWorkScheduleSchema = z.object({
  name: z.string().min(2, 'O nome da jornada deve ter no mínimo 2 caracteres'),
  description: z.string().optional().nullable(),
  weeklyHours: z.coerce.number().int().positive().default(44),
  toleranceMinutes: z.coerce.number().int().min(0).default(10),
  lunchIntervalMinutes: z.coerce.number().int().min(0).default(60),
  flexibleInterval: z.boolean().default(true),
  scheduleRules: z.array(scheduleRuleDaySchema).min(1, 'Defina as regras para os dias da semana'),
  active: z.boolean().default(true),
});

export const updateWorkScheduleSchema = z.object({
  name: z.string().min(2, 'O nome da jornada deve ter no mínimo 2 caracteres').optional(),
  description: z.string().optional().nullable(),
  weeklyHours: z.coerce.number().int().positive().optional(),
  toleranceMinutes: z.coerce.number().int().min(0).optional(),
  lunchIntervalMinutes: z.coerce.number().int().min(0).optional(),
  flexibleInterval: z.boolean().optional(),
  scheduleRules: z.array(scheduleRuleDaySchema).optional(),
  active: z.boolean().optional(),
});

export const queryMonthlySummarySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const queryDailyRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data YYYY-MM-DD'),
  employeeId: z.string().uuid().optional(),
});

export const recalculateTimeSchema = z.object({
  employeeId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const manualAdjustmentSchema = z.object({
  employeeId: z.string().uuid('ID do colaborador inválido'),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de ano/mês YYYY-MM obrigatório'),
  minutes: z.coerce.number().int(),
  reason: z.string().min(3, 'A justificativa do ajuste manual deve ter ao menos 3 caracteres'),
});

export type ScheduleInterval = z.infer<typeof scheduleIntervalSchema>;
export type ScheduleRuleDay = z.infer<typeof scheduleRuleDaySchema>;
export type CreateWorkScheduleInput = z.infer<typeof createWorkScheduleSchema>;
export type UpdateWorkScheduleInput = z.infer<typeof updateWorkScheduleSchema>;
export type QueryMonthlySummaryInput = z.infer<typeof queryMonthlySummarySchema>;
export type QueryDailyRangeInput = z.infer<typeof queryDailyRangeSchema>;
export type RecalculateTimeInput = z.infer<typeof recalculateTimeSchema>;
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;
