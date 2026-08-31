import { z } from 'zod';

export const NotificationCategoryEnum = z.enum([
  'PONTO',
  'FERIAS',
  'SOLICITACAO',
  'DOCUMENTO',
  'COMUNICADO',
  'SISTEMA',
]);

export const NotificationTypeEnum = z.enum([
  'INFO',
  'WARNING',
  'SUCCESS',
  'ACTION_REQUIRED',
]);

export const GetNotificationsQuerySchema = z.object({
  unreadOnly: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 15)),
});

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: NotificationTypeEnum.default('INFO'),
  category: NotificationCategoryEnum.default('SISTEMA'),
  actionUrl: z.string().optional(),
  sendEmail: z.boolean().default(false),
});

export type GetNotificationsQueryDto = z.infer<typeof GetNotificationsQuerySchema>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
