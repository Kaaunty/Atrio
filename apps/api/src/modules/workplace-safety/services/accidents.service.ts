import { prisma } from '../../../database/prisma.js';
import { CreateWorkplaceAccidentInput, UpdateWorkplaceAccidentInput } from '../workplace-safety.dto.js';

function notFound(message: string): never {
  const error: any = new Error(message);
  error.statusCode = 404;
  throw error;
}

const includeRelations = {
  department: { select: { id: true, name: true } },
  employee: { select: { id: true, name: true, registrationNumber: true } },
  correctiveActions: { orderBy: { dueDate: 'asc' as const } },
};

export class AccidentsService {
  static async list(filters: { status?: string; type?: string; departmentId?: string }) {
    return prisma.workplaceAccident.findMany({
      where: {
        status: filters.status as any,
        type: filters.type as any,
        departmentId: filters.departmentId,
      },
      orderBy: { occurredAt: 'desc' },
      include: includeRelations,
    });
  }

  static async getById(id: string) {
    const accident = await prisma.workplaceAccident.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!accident) notFound('Registro de acidente/incidente não encontrado');
    return accident;
  }

  static async create(data: CreateWorkplaceAccidentInput) {
    const employeeDepartmentId = data.employeeId
      ? await this.getEmployeeDepartmentId(data.employeeId)
      : undefined;

    return prisma.workplaceAccident.create({
      data: {
        departmentId: data.employeeId ? employeeDepartmentId : data.departmentId ?? null,
        employeeId: data.employeeId || null,
        type: data.type,
        occurredAt: new Date(data.occurredAt),
        description: data.description,
        investigation: data.investigation || null,
        correctiveActionsSummary: data.correctiveActionsSummary || null,
        catNumber: data.catNumber || null,
        catIssuedAt: data.catIssuedAt ? new Date(data.catIssuedAt) : null,
        status: data.status,
      },
      include: includeRelations,
    });
  }

  static async update(id: string, data: UpdateWorkplaceAccidentInput) {
    const existing = await prisma.workplaceAccident.findUnique({ where: { id } });
    if (!existing) notFound('Registro de acidente/incidente não encontrado');

    const employeeDepartmentId = data.employeeId
      ? await this.getEmployeeDepartmentId(data.employeeId)
      : undefined;

    return prisma.workplaceAccident.update({
      where: { id },
      data: {
        ...(data.departmentId !== undefined || data.employeeId !== undefined
          ? {
              departmentId: data.employeeId
                ? employeeDepartmentId
                : data.departmentId ?? null,
            }
          : {}),
        ...(data.employeeId !== undefined ? { employeeId: data.employeeId || null } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.occurredAt !== undefined ? { occurredAt: new Date(data.occurredAt) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.investigation !== undefined ? { investigation: data.investigation || null } : {}),
        ...(data.correctiveActionsSummary !== undefined
          ? { correctiveActionsSummary: data.correctiveActionsSummary || null }
          : {}),
        ...(data.catNumber !== undefined ? { catNumber: data.catNumber || null } : {}),
        ...(data.catIssuedAt !== undefined
          ? { catIssuedAt: data.catIssuedAt ? new Date(data.catIssuedAt) : null }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: includeRelations,
    });
  }

  private static async getEmployeeDepartmentId(employeeId: string): Promise<string | null> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { departmentId: true },
    });
    if (!employee) notFound('Colaborador envolvido não encontrado');
    return employee.departmentId;
  }

  static async remove(id: string) {
    const existing = await prisma.workplaceAccident.findUnique({ where: { id } });
    if (!existing) notFound('Registro de acidente/incidente não encontrado');
    await prisma.workplaceAccident.delete({ where: { id } });
    return { id };
  }
}
