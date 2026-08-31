import { z } from 'zod';

export const MedicalCertificateReasonCategoryEnum = z.enum([
  'CONSULTA',
  'EXAME',
  'DOENCA_ATE_15D',
  'DOENCA_SUPERIOR_15D',
  'ACIDENTE_TRABALHO',
  'MATERNIDADE',
  'ACOMPANHAMENTO_FAMILIAR',
  'DOACAO_SANGUE',
  'OUTROS',
]);

export const MedicalCertificateStatusEnum = z.enum([
  'ENVIADO',
  'EM_ANALISE_RH',
  'APROVADO',
  'REJEITADO',
  'SOLICITADO_CORRECAO',
]);

export const LeaveTypeEnum = z.enum([
  'ATESTADO_MEDICO',
  'LICENCA_MATERNIDADE',
  'LICENCA_PATERNIDADE',
  'AUXILIO_DOENCA_INSS',
  'ACIDENTE_TRABALHO_INSS',
  'LICENCA_NAO_REMUNERADA',
  'OUTRO',
]);

export const createMedicalCertificateSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de início deve estar no formato YYYY-MM-DD'),
  daysCount: z.number().int().min(1, 'Quantidade de dias deve ser no mínimo 1'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de emissão deve estar no formato YYYY-MM-DD'),
  doctorName: z.string().min(2, 'Nome do médico é obrigatório'),
  crmNumber: z.string().min(2, 'Número de CRM / CRO é obrigatório'),
  cidCode: z.string().optional().nullable(),
  reasonCategory: MedicalCertificateReasonCategoryEnum.default('DOENCA_ATE_15D'),
  notes: z.string().optional().nullable(),
  documentUrl: z.string().min(1, 'Arquivo do atestado é obrigatório'),
});

export type CreateMedicalCertificateDTO = z.infer<typeof createMedicalCertificateSchema>;

export const approveCertificateSchema = z.object({
  rhReviewNotes: z.string().optional().nullable(),
});

export const rejectCertificateSchema = z.object({
  rhReviewNotes: z.string().min(3, 'Motivo da rejeição é obrigatório'),
});

export const requestCorrectionSchema = z.object({
  rhReviewNotes: z.string().min(3, 'Motivo da solicitação de correção é obrigatório'),
});

export type ApproveCertificateDTO = z.infer<typeof approveCertificateSchema>;
export type RejectCertificateDTO = z.infer<typeof rejectCertificateSchema>;
export type RequestCorrectionDTO = z.infer<typeof requestCorrectionSchema>;
