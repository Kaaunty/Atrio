import { prisma } from '../../../database/prisma.js';
import { cleanCNPJ } from '../../../shared/utils/cnpj.js';
import { CreateCompanyInput, QueryCompanyInput, UpdateCompanyInput } from '../organization.dto.js';

export class CompanyService {
  static async list(query: QueryCompanyInput) {
    const { search, active, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (active !== undefined) {
      where.active = active;
    }

    if (search) {
      where.OR = [
        { legalName: { contains: search, mode: 'insensitive' } },
        { tradeName: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              units: { where: { deletedAt: null } },
              departments: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    return {
      items: companies,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  static async getById(id: string) {
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
      include: {
        units: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
        departments: {
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!company) {
      const error: any = new Error('Empresa não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return company;
  }

  static async create(data: CreateCompanyInput) {
    const cleanedCnpj = cleanCNPJ(data.cnpj);

    const existing = await prisma.company.findFirst({
      where: { cnpj: cleanedCnpj, deletedAt: null },
    });

    if (existing) {
      const error: any = new Error('Já existe uma empresa ativa cadastrada com este CNPJ');
      error.statusCode = 400;
      throw error;
    }

    return prisma.company.create({
      data: {
        legalName: data.legalName,
        tradeName: data.tradeName,
        cnpj: cleanedCnpj,
        active: data.active ?? true,
      },
    });
  }

  static async update(id: string, data: UpdateCompanyInput) {
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
    });

    if (!company) {
      const error: any = new Error('Empresa não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const cleanedCnpj = data.cnpj ? cleanCNPJ(data.cnpj) : undefined;

    if (cleanedCnpj && cleanedCnpj !== company.cnpj) {
      const existing = await prisma.company.findFirst({
        where: {
          cnpj: cleanedCnpj,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existing) {
        const error: any = new Error('Já existe outra empresa ativa cadastrada com este CNPJ');
        error.statusCode = 400;
        throw error;
      }
    }

    return prisma.company.update({
      where: { id },
      data: {
        ...(data.legalName ? { legalName: data.legalName } : {}),
        ...(data.tradeName ? { tradeName: data.tradeName } : {}),
        ...(cleanedCnpj ? { cnpj: cleanedCnpj } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
    });
  }

  static async delete(id: string) {
    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
    });

    if (!company) {
      const error: any = new Error('Empresa não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();

    // Soft delete em cascata da empresa, suas unidades e setores
    await prisma.$transaction([
      prisma.company.update({
        where: { id },
        data: { deletedAt: now, active: false },
      }),
      prisma.unit.updateMany({
        where: { companyId: id, deletedAt: null },
        data: { deletedAt: now, active: false },
      }),
      prisma.department.updateMany({
        where: { companyId: id, deletedAt: null },
        data: { deletedAt: now, active: false },
      }),
    ]);

    return { success: true, message: 'Empresa removida com sucesso' };
  }
}
