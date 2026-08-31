import { prisma } from '../../../database/prisma.js';

export interface OrgChartPosition {
  id: string;
  title: string;
  level: string;
  active: boolean;
}

export interface OrgChartDepartmentNode {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  costCenter: string | null;
  parentId: string | null;
  managerId: string | null;
  positions: OrgChartPosition[];
  children: OrgChartDepartmentNode[];
  totalPositions: number;
  totalSubdepartments: number;
}

export interface OrgChartCompany {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  unitsCount: number;
  departmentsCount: number;
  totalPositionsCount: number;
  departmentsTree: OrgChartDepartmentNode[];
}

export class ChartService {
  static async getChart(companyId?: string): Promise<OrgChartCompany[]> {
    const companyWhere: any = {
      deletedAt: null,
      active: true,
    };

    if (companyId) {
      companyWhere.id = companyId;
    }

    const companies = await prisma.company.findMany({
      where: companyWhere,
      orderBy: { tradeName: 'asc' },
      include: {
        units: {
          where: { deletedAt: null, active: true },
        },
        departments: {
          where: { deletedAt: null, active: true },
          orderBy: { name: 'asc' },
          include: {
            positions: {
              where: { deletedAt: null, active: true },
              orderBy: { title: 'asc' },
              select: {
                id: true,
                title: true,
                level: true,
                active: true,
              },
            },
          },
        },
      },
    });

    return companies.map((comp) => {
      const tree = this.buildDepartmentChartTree(comp.departments);
      const totalPositions = comp.departments.reduce(
        (acc, dept) => acc + (dept.positions?.length || 0),
        0
      );

      return {
        id: comp.id,
        legalName: comp.legalName,
        tradeName: comp.tradeName,
        cnpj: comp.cnpj,
        unitsCount: comp.units.length,
        departmentsCount: comp.departments.length,
        totalPositionsCount: totalPositions,
        departmentsTree: tree,
      };
    });
  }

  private static buildDepartmentChartTree(departments: any[]): OrgChartDepartmentNode[] {
    const nodesMap = new Map<string, OrgChartDepartmentNode>();
    const roots: OrgChartDepartmentNode[] = [];

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
        positions: d.positions || [],
        children: [],
        totalPositions: (d.positions || []).length,
        totalSubdepartments: 0,
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

    // Calcula acumulados recursivamente
    const calculateTotals = (node: OrgChartDepartmentNode): { positions: number; subdepts: number } => {
      let subPositions = node.positions.length;
      let subdepts = node.children.length;

      for (const child of node.children) {
        const childTotals = calculateTotals(child);
        subPositions += childTotals.positions;
        subdepts += childTotals.subdepts;
      }

      node.totalPositions = subPositions;
      node.totalSubdepartments = subdepts;
      return { positions: subPositions, subdepts };
    };

    roots.forEach(calculateTotals);

    return roots;
  }
}
