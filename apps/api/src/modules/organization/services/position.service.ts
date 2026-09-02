import { prisma } from '../../../database/prisma.js';
import {
  CreatePositionInput,
  QueryPositionInput,
  UpdatePositionInput,
} from '../organization.dto.js';

export class PositionService {
  static async list(query: QueryPositionInput) {
    const { departmentId, level, active, search, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (level) {
      where.level = level;
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { responsibilities: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, positions] = await Promise.all([
      prisma.position.count({ where }),
      prisma.position.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ title: 'asc' }],
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
              company: {
                select: {
                  id: true,
                  tradeName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      items: positions,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async getById(id: string) {
    const position = await prisma.position.findFirst({
      where: { id, deletedAt: null },
      include: {
        department: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!position) {
      const error: any = new Error('Cargo não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return position;
  }

  static async create(data: CreatePositionInput) {
    if (data.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: data.departmentId, deletedAt: null },
      });

      if (!department) {
        const error: any = new Error('Setor informado não existe ou está inativo');
        error.statusCode = 404;
        throw error;
      }
    }

    return prisma.position.create({
      data: {
        departmentId: data.departmentId ?? null,
        title: data.title,
        level: data.level,
        description: data.description ?? null,
        responsibilities: data.responsibilities ?? null,
        active: data.active ?? true,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            company: {
              select: {
                id: true,
                tradeName: true,
              },
            },
          },
        },
      },
    });
  }

  static async update(id: string, data: UpdatePositionInput) {
    const position = await prisma.position.findFirst({
      where: { id, deletedAt: null },
    });

    if (!position) {
      const error: any = new Error('Cargo não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.departmentId && data.departmentId !== position.departmentId) {
      const department = await prisma.department.findFirst({
        where: { id: data.departmentId, deletedAt: null },
      });

      if (!department) {
        const error: any = new Error('Setor informado não existe');
        error.statusCode = 404;
        throw error;
      }
    }

    return prisma.position.update({
      where: { id },
      data: {
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(data.title ? { title: data.title } : {}),
        ...(data.level ? { level: data.level } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.responsibilities !== undefined ? { responsibilities: data.responsibilities } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
            company: {
              select: {
                id: true,
                tradeName: true,
              },
            },
          },
        },
      },
    });
  }

  static async delete(id: string) {
    const position = await prisma.position.findFirst({
      where: { id, deletedAt: null },
    });

    if (!position) {
      const error: any = new Error('Cargo não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Desvincula colaboradores deste cargo
    await prisma.employee.updateMany({
      where: { positionId: id, deletedAt: null },
      data: { positionId: null },
    });

    await prisma.position.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    return { success: true, message: 'Cargo removido com sucesso' };
  }
}
