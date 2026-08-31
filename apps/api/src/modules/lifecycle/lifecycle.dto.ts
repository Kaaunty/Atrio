import { z } from 'zod';

export const LifecycleProcessTypeEnum = z.enum(['ONBOARDING', 'OFFBOARDING']);

export const LifecycleProcessStatusEnum = z.enum([
  'NAO_INICIADO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
]);

export const LifecycleTaskCategoryEnum = z.enum([
  'RH',
  'TI',
  'GESTOR',
  'FACILITIES',
  'COLABORADOR',
]);

export const LifecycleTaskStatusEnum = z.enum([
  'PENDENTE',
  'EM_ANDAMENTO',
  'CONCLUIDA',
  'BLOQUEADA',
  'CANCELADA',
]);

export const TemplateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: LifecycleTaskCategoryEnum.default('RH'),
  dueDaysOffset: z.number().default(0), // Prazo em dias relativo a data alvo
});

export const CreateChecklistTemplateSchema = z.object({
  name: z.string().min(1, 'Nome do template é obrigatório'),
  processType: LifecycleProcessTypeEnum,
  departmentId: z.string().uuid().optional(),
  defaultTasks: z.array(TemplateTaskSchema).min(1, 'Adicione ao menos uma tarefa modelo'),
  active: z.boolean().default(true),
});

export const CreateLifecycleProcessSchema = z.object({
  employeeId: z.string().uuid('ID do colaborador é obrigatório'),
  processType: LifecycleProcessTypeEnum,
  templateId: z.string().uuid().optional(),
  targetDate: z.string().min(1, 'Data alvo é obrigatória'), // YYYY-MM-DD
  customTasks: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: LifecycleTaskCategoryEnum.default('RH'),
        dueDate: z.string().optional(),
      })
    )
    .optional(),
});

export const QueryLifecycleProcessesSchema = z.object({
  processType: LifecycleProcessTypeEnum.optional(),
  status: LifecycleProcessStatusEnum.optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

export const CompleteTaskSchema = z.object({
  notes: z.string().optional(),
});

export type CreateChecklistTemplateDto = z.infer<typeof CreateChecklistTemplateSchema>;
export type CreateLifecycleProcessDto = z.infer<typeof CreateLifecycleProcessSchema>;
export type QueryLifecycleProcessesDto = z.infer<typeof QueryLifecycleProcessesSchema>;
export type CompleteTaskDto = z.infer<typeof CompleteTaskSchema>;
