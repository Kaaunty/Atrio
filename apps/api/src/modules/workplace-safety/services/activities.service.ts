import { prisma } from '../../../database/prisma.js';
import {
  CreateSafetyActivityInput,
  UpdateSafetyActivityInput,
  AddActivityParticipantsInput,
} from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

const includeRelations = {
  department: { select: { id: true, name: true } },
  participants: {
    include: {
      employee: { select: { id: true, name: true, registrationNumber: true } },
    },
  },
};

export class ActivitiesService {
  static async list(filters: { type?: string; departmentId?: string }) {
    return prisma.safetyActivity.findMany({
      where: {
        type: filters.type as any,
        departmentId: filters.departmentId,
      },
      orderBy: { activityDate: 'desc' },
      include: includeRelations,
    });
  }

  static async getById(id: string) {
    const activity = await prisma.safetyActivity.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!activity) notFound('Atividade de segurança não encontrada');
    return activity;
  }

  static async create(data: CreateSafetyActivityInput) {
    const { participantIds, ...rest } = data;

    return prisma.safetyActivity.create({
      data: {
        type: rest.type,
        title: rest.title,
        departmentId: rest.departmentId || null,
        activityDate: new Date(rest.activityDate),
        topics: rest.topics || null,
        responsibleId: rest.responsibleId || null,
        participants: participantIds?.length
          ? {
              create: participantIds.map((employeeId) => ({ employeeId, attended: true })),
            }
          : undefined,
      },
      include: includeRelations,
    });
  }

  static async update(id: string, data: UpdateSafetyActivityInput) {
    const existing = await prisma.safetyActivity.findUnique({ where: { id } });
    if (!existing) notFound('Atividade de segurança não encontrada');

    return prisma.safetyActivity.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
        ...(data.activityDate !== undefined ? { activityDate: new Date(data.activityDate) } : {}),
        ...(data.topics !== undefined ? { topics: data.topics || null } : {}),
        ...(data.responsibleId !== undefined ? { responsibleId: data.responsibleId || null } : {}),
      },
      include: includeRelations,
    });
  }

  static async remove(id: string) {
    const existing = await prisma.safetyActivity.findUnique({ where: { id } });
    if (!existing) notFound('Atividade de segurança não encontrada');
    await prisma.safetyActivity.delete({ where: { id } });
    return { id };
  }

  // ----- Participantes -----

  static async addParticipants(activityId: string, data: AddActivityParticipantsInput) {
    const activity = await prisma.safetyActivity.findUnique({ where: { id: activityId } });
    if (!activity) notFound('Atividade de segurança não encontrada');

    await prisma.$transaction(
      data.employeeIds.map((employeeId) =>
        prisma.safetyActivityParticipant.upsert({
          where: {
            safetyActivityId_employeeId: {
              safetyActivityId: activityId,
              employeeId,
            },
          },
          update: {},
          create: { safetyActivityId: activityId, employeeId, attended: true },
        })
      )
    );

    return this.getById(activityId);
  }

  static async setParticipantAttendance(participantId: string, attended: boolean) {
    const participant = await prisma.safetyActivityParticipant.findUnique({ where: { id: participantId } });
    if (!participant) notFound('Participante não encontrado nesta atividade');

    return prisma.safetyActivityParticipant.update({
      where: { id: participantId },
      data: { attended },
    });
  }

  static async removeParticipant(participantId: string) {
    const participant = await prisma.safetyActivityParticipant.findUnique({ where: { id: participantId } });
    if (!participant) notFound('Participante não encontrado nesta atividade');
    await prisma.safetyActivityParticipant.delete({ where: { id: participantId } });
    return { id: participantId };
  }
}
