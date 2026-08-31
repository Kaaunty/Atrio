import { z } from 'zod';

export const DocumentVisibilityEnum = z.enum([
  'PRIVATE_EMPLOYEE_RH',
  'DEPARTMENT',
  'COMPANY_WIDE',
]);

export const createSingleDocumentSchema = z.object({
  documentTypeId: z.string().min(1, 'Tipo de documento é obrigatório'),
  employeeId: z.string().min(1, 'Colaborador é obrigatório'),
  title: z.string().min(2, 'Título do documento é obrigatório'),
  description: z.string().optional().nullable(),
  fileUrl: z.string().min(1, 'URL/caminho do arquivo é obrigatório'),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  fileSize: z.number().int().positive('Tamanho do arquivo deve ser positivo'),
  mimeType: z.string().min(1, 'MIME type do arquivo é obrigatório'),
  referenceMonth: z.number().int().min(1).max(12).optional().nullable(),
  referenceYear: z.number().int().min(2000).max(2100).optional().nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de validade deve estar em YYYY-MM-DD').optional().nullable(),
});

export const batchItemSchema = z.object({
  registrationOrCpf: z.string().min(1, 'Matrícula ou CPF é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  fileUrl: z.string().min(1, 'URL do arquivo é obrigatória'),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
});

export const uploadBatchSchema = z.object({
  documentTypeCode: z.string().default('HOLERITE'),
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2000).max(2100),
  items: z.array(batchItemSchema).min(1, 'Lista de arquivos em lote não pode estar vazia'),
});

export const publishInstitutionalDocumentSchema = z.object({
  documentTypeId: z.string().min(1, 'Tipo de documento é obrigatório'),
  title: z.string().min(2, 'Título da publicação é obrigatório'),
  description: z.string().optional().nullable(),
  fileUrl: z.string().min(1, 'URL do arquivo é obrigatória'),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  visibility: z.enum(['DEPARTMENT', 'COMPANY_WIDE']).default('COMPANY_WIDE'),
  departmentId: z.string().optional().nullable(),
  requiresReadAcknowledgement: z.boolean().default(false),
});

export type CreateSingleDocumentDTO = z.infer<typeof createSingleDocumentSchema>;
export type UploadBatchDTO = z.infer<typeof uploadBatchSchema>;
export type PublishInstitutionalDocumentDTO = z.infer<typeof publishInstitutionalDocumentSchema>;
