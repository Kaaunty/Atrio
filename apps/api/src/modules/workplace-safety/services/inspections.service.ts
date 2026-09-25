import { prisma } from '../../../database/prisma.js';
import { CreateSafetyInspectionInput, UpdateSafetyInspectionInput } from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

function badRequest(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 400;
  throw error;
}

const includeRelations = {
  department: { select: { id: true, name: true } },
  correctiveActions: { orderBy: { dueDate: 'asc' as const } },
};

export class InspectionsService {
  static async list(filters: { status?: string; departmentId?: string }) {
    return prisma.safetyInspection.findMany({
      where: {
        status: filters.status as any,
        departmentId: filters.departmentId,
      },
      orderBy: { inspectionDate: 'desc' },
      include: includeRelations,
    });
  }

  static async getById(id: string) {
    const inspection = await prisma.safetyInspection.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!inspection) notFound('Inspeção de segurança não encontrada');
    return inspection;
  }

  static async create(data: CreateSafetyInspectionInput) {
    await this.validateResponsibleDepartment(data.responsibleId, data.departmentId);

    return prisma.safetyInspection.create({
      data: {
        departmentId: data.departmentId || null,
        inspectorId: data.inspectorId,
        inspectionDate: new Date(data.inspectionDate),
        checklist: data.checklist as any,
        irregularitiesFound: data.irregularitiesFound || null,
        responsibleId: data.responsibleId || null,
        status: data.status,
      },
      include: includeRelations,
    });
  }

  static async update(id: string, data: UpdateSafetyInspectionInput) {
    const existing = await prisma.safetyInspection.findUnique({ where: { id } });
    if (!existing) notFound('Inspeção de segurança não encontrada');

    await this.validateResponsibleDepartment(
      data.responsibleId !== undefined ? data.responsibleId : existing.responsibleId,
      data.departmentId !== undefined ? data.departmentId : existing.departmentId
    );

    return prisma.safetyInspection.update({
      where: { id },
      data: {
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId || null } : {}),
        ...(data.inspectorId !== undefined ? { inspectorId: data.inspectorId } : {}),
        ...(data.inspectionDate !== undefined ? { inspectionDate: new Date(data.inspectionDate) } : {}),
        ...(data.checklist !== undefined ? { checklist: data.checklist as any } : {}),
        ...(data.irregularitiesFound !== undefined
          ? { irregularitiesFound: data.irregularitiesFound || null }
          : {}),
        ...(data.responsibleId !== undefined ? { responsibleId: data.responsibleId || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: includeRelations,
    });
  }

  private static async validateResponsibleDepartment(responsibleId?: string | null, departmentId?: string | null) {
    if (!responsibleId || !departmentId) return;

    const employee = await prisma.employee.findUnique({
      where: { id: responsibleId },
      select: { departmentId: true },
    });
    if (!employee) notFound('Responsável pela área não encontrado');
    if (employee.departmentId !== departmentId) {
      badRequest('O responsável pela área deve pertencer ao setor selecionado');
    }
  }

  static async remove(id: string) {
    const existing = await prisma.safetyInspection.findUnique({ where: { id } });
    if (!existing) notFound('Inspeção de segurança não encontrada');
    await prisma.safetyInspection.delete({ where: { id } });
    return { id };
  }
}
