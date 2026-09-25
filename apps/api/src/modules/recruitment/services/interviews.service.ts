import { prisma } from '../../../database/prisma.js';
import { CreateInterviewInput, UpdateInterviewInput } from '../recruitment.dto.js';

export class InterviewsService {
  static async create(data: CreateInterviewInput) {
    const application = await prisma.application.findUnique({ where: { id: data.applicationId } });
    if (!application) {
      const error: any = new Error('Candidatura não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      const error: any = new Error('Data/hora da entrevista inválida');
      error.statusCode = 400;
      throw error;
    }

    const created = await prisma.interviewSchedule.create({
      data: {
        applicationId: data.applicationId,
        scheduledAt,
        interviewers: data.interviewers ?? undefined,
        location: data.location || null,
      },
      include: {
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            jobOpening: { select: { id: true, title: true } },
          },
        },
      },
    });

    // Move automaticamente a candidatura para o estágio de entrevista, se ainda em triagem
    if (application.stage === 'TRIAGEM') {
      await prisma.application.update({
        where: { id: application.id },
        data: { stage: 'ENTREVISTA' },
      });
    }

    return created;
  }

  static async list(filters: { applicationId?: string; from?: string; to?: string }) {
    const where: any = {};
    if (filters.applicationId) where.applicationId = filters.applicationId;
    if (filters.from || filters.to) {
      where.scheduledAt = {};
      if (filters.from) where.scheduledAt.gte = new Date(filters.from);
      if (filters.to) where.scheduledAt.lte = new Date(`${filters.to}T23:59:59`);
    }

    return prisma.interviewSchedule.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          include: {
            candidate: { select: { id: true, name: true, email: true } },
            jobOpening: { select: { id: true, title: true } },
          },
        },
      },
    });
  }

  static async getById(id: string) {
    const interview = await prisma.interviewSchedule.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            candidate: true,
            jobOpening: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!interview) {
      const error: any = new Error('Entrevista não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return interview;
  }

  static async update(id: string, data: UpdateInterviewInput) {
    const existing = await prisma.interviewSchedule.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Entrevista não encontrada');
      error.statusCode = 404;
      throw error;
    }

    let scheduledAt: Date | undefined;
    if (data.scheduledAt !== undefined) {
      scheduledAt = new Date(data.scheduledAt);
      if (Number.isNaN(scheduledAt.getTime())) {
        const error: any = new Error('Data/hora da entrevista inválida');
        error.statusCode = 400;
        throw error;
      }
    }

    return prisma.interviewSchedule.update({
      where: { id },
      data: {
        ...(scheduledAt !== undefined ? { scheduledAt } : {}),
        ...(data.interviewers !== undefined ? { interviewers: data.interviewers ?? undefined } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.feedback !== undefined ? { feedback: data.feedback } : {}),
      },
    });
  }

  static async remove(id: string) {
    const existing = await prisma.interviewSchedule.findUnique({ where: { id } });
    if (!existing) {
      const error: any = new Error('Entrevista não encontrada');
      error.statusCode = 404;
      throw error;
    }

    await prisma.interviewSchedule.delete({ where: { id } });
    return { id };
  }
}
