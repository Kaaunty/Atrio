import { z } from 'zod';

export const jobRequisitionStatusEnum = z.enum(['PENDENTE', 'APROVADA', 'REJEITADA']);
export const jobOpeningStatusEnum = z.enum(['ABERTA', 'EM_ANDAMENTO', 'ENCERRADA', 'CANCELADA']);
export const applicationStageEnum = z.enum([
  'TRIAGEM',
  'ENTREVISTA',
  'AVALIACAO',
  'PARECER',
  'APROVADO',
  'REPROVADO',
]);
export const shiftTypeEnum = z.enum(['MANHA', 'TARDE', 'NOITE', 'INTEGRAL', 'ADMINISTRATIVO']);
export const contractTypeEnum = z.enum(['CLT', 'PJ', 'ESTAGIO', 'APRENDIZ', 'TEMPORARIO']);

// ==========================================
// JOB REQUISITION (Solicitação de Vaga)
// ==========================================
export const createJobRequisitionSchema = z.object({
  departmentId: z.string().uuid('ID do departamento inválido'),
  positionId: z.string().uuid('ID do cargo inválido').optional().nullable(),
  shiftType: shiftTypeEnum.optional().nullable(),
  requestedQuantity: z.number().int().min(1, 'A quantidade solicitada deve ser ao menos 1'),
  contractType: contractTypeEnum.default('CLT'),
  justification: z.string().min(10, 'A justificativa deve ter pelo menos 10 caracteres'),
  workforceRequestId: z.string().uuid().optional().nullable(),
});

export const queryJobRequisitionSchema = z.object({
  status: jobRequisitionStatusEnum.optional(),
  departmentId: z.string().uuid().optional(),
});

// ==========================================
// JOB OPENING (Vaga)
// ==========================================
export const createJobOpeningSchema = z.object({
  jobRequisitionId: z.string().uuid('ID da solicitação de vaga inválido').optional().nullable(),
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres'),
  requirements: z.string().min(3, 'Os requisitos são obrigatórios'),
  activities: z.string().optional().nullable(),
  conditions: z.string().optional().nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data limite deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  isInternal: z.boolean().default(false),
});

export const updateJobOpeningSchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres').optional(),
  requirements: z.string().min(3, 'Os requisitos são obrigatórios').optional(),
  activities: z.string().optional().nullable(),
  conditions: z.string().optional().nullable(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data limite deve estar no formato YYYY-MM-DD')
    .optional()
    .nullable(),
  status: jobOpeningStatusEnum.optional(),
  isInternal: z.boolean().optional(),
});

export const queryJobOpeningSchema = z.object({
  status: jobOpeningStatusEnum.optional(),
  isInternal: z.coerce.boolean().optional(),
});

// ==========================================
// CANDIDATE (Candidato)
// ==========================================
export const createCandidateSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().optional().nullable(),
  resumeUrl: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  experience: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
});

export const updateCandidateSchema = createCandidateSchema.partial();

export const queryCandidateSchema = z.object({
  search: z.string().optional(),
});

// ==========================================
// APPLICATION (Candidatura / Pipeline)
// ==========================================
export const createApplicationSchema = z.object({
  jobOpeningId: z.string().uuid('ID da vaga inválido'),
  candidateId: z.string().uuid('ID do candidato inválido'),
  notes: z.string().optional().nullable(),
});

export const moveApplicationStageSchema = z.object({
  stage: applicationStageEnum,
  notes: z.string().optional().nullable(),
});

export const queryApplicationSchema = z.object({
  jobOpeningId: z.string().uuid().optional(),
  candidateId: z.string().uuid().optional(),
  stage: applicationStageEnum.optional(),
});

// ==========================================
// INTERVIEW SCHEDULE (Entrevista)
// ==========================================
const interviewerSchema = z.object({
  employeeId: z.string(),
  name: z.string(),
});

export const createInterviewSchema = z.object({
  applicationId: z.string().uuid('ID da candidatura inválido'),
  scheduledAt: z.string().min(1, 'Data/hora da entrevista é obrigatória'),
  interviewers: z.array(interviewerSchema).optional().nullable(),
  location: z.string().optional().nullable(),
});

export const updateInterviewSchema = z.object({
  scheduledAt: z.string().min(1).optional(),
  interviewers: z.array(interviewerSchema).optional().nullable(),
  location: z.string().optional().nullable(),
  feedback: z.string().optional().nullable(),
});

export const queryInterviewSchema = z.object({
  applicationId: z.string().uuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateJobRequisitionInput = z.infer<typeof createJobRequisitionSchema>;
export type QueryJobRequisitionInput = z.infer<typeof queryJobRequisitionSchema>;
export type CreateJobOpeningInput = z.infer<typeof createJobOpeningSchema>;
export type UpdateJobOpeningInput = z.infer<typeof updateJobOpeningSchema>;
export type QueryJobOpeningInput = z.infer<typeof queryJobOpeningSchema>;
export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;
export type UpdateCandidateInput = z.infer<typeof updateCandidateSchema>;
export type QueryCandidateInput = z.infer<typeof queryCandidateSchema>;
export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type MoveApplicationStageInput = z.infer<typeof moveApplicationStageSchema>;
export type QueryApplicationInput = z.infer<typeof queryApplicationSchema>;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
export type QueryInterviewInput = z.infer<typeof queryInterviewSchema>;
