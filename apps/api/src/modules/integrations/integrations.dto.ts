import { z } from 'zod';
import { IntegrationCategory, IntegrationStatus, SyncStatus, SyncTrigger } from '@prisma/client';

export const CreateDeviceSchema = z.object({
  name: z.string().min(2, 'O nome do dispositivo deve ter no mínimo 2 caracteres'),
  serialNumber: z.string().min(3, 'O número de série deve ter no mínimo 3 caracteres'),
  model: z.string().min(2, 'O modelo do relógio é obrigatório (Ex: iDClass, iDFit)'),
  ipAddress: z.string().nullable().optional(),
  port: z.number().int().positive().nullable().optional().default(80),
  unitId: z.string().uuid('ID da Unidade inválido').nullable().optional(),
  integrationKey: z.string().optional().default('control_id'),
  apiEndpoint: z.string().nullable().optional(),
  authCredentials: z.record(z.any()).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export type CreateDeviceInput = z.infer<typeof CreateDeviceSchema>;

export const UpdateDeviceSchema = CreateDeviceSchema.partial();
export type UpdateDeviceInput = z.infer<typeof UpdateDeviceSchema>;

export const ToggleIntegrationSchema = z.object({
  enabled: z.boolean(),
});

export type ToggleIntegrationInput = z.infer<typeof ToggleIntegrationSchema>;

export const UpdateIntegrationSettingsSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  settings: z.record(z.any()).optional(),
  status: z.nativeEnum(IntegrationStatus).optional(),
});

export type UpdateIntegrationSettingsInput = z.infer<typeof UpdateIntegrationSettingsSchema>;

export const TriggerManualSyncSchema = z.object({
  deviceId: z.string().uuid().nullable().optional(),
  startDate: z.string().datetime().or(z.string()).optional(),
  endDate: z.string().datetime().or(z.string()).optional(),
});

export type TriggerManualSyncInput = z.infer<typeof TriggerManualSyncSchema>;

export const TestConnectionSchema = z.object({
  deviceId: z.string().uuid().optional(),
  ipAddress: z.string().optional(),
  port: z.number().int().optional(),
  serialNumber: z.string().optional(),
  apiEndpoint: z.string().optional(),
  authCredentials: z.record(z.any()).optional(),
});

export type TestConnectionInput = z.infer<typeof TestConnectionSchema>;

export const UploadAfdSchema = z.object({
  content: z.string().min(10, 'Conteúdo do arquivo AFD vazio ou inválido'),
  deviceId: z.string().uuid().nullable().optional(),
});

export type UploadAfdInput = z.infer<typeof UploadAfdSchema>;
