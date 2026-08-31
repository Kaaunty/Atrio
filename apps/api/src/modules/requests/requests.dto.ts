import { z } from 'zod';

export const approverTypeEnum = z.enum([
  'DIRECT_MANAGER',
  'DEPARTMENT_HEAD',
  'SPECIFIC_ROLE',
  'SPECIFIC_USER',
]);

export const requestPriorityEnum = z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']);

export const requestStatusEnum = z.enum([
  'RASCUNHO',
  'ABERTO',
  'EM_ANDAMENTO',
  'AGUARDANDO_GESTOR',
  'AGUARDANDO_RH',
  'APROVADO',
  'REJEITADO',
  'CONCLUIDO',
  'CANCELADO',
]);

export const createRequestTypeSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  category: z.string().default('GERAL'),
  icon: z.string().optional().nullable(),
  formSchema: z.any().optional(),
  allowAttachments: z.boolean().default(true),
  steps: z
    .array(
      z.object({
        name: z.string(),
        approverType: approverTypeEnum,
        requiredRoleId: z.string().uuid().optional().nullable(),
        timeoutDays: z.number().int().positive().optional().nullable(),
      })
    )
    .optional(),
});

export const createRequestSchema = z.object({
  requestTypeCode: z.string().min(1, 'Tipo de solicitação é obrigatório'),
  title: z.string().min(3, 'O título deve conter pelo menos 3 caracteres'),
  description: z.string().optional().nullable(),
  priority: requestPriorityEnum.default('MEDIA'),
  formData: z.record(z.any()).optional().nullable(),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
      })
    )
    .optional(),
});

export const reviewStepSchema = z.object({
  comment: z.string().min(2, 'O parecer da avaliação é obrigatório'),
});

export const addCommentSchema = z.object({
  comment: z.string().min(1, 'O comentário não pode ser vazio'),
});

export const queryRequestsSchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  priority: requestPriorityEnum.optional(),
  requesterId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateRequestTypeInput = z.infer<typeof createRequestTypeSchema>;
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type ReviewStepInput = z.infer<typeof reviewStepSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type QueryRequestsInput = z.infer<typeof queryRequestsSchema>;
