import { z } from 'zod';

export const AnnouncementCategoryEnum = z.enum([
  'INSTITUCIONAL',
  'CAMPANHA_RH',
  'EVENTO',
  'BENEFICIOS',
  'IMPORTANTE',
]);

export const AnnouncementTargetTypeEnum = z.enum([
  'ALL',
  'SPECIFIC_DEPARTMENTS',
  'SPECIFIC_UNITS',
  'SPECIFIC_ROLES',
]);

export const AttachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  size: z.number().optional(),
});

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  summary: z.string().min(1, 'Resumo é obrigatório'),
  content: z.string().min(1, 'Conteúdo é obrigatório'),
  category: AnnouncementCategoryEnum.default('INSTITUCIONAL'),
  coverImageUrl: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  isPinned: z.boolean().default(false),
  requiresAcknowledgement: z.boolean().default(false),
  targetType: AnnouncementTargetTypeEnum.default('ALL'),
  targetIds: z.array(z.string()).optional(),
  publishedAt: z.string().optional(), // ISO String ou YYYY-MM-DD HH:mm
  expiresAt: z.string().optional(),
  notifyUsers: z.boolean().default(true),
});

export const QueryAnnouncementsSchema = z.object({
  category: AnnouncementCategoryEnum.optional(),
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

export type CreateAnnouncementDto = z.infer<typeof CreateAnnouncementSchema>;
export type QueryAnnouncementsDto = z.infer<typeof QueryAnnouncementsSchema>;
