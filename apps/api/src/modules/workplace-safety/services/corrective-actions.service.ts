import { prisma } from '../../../database/prisma.js';
import { CreateCorrectiveActionInput, UpdateCorrectiveActionInput } from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

function invalid(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 422;
  throw error;
}

const includeRelations = {
  accident: { select: { id: true, type: true, occurredAt: true, description: true } },
  inspection: { select: { id: true, inspectionDate: true, irregularitiesFound: true } },
};

export class CorrectiveActionsService {
  static async list(filters: { status?: string; sourceType?: string; accidentId?: string; inspectionId?: string }) {
    return prisma.correctiveAction.findMany({
      where: {
        status: filters.status as any,
        sourceType: filters.sourceType as any,
        accidentId: filters.accidentId,
        inspectionId: filters.inspectionId,
      },
      orderBy: { dueDate: 'asc' },
      include: includeRelations,
    });
  }

  static async getById(id: string) {
    const action = await prisma.correctiveAction.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!action) notFound('Ação corretiva não encontrada');
    return action;
  }

  static async create(data: CreateCorrectiveActionInput) {
    if (data.sourceType === 'ACCIDENT') {
      if (!data.accidentId) {
        invalid('Informe o acidente/incidente de origem para uma ação corretiva do tipo ACCIDENT');
      }
      const accident = await prisma.workplaceAccident.findUnique({ where: { id: data.accidentId } });
      if (!accident) notFound('Acidente/incidente de origem não encontrado');
    }
    if (data.sourceType === 'INSPECTION') {
      if (!data.inspectionId) {
        invalid('Informe a inspeção de origem para uma ação corretiva do tipo INSPECTION');
      }
      const inspection = await prisma.safetyInspection.findUnique({ where: { id: data.inspectionId } });
      if (!inspection) notFound('Inspeção de origem não encontrada');
    }

    return prisma.correctiveAction.create({
      data: {
        sourceType: data.sourceType,
        accidentId: data.sourceType === 'ACCIDENT' ? data.accidentId || null : null,
        inspectionId: data.sourceType === 'INSPECTION' ? data.inspectionId || null : null,
        description: data.description,
        responsibleId: data.responsibleId || null,
        dueDate: new Date(data.dueDate),
        status: data.status,
      },
      include: includeRelations,
    });
  }

  static async update(id: string, data: UpdateCorrectiveActionInput) {
    const existing = await prisma.correctiveAction.findUnique({ where: { id } });
    if (!existing) notFound('Ação corretiva não encontrada');

    const isCompleting = data.status === 'CONCLUIDA' && existing.status !== 'CONCLUIDA';
    const isReopening = data.status && data.status !== 'CONCLUIDA' && existing.status === 'CONCLUIDA';

    return prisma.correctiveAction.update({
      where: { id },
      data: {
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.responsibleId !== undefined ? { responsibleId: data.responsibleId || null } : {}),
        ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(isCompleting ? { completedAt: new Date() } : {}),
        ...(isReopening ? { completedAt: null } : {}),
      },
      include: includeRelations,
    });
  }

  static async remove(id: string) {
    const existing = await prisma.correctiveAction.findUnique({ where: { id } });
    if (!existing) notFound('Ação corretiva não encontrada');
    await prisma.correctiveAction.delete({ where: { id } });
    return { id };
  }
}
