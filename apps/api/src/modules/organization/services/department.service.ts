import { prisma } from '../../../database/prisma.js';
import {
  CreateDepartmentInput,
  QueryDepartmentInput,
  UpdateDepartmentInput,
} from '../organization.dto.js';

export interface DepartmentTreeNode {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  costCenter: string | null;
  parentId: string | null;
  managerId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  positionsCount: number;
  children: DepartmentTreeNode[];
}

export class DepartmentService {
  /**
   * Verifica se a atribuição de parentId causaria uma referência circular.
   * Lança erro caso um ciclo seja detectado.
   */
  static async validateHierarchyCycle(departmentId: string, targetParentId: string): Promise<void> {
    if (departmentId === targetParentId) {
      const error: any = new Error('Um setor não pode ter a si mesmo como setor superior.');
      error.statusCode = 400;
      throw error;
    }

    let currentParentId: string | null = targetParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        const error: any = new Error('Ciclo de hierarquia preexistente detectado no banco de dados.');
        error.statusCode = 400;
        throw error;
      }
      visited.add(currentParentId);

      if (currentParentId === departmentId) {
        const error: any = new Error(
          'Referência circular detectada: um setor não pode ter como superior um de seus próprios subsetores.'
        );
        error.statusCode = 400;
        throw error;
      }

      const parentDept: { parentId: string | null } | null = await prisma.department.findFirst({
        where: { id: currentParentId, deletedAt: null },
        select: { parentId: true },
      });

      currentParentId = parentDept?.parentId ?? null;
    }
  }

  static async list(query: QueryDepartmentInput) {
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
        { code: { contains: search, mode: 'insensitive' } },
        { costCenter: { contains: search, mode: 'insensitive' } },
      ];
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        company: {
          select: { id: true, legalName: true, tradeName: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            positions: { where: { deletedAt: null } },
          },
        },
      },
    });

    return departments;
  }

  static async getById(id: string) {
    const department = await prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        parent: true,
        children: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: {
                positions: { where: { deletedAt: null } },
                children: { where: { deletedAt: null } },
              },
            },
          },
        },
        positions: {
          where: { deletedAt: null },
          orderBy: { title: 'asc' },
        },
      },
    });

    if (!department) {
      const error: any = new Error('Setor não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return department;
  }

  /**
   * Constrói e retorna a árvore completa dos setores.
   */
  static async getTree(query: QueryDepartmentInput): Promise<DepartmentTreeNode[]> {
    const { companyId, active } = query;

    const where: any = {
      deletedAt: null,
    };

    if (companyId) {
      where.companyId = companyId;
    }

    if (active !== undefined) {
      where.active = active;
    }

    const allDepartments = await prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            positions: { where: { deletedAt: null } },
          },
        },
      },
    });

    return this.buildTreeNodes(allDepartments);
  }

  /**
   * Função utilitária pura para montagem recursiva da árvore de setores.
   */
  static buildTreeNodes(departments: any[]): DepartmentTreeNode[] {
    const nodesMap = new Map<string, DepartmentTreeNode>();
    const roots: DepartmentTreeNode[] = [];

    // Cria os nós iniciais
    for (const d of departments) {
      nodesMap.set(d.id, {
        id: d.id,
        companyId: d.companyId,
        name: d.name,
        code: d.code,
        costCenter: d.costCenter,
        parentId: d.parentId,
        managerId: d.managerId,
        active: d.active,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        positionsCount: d._count?.positions ?? 0,
        children: [],
      });
    }

    // Vincula filhos aos pais
    for (const d of departments) {
      const node = nodesMap.get(d.id)!;
      if (d.parentId && nodesMap.has(d.parentId)) {
        const parentNode = nodesMap.get(d.parentId)!;
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  static async create(data: CreateDepartmentInput) {
    const company = await prisma.company.findFirst({
      where: { id: data.companyId, deletedAt: null },
    });

    if (!company) {
      const error: any = new Error('Empresa informada não existe ou está inativa');
      error.statusCode = 404;
      throw error;
    }

    if (data.parentId) {
      const parent = await prisma.department.findFirst({
        where: { id: data.parentId, deletedAt: null },
      });

      if (!parent) {
        const error: any = new Error('Setor superior informado não foi encontrado');
        error.statusCode = 404;
        throw error;
      }
    }

    return prisma.department.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        code: data.code ?? null,
        costCenter: data.costCenter ?? null,
        parentId: data.parentId ?? null,
        managerId: data.managerId ?? null,
        active: data.active ?? true,
      },
      include: {
        company: {
          select: { id: true, legalName: true, tradeName: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  static async update(id: string, data: UpdateDepartmentInput) {
    const department = await prisma.department.findFirst({
      where: { id, deletedAt: null },
    });

    if (!department) {
      const error: any = new Error('Setor não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.parentId !== undefined && data.parentId !== null) {
      if (data.parentId !== department.parentId) {
        // Valida se o parent existe
        const parent = await prisma.department.findFirst({
          where: { id: data.parentId, deletedAt: null },
        });

        if (!parent) {
          const error: any = new Error('Setor superior informado não foi encontrado');
          error.statusCode = 404;
          throw error;
        }

        // Validação anti-ciclo
        await this.validateHierarchyCycle(id, data.parentId);
      }
    }

    return prisma.department.update({
      where: { id },
      data: {
        ...(data.companyId ? { companyId: data.companyId } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.costCenter !== undefined ? { costCenter: data.costCenter } : {}),
        ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
        ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
      },
      include: {
        company: {
          select: { id: true, legalName: true, tradeName: true },
        },
        parent: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  static async delete(id: string) {
    const department = await prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            children: { where: { deletedAt: null } },
            positions: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!department) {
      const error: any = new Error('Setor não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (department._count.children > 0) {
      const error: any = new Error(
        `Não é possível remover o setor "${department.name}" pois ele possui ${department._count.children} subsetor(es) vinculado(s). Realoque ou remova os subsetores primeiro.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (department._count.positions > 0) {
      const error: any = new Error(
        `Não é possível remover o setor "${department.name}" pois ele possui ${department._count.positions} cargo(s) vinculado(s). Realoque ou remova os cargos primeiro.`
      );
      error.statusCode = 400;
      throw error;
    }

    await prisma.department.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    return { success: true, message: 'Setor removido com sucesso' };
  }
}
