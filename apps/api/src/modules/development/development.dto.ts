import { z } from 'zod';

export const TrainingCategoryEnum = z.enum([
  'OBRIGATORIO_LEGAL',
  'INSTITUCIONAL',
  'TECNICO',
  'LIDERANCA',
  'OPCIONAL',
]);

export const FeedbackTypeEnum = z.enum([
  'POSITIVO',
  'DESENVOLVIMENTO',
  'REUNIAO_1ON1',
  'ALINHAMENTO',
]);

export const FeedbackVisibilityEnum = z.enum([
  'PRIVATE_MANAGER_EMPLOYEE',
  'MANAGER_ONLY',
  'RH_ACCESSIBLE',
]);

export const DevelopmentGoalStatusEnum = z.enum([
  'NAO_INICIADO',
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'CANCELADO',
]);

export const CreateTrainingSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  category: TrainingCategoryEnum.default('INSTITUCIONAL'),
  validityMonths: z.number().int().optional(),
  workloadHours: z.number().int().min(1).default(1),
  provider: z.string().default('Interno'),
  active: z.boolean().default(true),
});

export const AssignTrainingSchema = z.object({
  trainingId: z.string().uuid(),
  employeeIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um colaborador'),
});

export const UploadCertificateSchema = z.object({
  certificateUrl: z.string().min(1, 'URL do certificado é obrigatória'),
});

export const ActionItemSchema = z.object({
  task: z.string().min(1),
  deadline: z.string().optional(),
  completed: z.boolean().default(false),
});

export const CreateFeedbackSchema = z.object({
  employeeId: z.string().uuid('ID do colaborador é obrigatório'),
  feedbackType: FeedbackTypeEnum.default('REUNIAO_1ON1'),
  subject: z.string().min(1, 'Assunto é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  actionItems: z.array(ActionItemSchema).optional(),
  visibility: FeedbackVisibilityEnum.default('PRIVATE_MANAGER_EMPLOYEE'),
  feedbackDate: z.string().optional(),
});

export const CreateDevelopmentPlanSchema = z.object({
  employeeId: z.string().uuid('ID do colaborador é obrigatório'),
  mentorId: z.string().uuid().optional(),
  title: z.string().min(1, 'Título do PDI é obrigatório'),
  periodYear: z.number().int().default(2026),
});

export const CreateGoalSchema = z.object({
  title: z.string().min(1, 'Título da meta é obrigatório'),
  competency: z.string().min(1, 'Competência é obrigatória'),
  targetDate: z.string().min(1, 'Data alvo é obrigatória'),
  actionSteps: z.string().optional(),
});

export const UpdateGoalSchema = z.object({
  status: DevelopmentGoalStatusEnum.optional(),
  actionSteps: z.string().optional(),
  evidenceNotes: z.string().optional(),
});

export type CreateTrainingDto = z.infer<typeof CreateTrainingSchema>;
export type AssignTrainingDto = z.infer<typeof AssignTrainingSchema>;
export type UploadCertificateDto = z.infer<typeof UploadCertificateSchema>;
export type CreateFeedbackDto = z.infer<typeof CreateFeedbackSchema>;
export type CreateDevelopmentPlanDto = z.infer<typeof CreateDevelopmentPlanSchema>;
export type CreateGoalDto = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalDto = z.infer<typeof UpdateGoalSchema>;
