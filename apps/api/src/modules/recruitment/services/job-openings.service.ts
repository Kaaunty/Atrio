import { prisma } from '../../../database/prisma.js';
import { CreateJobOpeningInput, UpdateJobOpeningInput } from '../recruitment.dto.js';

export class JobOpeningsService {
  /**
   * RH cria uma vaga, a partir de uma solicitação aprovada ou diretamente
   */
  static async create(actorUserId: string, data: CreateJobOpeningInput) {
    if (data.jobRequisitionId) {
      const requisition = await prisma.jobRequisition.findUnique({
        where: { id: data.jobRequisitionId },
      });

      if (!requisition) {
        const error: any = new Error('Solicitação de vaga não encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (requisition.status !== 'APROVADA') {
        const error: any = new Error(
          'A vaga só pode ser criada a partir de uma solicitação já aprovada'
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const created = await prisma.jobOpening.create({
      data: {
        jobRequisitionId: data.jobRequisitionId || null,
        title: data.title,
        requirements: data.requirements,
        activities: data.activities || null,
        conditions: data.conditions || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        isInternal: data.isInternal,
      },
      include: {
        jobRequisition: {
          select: { id: true, departmentId: true, workforceRequestId: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'VAGA_CRIADA',
        entity: 'JobOpening',
        recordId: created.id,
        newValue: { title: data.title, status: 'ABERTA' },
      },
    });

    return created;
  }

  static async list(filters: { status?: string; isInternal?: boolean }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.isInternal !== undefined) where.isInternal = filters.isInternal;

    const openings = await prisma.jobOpening.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        jobRequisition: {
          select: { id: true, departmentId: true, workforceRequestId: true, department: { select: { name: true } } },
        },
        applications: { select: { id: true, stage: true } },
      },
    });

    return openings.map((opening) => ({
      ...opening,
      applicationsCount: opening.applications.length,
    }));
  }

  static async getById(id: string) {
    const opening = await prisma.jobOpening.findUnique({
      where: { id },
      include: {
        jobRequisition: {
          include: { department: { select: { id: true, name: true } } },
        },
        applications: {
          orderBy: { appliedAt: 'desc' },
          include: {
            candidate: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!opening) {
      const error: any = new Error('Vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return opening;
  }

  static async update(id: string, actorUserId: string, data: UpdateJobOpeningInput) {
    const existing = await prisma.jobOpening.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.jobOpening.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.requirements !== undefined ? { requirements: data.requirements } : {}),
        ...(data.activities !== undefined ? { activities: data.activities } : {}),
        ...(data.conditions !== undefined ? { conditions: data.conditions } : {}),
        ...(data.deadline !== undefined
          ? { deadline: data.deadline ? new Date(data.deadline) : null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.isInternal !== undefined ? { isInternal: data.isInternal } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'VAGA_ATUALIZADA',
        entity: 'JobOpening',
        recordId: id,
        previousValue: { status: existing.status },
        newValue: { status: updated.status },
      },
    });

    return updated;
  }

  static async remove(id: string, actorUserId: string) {
    const existing = await prisma.jobOpening.findUnique({
      where: { id },
      include: { applications: true },
    });
    if (!existing) {
      const error: any = new Error('Vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (existing.applications.length > 0) {
      const error: any = new Error(
        'Não é possível excluir uma vaga que já possui candidaturas vinculadas. Cancele-a ao invés de excluir.'
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.jobOpening.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'VAGA_EXCLUIDA',
        entity: 'JobOpening',
        recordId: id,
        previousValue: { title: existing.title },
      },
    });

    return { id };
  }
}
