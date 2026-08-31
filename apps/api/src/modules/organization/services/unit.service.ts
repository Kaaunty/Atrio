import { prisma } from '../../../database/prisma.js';
import { CreateUnitInput, QueryUnitInput, UpdateUnitInput } from '../organization.dto.js';

export class UnitService {
  static async list(query: QueryUnitInput) {
    const { companyId, active, search } = query;

    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const units = await prisma.unit.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
          },
        },
      },
    });

    return units;
  }

  static async getById(id: string) {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
      },
    });

    if (!unit) {
      const error: any = new Error('Unidade de trabalho não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return unit;
  }

  static async create(data: CreateUnitInput) {
    const company = await prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
    });

    if (!company) {
      const error: any = new Error('Empresa informada não existe ou foi inativada');
      error.statusCode = 404;
      throw error;
    }

    return prisma.unit.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        city: data.city ?? null,
        state: data.state ?? null,
        address: data.address ?? null,
        active: data.active ?? true,
      },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
          },
        },
      },
    });
  }

  static async update(id: string, data: UpdateUnitInput) {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });

    if (!unit) {
      const error: any = new Error('Unidade de trabalho não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (data.companyId && data.companyId !== unit.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, deletedAt: null },
      });

      if (!company) {
        const error: any = new Error('Empresa informada não existe');
        error.statusCode = 404;
        throw error;
      }
    }

    return prisma.unit.update({
      where: { id },
      data: {
        ...(data.companyId ? { companyId: data.companyId } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
          },
        },
      },
    });
  }

  static async delete(id: string) {
    const unit = await prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });

    if (!unit) {
      const error: any = new Error('Unidade de trabalho não encontrada');
      error.statusCode = 404;
      throw error;
    }

    await prisma.unit.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    return { success: true, message: 'Unidade removida com sucesso' };
  }
}
