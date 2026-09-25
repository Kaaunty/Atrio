import { z } from 'zod';

const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateOnlyField = (message = 'Data deve estar no formato YYYY-MM-DD') =>
  z.string().regex(dateOnlyRegex, message);

// -----------------------------------------------------------------------------
// EPIs (Ppe) + Movimentações (PpeDelivery)
// -----------------------------------------------------------------------------

export const ppeMovementTypeEnum = z.enum(['ENTREGA', 'SUBSTITUICAO', 'DEVOLUCAO']);

export const createPpeSchema = z.object({
  name: z.string().min(2, 'Nome do EPI é obrigatório'),
  ca: z.string().min(1, 'Certificado de Aprovação (CA) é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  stockQuantity: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export const updatePpeSchema = createPpeSchema.partial();

export const createPpeDeliverySchema = z.object({
  ppeId: z.string().uuid('EPI inválido'),
  employeeId: z.string().uuid('Colaborador inválido'),
  movementType: ppeMovementTypeEnum,
  quantity: z.number().int().min(1).default(1),
  deliveryDate: dateOnlyField().optional(),
  returnDate: dateOnlyField().optional().nullable(),
  reason: z.string().optional().nullable(),
  signatureConfirmed: z.boolean().default(false),
});

export type CreatePpeInput = z.infer<typeof createPpeSchema>;
export type UpdatePpeInput = z.infer<typeof updatePpeSchema>;
export type CreatePpeDeliveryInput = z.infer<typeof createPpeDeliverySchema>;

// -----------------------------------------------------------------------------
// Acidentes / Incidentes (WorkplaceAccident)
// -----------------------------------------------------------------------------

export const safetyEventTypeEnum = z.enum(['ACIDENTE', 'INCIDENTE', 'QUASE_ACIDENTE']);
export const safetyEventStatusEnum = z.enum(['ABERTO', 'EM_INVESTIGACAO', 'CONCLUIDO']);

export const createWorkplaceAccidentSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  type: safetyEventTypeEnum,
  occurredAt: z.string().min(1, 'Data/hora da ocorrência é obrigatória'),
  description: z.string().min(2, 'Descrição é obrigatória'),
  investigation: z.string().optional().nullable(),
  correctiveActionsSummary: z.string().optional().nullable(),
  catNumber: z.string().optional().nullable(),
  catIssuedAt: dateOnlyField().optional().nullable(),
  status: safetyEventStatusEnum.default('ABERTO'),
});

export const updateWorkplaceAccidentSchema = createWorkplaceAccidentSchema.partial();

export type CreateWorkplaceAccidentInput = z.infer<typeof createWorkplaceAccidentSchema>;
export type UpdateWorkplaceAccidentInput = z.infer<typeof updateWorkplaceAccidentSchema>;

// -----------------------------------------------------------------------------
// Inspeções (SafetyInspection)
// -----------------------------------------------------------------------------

export const checklistItemSchema = z.object({
  item: z.string().min(1),
  status: z.string().min(1),
  observation: z.string().optional().nullable(),
});

export const createSafetyInspectionSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  inspectorId: z.string().uuid('Inspetor responsável é obrigatório'),
  inspectionDate: dateOnlyField('Data da inspeção deve estar no formato YYYY-MM-DD'),
  checklist: z.array(checklistItemSchema).default([]),
  irregularitiesFound: z.string().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  status: safetyEventStatusEnum.default('ABERTO'),
});

export const updateSafetyInspectionSchema = createSafetyInspectionSchema.partial();

export type CreateSafetyInspectionInput = z.infer<typeof createSafetyInspectionSchema>;
export type UpdateSafetyInspectionInput = z.infer<typeof updateSafetyInspectionSchema>;

// -----------------------------------------------------------------------------
// CIPA: Membros (CipaMember) e Reuniões (CipaMeeting)
// -----------------------------------------------------------------------------

export const cipaMemberRoleEnum = z.enum(['REPRESENTANTE_EMPREGADOR', 'REPRESENTANTE_EMPREGADO']);

export const createCipaMemberSchema = z.object({
  employeeId: z.string().uuid('Colaborador é obrigatório'),
  role: cipaMemberRoleEnum,
  termStart: dateOnlyField('Data de início do mandato deve estar no formato YYYY-MM-DD'),
  termEnd: dateOnlyField('Data de término do mandato deve estar no formato YYYY-MM-DD'),
  active: z.boolean().default(true),
});

export const updateCipaMemberSchema = createCipaMemberSchema.partial();

export const pendingActionSchema = z.object({
  description: z.string().min(1),
  responsible: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  done: z.boolean().default(false),
});

export const createCipaMeetingSchema = z.object({
  meetingDate: dateOnlyField('Data da reunião deve estar no formato YYYY-MM-DD'),
  minutes: z.string().min(2, 'Ata da reunião é obrigatória'),
  pendingActions: z.array(pendingActionSchema).optional().nullable(),
});

export const updateCipaMeetingSchema = createCipaMeetingSchema.partial();

export type CreateCipaMemberInput = z.infer<typeof createCipaMemberSchema>;
export type UpdateCipaMemberInput = z.infer<typeof updateCipaMemberSchema>;
export type CreateCipaMeetingInput = z.infer<typeof createCipaMeetingSchema>;
export type UpdateCipaMeetingInput = z.infer<typeof updateCipaMeetingSchema>;

// -----------------------------------------------------------------------------
// Atividades SIPATMA/DDS (SafetyActivity + SafetyActivityParticipant)
// -----------------------------------------------------------------------------

export const safetyActivityTypeEnum = z.enum(['SIPATMA', 'DDS']);

export const createSafetyActivitySchema = z.object({
  type: safetyActivityTypeEnum,
  title: z.string().min(2, 'Título da atividade é obrigatório'),
  departmentId: z.string().uuid().optional().nullable(),
  activityDate: dateOnlyField('Data da atividade deve estar no formato YYYY-MM-DD'),
  topics: z.string().optional().nullable(),
  responsibleId: z.string().uuid().optional().nullable(),
  participantIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateSafetyActivitySchema = createSafetyActivitySchema.partial();

export const addActivityParticipantsSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, 'Selecione ao menos um colaborador'),
});

export const updateActivityParticipantSchema = z.object({
  attended: z.boolean(),
});

export type CreateSafetyActivityInput = z.infer<typeof createSafetyActivitySchema>;
export type UpdateSafetyActivityInput = z.infer<typeof updateSafetyActivitySchema>;
export type AddActivityParticipantsInput = z.infer<typeof addActivityParticipantsSchema>;
export type UpdateActivityParticipantInput = z.infer<typeof updateActivityParticipantSchema>;

// -----------------------------------------------------------------------------
// Documentos de SST (SafetyDocument)
// -----------------------------------------------------------------------------

export const safetyDocumentTypeEnum = z.enum(['PGR', 'PCMSO', 'LTCAT', 'OUTRO']);

export const createSafetyDocumentSchema = z.object({
  type: safetyDocumentTypeEnum,
  title: z.string().min(2, 'Título do documento é obrigatório'),
  fileUrl: z.string().min(1, 'Arquivo (URL) é obrigatório'),
  issueDate: dateOnlyField('Data de emissão deve estar no formato YYYY-MM-DD'),
  expiryDate: dateOnlyField('Data de validade deve estar no formato YYYY-MM-DD').optional().nullable(),
  active: z.boolean().default(true),
});

export const updateSafetyDocumentSchema = createSafetyDocumentSchema.partial();

export type CreateSafetyDocumentInput = z.infer<typeof createSafetyDocumentSchema>;
export type UpdateSafetyDocumentInput = z.infer<typeof updateSafetyDocumentSchema>;

// -----------------------------------------------------------------------------
// Ações Corretivas (CorrectiveAction)
// -----------------------------------------------------------------------------

export const correctiveActionSourceEnum = z.enum(['ACCIDENT', 'INSPECTION']);
export const correctiveActionStatusEnum = z.enum(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA']);

export const createCorrectiveActionSchema = z
  .object({
    sourceType: correctiveActionSourceEnum,
    accidentId: z.string().uuid().optional().nullable(),
    inspectionId: z.string().uuid().optional().nullable(),
    description: z.string().min(2, 'Descrição da ação corretiva é obrigatória'),
    responsibleId: z.string().uuid().optional().nullable(),
    dueDate: dateOnlyField('Prazo deve estar no formato YYYY-MM-DD'),
    status: correctiveActionStatusEnum.default('PENDENTE'),
  })
  .refine(
    (data) =>
      (data.sourceType === 'ACCIDENT' && !!data.accidentId) ||
      (data.sourceType === 'INSPECTION' && !!data.inspectionId),
    {
      message: 'Informe o acidente ou a inspeção de origem compatível com o tipo de origem selecionado',
      path: ['sourceType'],
    }
  );

export const updateCorrectiveActionSchema = z.object({
  description: z.string().min(2).optional(),
  responsibleId: z.string().uuid().optional().nullable(),
  dueDate: dateOnlyField('Prazo deve estar no formato YYYY-MM-DD').optional(),
  status: correctiveActionStatusEnum.optional(),
});

export type CreateCorrectiveActionInput = z.infer<typeof createCorrectiveActionSchema>;
export type UpdateCorrectiveActionInput = z.infer<typeof updateCorrectiveActionSchema>;
