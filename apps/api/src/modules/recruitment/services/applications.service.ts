import { prisma } from '../../../database/prisma.js';
import { CreateApplicationInput } from '../recruitment.dto.js';

// Transições válidas do funil de recrutamento. TRIAGEM é o estágio inicial;
// APROVADO/REPROVADO são estágios finais (não permitem novas transições).
const STAGE_FLOW: Record<string, string[]> = {
  TRIAGEM: ['ENTREVISTA', 'REPROVADO'],
  ENTREVISTA: ['AVALIACAO', 'TRIAGEM', 'REPROVADO'],
  AVALIACAO: ['PARECER', 'ENTREVISTA', 'REPROVADO'],
  PARECER: ['APROVADO', 'REPROVADO', 'AVALIACAO'],
  APROVADO: [],
  REPROVADO: [],
};

export class ApplicationsService {
  /**
   * Vincula um candidato a uma vaga, iniciando o funil de seleção em TRIAGEM
   */
  static async create(data: CreateApplicationInput) {
    const [opening, candidate] = await Promise.all([
      prisma.jobOpening.findUnique({ where: { id: data.jobOpeningId } }),
      prisma.candidate.findUnique({ where: { id: data.candidateId } }),
    ]);

    if (!opening) {
      const error: any = new Error('Vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (!candidate) {
      const error: any = new Error('Candidato não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (['ENCERRADA', 'CANCELADA'].includes(opening.status)) {
      const error: any = new Error('Não é possível candidatar a uma vaga encerrada ou cancelada');
      error.statusCode = 400;
      throw error;
    }

    const existing = await prisma.application.findUnique({
      where: {
        jobOpeningId_candidateId: {
          jobOpeningId: data.jobOpeningId,
          candidateId: data.candidateId,
        },
      },
    });

    if (existing) {
      const error: any = new Error('Este candidato já possui uma candidatura para esta vaga');
      error.statusCode = 409;
      throw error;
    }

    const created = await prisma.application.create({
      data: {
        jobOpeningId: data.jobOpeningId,
        candidateId: data.candidateId,
        notes: data.notes || null,
      },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        jobOpening: { select: { id: true, title: true } },
      },
    });

    if (opening.status === 'ABERTA') {
      await prisma.jobOpening.update({
        where: { id: opening.id },
        data: { status: 'EM_ANDAMENTO' },
      });
    }

    return created;
  }

  static async list(filters: { jobOpeningId?: string; candidateId?: string; stage?: string }) {
    const where: any = {};
    if (filters.jobOpeningId) where.jobOpeningId = filters.jobOpeningId;
    if (filters.candidateId) where.candidateId = filters.candidateId;
    if (filters.stage) where.stage = filters.stage;

    return prisma.application.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        candidate: { select: { id: true, name: true, email: true, phone: true } },
        jobOpening: { select: { id: true, title: true, status: true } },
        interviews: { orderBy: { scheduledAt: 'desc' } },
      },
    });
  }

  static async getById(id: string) {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: true,
        jobOpening: { include: { jobRequisition: { select: { id: true, departmentId: true } } } },
        interviews: { orderBy: { scheduledAt: 'desc' } },
      },
    });

    if (!application) {
      const error: any = new Error('Candidatura não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return application;
  }

  /**
   * Move a candidatura para outro estágio do funil de seleção.
   * IMPORTANTE: mover para APROVADO apenas altera o status — não cria Employee
   * automaticamente. A efetivação (criação do colaborador) é um passo manual do DP/RH.
   */
  static async moveStage(id: string, stage: string, notes?: string | null) {
    const application = await prisma.application.findUnique({ where: { id } });
    if (!application) {
      const error: any = new Error('Candidatura não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (application.stage === stage) {
      const error: any = new Error(`A candidatura já está no estágio ${stage}`);
      error.statusCode = 400;
      throw error;
    }

    const allowedNextStages = STAGE_FLOW[application.stage] || [];
    if (!allowedNextStages.includes(stage)) {
      const error: any = new Error(
        `Transição inválida: não é possível mover de ${application.stage} para ${stage}`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.application.update({
      where: { id },
      data: {
        stage: stage as any,
        ...(notes !== undefined ? { notes } : {}),
      },
      include: {
        candidate: { select: { id: true, name: true, email: true } },
        jobOpening: { select: { id: true, title: true } },
      },
    });

    return updated;
  }

  static async remove(id: string) {
    const existing = await prisma.application.findUnique({
      where: { id },
      include: { interviews: true },
    });
    if (!existing) {
      const error: any = new Error('Candidatura não encontrada');
      error.statusCode = 404;
      throw error;
    }

    await prisma.application.delete({ where: { id } });
    return { id };
  }
}
