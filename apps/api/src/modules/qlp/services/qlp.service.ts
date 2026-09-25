import { prisma } from '../../../database/prisma.js';
import {
  CreateWorkforceParameterInput,
  CreateWorkforceRequestInput,
  DecideWorkforceRequestInput,
  QueryDashboardInput,
  QueryEmployeesInput,
  QueryParametersInput,
  QueryRequestsInput,
  UpdateWorkforceParameterInput,
} from '../qlp.dto.js';

const ACTIVE_EMPLOYEE_STATUSES = ['ATIVO', 'FERIAS', 'AFASTADO'] as const;

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

export class QlpService {
  // ==========================================
  // PAINEL GERAL DE LOTAÇÃO
  // ==========================================

  /**
   * Painel de lotação: agrega o headcount atual (colaboradores não desligados) por
   * status/vínculo/classificação de mão de obra/setor/turno e compara cada
   * parâmetro de dimensionamento vigente contra o efetivo real correspondente.
   */
  static async getDashboard(filters: QueryDashboardInput) {
    const employeeWhere: any = {
      deletedAt: null,
      status: { in: [...ACTIVE_EMPLOYEE_STATUSES] },
    };
    if (filters.departmentId) employeeWhere.departmentId = filters.departmentId;
    if (filters.positionId) employeeWhere.positionId = filters.positionId;
    if (filters.shiftType) employeeWhere.shiftType = filters.shiftType;
    if (filters.contractType) employeeWhere.contractType = filters.contractType;
    if (filters.laborClassification) employeeWhere.laborClassification = filters.laborClassification;

    const [byStatus, byContractType, byLaborClassification, byDepartment, byShift, totalHeadcount] =
      await Promise.all([
        prisma.employee.groupBy({
          by: ['status'],
          where: { deletedAt: null, ...omit(employeeWhere, 'status') },
          _count: { _all: true },
        }),
        prisma.employee.groupBy({
          by: ['contractType'],
          where: employeeWhere,
          _count: { _all: true },
        }),
        prisma.employee.groupBy({
          by: ['laborClassification'],
          where: employeeWhere,
          _count: { _all: true },
        }),
        prisma.employee.groupBy({
          by: ['departmentId'],
          where: employeeWhere,
          _count: { _all: true },
        }),
        prisma.employee.groupBy({
          by: ['shiftType'],
          where: employeeWhere,
          _count: { _all: true },
        }),
        prisma.employee.count({ where: employeeWhere }),
      ]);

    const departmentIds = byDepartment.map((d) => d.departmentId).filter(Boolean) as string[];
    const departments = departmentIds.length
      ? await prisma.department.findMany({
          where: { id: { in: departmentIds } },
          select: { id: true, name: true },
        })
      : [];
    const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));

    const now = new Date();
    const parameterWhere: any = {
      active: true,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
    };
    if (filters.departmentId) parameterWhere.departmentId = filters.departmentId;
    if (filters.positionId) parameterWhere.positionId = filters.positionId;
    if (filters.shiftType) parameterWhere.shiftType = filters.shiftType;
    if (filters.laborClassification) parameterWhere.laborClassification = filters.laborClassification;

    const parameters = await prisma.workforceParameter.findMany({
      where: parameterWhere,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
      orderBy: [{ department: { name: 'asc' } }],
    });

    const comparison = await Promise.all(
      parameters.map(async (param) => {
        const matchWhere: any = {
          deletedAt: null,
          status: { in: [...ACTIVE_EMPLOYEE_STATUSES] },
          departmentId: param.departmentId,
          laborClassification: param.laborClassification,
        };
        if (param.positionId) matchWhere.positionId = param.positionId;
        if (param.shiftType) matchWhere.shiftType = param.shiftType;
        if (filters.contractType) matchWhere.contractType = filters.contractType;

        const allowedContractTypes = Array.isArray(param.allowedContractTypes)
          ? param.allowedContractTypes.filter((value): value is string => typeof value === 'string')
          : [];
        if (allowedContractTypes.length > 0) {
          matchWhere.contractType = { in: allowedContractTypes };
          if (filters.contractType) {
            matchWhere.contractType = { in: allowedContractTypes.filter((value) => value === filters.contractType) };
          }
        }

        const currentQuantity = await prisma.employee.count({ where: matchWhere });

        let situation: 'ABAIXO_MINIMO' | 'OK' | 'ACIMA_MAXIMO' = 'OK';
        if (currentQuantity < param.minQuantity) situation = 'ABAIXO_MINIMO';
        else if (currentQuantity > param.maxQuantity) situation = 'ACIMA_MAXIMO';

        return {
          parameterId: param.id,
          department: param.department,
          position: param.position,
          shiftType: param.shiftType,
          laborClassification: param.laborClassification,
          minQuantity: param.minQuantity,
          plannedQuantity: param.plannedQuantity,
          maxQuantity: param.maxQuantity,
          allowedContractTypes: param.allowedContractTypes,
          currentQuantity,
          gapToMin: Math.max(0, param.minQuantity - currentQuantity),
          gapToPlanned: param.plannedQuantity - currentQuantity,
          surplusOverMax: Math.max(0, currentQuantity - param.maxQuantity),
          situation,
        };
      })
    );

    return {
      totals: {
        headcount: totalHeadcount,
        byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
        byContractType: byContractType.map((c) => ({ contractType: c.contractType, count: c._count._all })),
        byLaborClassification: byLaborClassification.map((c) => ({
          laborClassification: c.laborClassification,
          count: c._count._all,
        })),
        byDepartment: byDepartment.map((d) => ({
          departmentId: d.departmentId,
          departmentName: d.departmentId ? departmentNameById.get(d.departmentId) || null : null,
          count: d._count._all,
        })),
        byShift: byShift.map((s) => ({ shiftType: s.shiftType, count: s._count._all })),
      },
      comparison,
      summary: {
        totalParameters: comparison.length,
        belowMinimum: comparison.filter((c) => c.situation === 'ABAIXO_MINIMO').length,
        aboveMaximum: comparison.filter((c) => c.situation === 'ACIMA_MAXIMO').length,
        ok: comparison.filter((c) => c.situation === 'OK').length,
      },
    };
  }

  /**
   * Consulta filtrada de colaboradores (headcount detalhado) por setor, função,
   * turno e tipo de vínculo.
   */
  static async listEmployees(filters: QueryEmployeesInput) {
    const where: any = { deletedAt: null };

    if (filters.status) {
      where.status = filters.status;
    } else {
      where.status = { in: [...ACTIVE_EMPLOYEE_STATUSES] };
    }
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.positionId) where.positionId = filters.positionId;
    if (filters.shiftType) where.shiftType = filters.shiftType;
    if (filters.contractType) where.contractType = filters.contractType;
    if (filters.laborClassification) where.laborClassification = filters.laborClassification;

    return prisma.employee.findMany({
      where,
      orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        status: true,
        contractType: true,
        shiftType: true,
        laborClassification: true,
        admissionDate: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
    });
  }

  // ==========================================
  // PARÂMETROS DE DIMENSIONAMENTO
  // ==========================================

  static async listParameters(filters: QueryParametersInput) {
    const where: any = {};
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.positionId) where.positionId = filters.positionId;
    if (filters.shiftType) where.shiftType = filters.shiftType;
    if (filters.laborClassification) where.laborClassification = filters.laborClassification;
    if (filters.active !== undefined) where.active = filters.active;

    return prisma.workforceParameter.findMany({
      where,
      orderBy: [{ department: { name: 'asc' } }, { createdAt: 'desc' }],
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
    });
  }

  static async createParameter(data: CreateWorkforceParameterInput) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) notFound('Setor não encontrado');

    if (data.positionId) {
      const position = await prisma.position.findUnique({ where: { id: data.positionId } });
      if (!position) notFound('Função não encontrada');
    }

    if (data.minQuantity > data.plannedQuantity) {
      badRequest('A quantidade mínima não pode ser maior que a quantidade ideal');
    }
    if (data.plannedQuantity > data.maxQuantity) {
      badRequest('A quantidade ideal não pode ser maior que a quantidade máxima');
    }

    if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
      badRequest('A data final de vigência não pode ser anterior à data inicial');
    }

    return prisma.workforceParameter.create({
      data: {
        departmentId: data.departmentId,
        positionId: data.positionId || null,
        shiftType: data.shiftType || null,
        laborClassification: data.laborClassification,
        minQuantity: data.minQuantity,
        plannedQuantity: data.plannedQuantity,
        maxQuantity: data.maxQuantity,
        allowedContractTypes: data.allowedContractTypes,
        effectiveFrom: new Date(data.effectiveFrom),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
        active: data.active,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
    });
  }

  static async updateParameter(id: string, data: UpdateWorkforceParameterInput) {
    const existing = await prisma.workforceParameter.findUnique({ where: { id } });
    if (!existing) notFound('Parâmetro de dimensionamento não encontrado');

    if (data.departmentId) {
      const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
      if (!department) notFound('Setor não encontrado');
    }
    if (data.positionId) {
      const position = await prisma.position.findUnique({ where: { id: data.positionId } });
      if (!position) notFound('Função não encontrada');
    }

    const minQuantity = data.minQuantity ?? existing.minQuantity;
    const plannedQuantity = data.plannedQuantity ?? existing.plannedQuantity;
    const maxQuantity = data.maxQuantity ?? existing.maxQuantity;

    if (minQuantity > plannedQuantity) {
      badRequest('A quantidade mínima não pode ser maior que a quantidade ideal');
    }
    if (plannedQuantity > maxQuantity) {
      badRequest('A quantidade ideal não pode ser maior que a quantidade máxima');
    }

    const effectiveFrom = data.effectiveFrom ? new Date(data.effectiveFrom) : existing.effectiveFrom;
    const effectiveTo =
      data.effectiveTo !== undefined
        ? data.effectiveTo
          ? new Date(data.effectiveTo)
          : null
        : existing.effectiveTo;

    if (effectiveTo && effectiveTo < effectiveFrom) {
      badRequest('A data final de vigência não pode ser anterior à data inicial');
    }

    return prisma.workforceParameter.update({
      where: { id },
      data: {
        departmentId: data.departmentId ?? undefined,
        positionId: data.positionId === undefined ? undefined : data.positionId,
        shiftType: data.shiftType === undefined ? undefined : data.shiftType,
        laborClassification: data.laborClassification ?? undefined,
        minQuantity: data.minQuantity ?? undefined,
        plannedQuantity: data.plannedQuantity ?? undefined,
        maxQuantity: data.maxQuantity ?? undefined,
        allowedContractTypes: data.allowedContractTypes ?? undefined,
        effectiveFrom,
        effectiveTo,
        active: data.active ?? undefined,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
    });
  }

  static async deleteParameter(id: string) {
    const existing = await prisma.workforceParameter.findUnique({ where: { id } });
    if (!existing) notFound('Parâmetro de dimensionamento não encontrado');

    await prisma.workforceParameter.delete({ where: { id } });
    return { id };
  }

  // ==========================================
  // SOLICITAÇÕES DE MOVIMENTAÇÃO DE QUADRO
  // ==========================================

  static async listRequests(filters: QueryRequestsInput, actor: { userId: string; employeeId?: string | null; isPrivileged: boolean }) {
    const where: any = {};
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.status) where.status = filters.status;
    if (filters.requestType) where.requestType = filters.requestType;

    if (!actor.isPrivileged) {
      where.OR = [
        { requestedById: actor.userId },
        actor.employeeId ? { department: { managerId: actor.employeeId } } : undefined,
      ].filter(Boolean);
    }

    return prisma.workforceRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true, employee: { select: { name: true } } } },
        approvedBy: { select: { id: true, email: true, employee: { select: { name: true } } } },
      },
    });
  }

  static async createRequest(userId: string, data: CreateWorkforceRequestInput) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) notFound('Setor não encontrado');

    if (data.positionId) {
      const position = await prisma.position.findUnique({ where: { id: data.positionId } });
      if (!position) notFound('Função não encontrada');
    }

    return prisma.workforceRequest.create({
      data: {
        departmentId: data.departmentId,
        positionId: data.positionId || null,
        shiftType: data.shiftType || null,
        requestType: data.requestType,
        quantity: data.quantity,
        justification: data.justification,
        status: 'PENDENTE',
        requestedById: userId,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true, employee: { select: { name: true } } } },
      },
    });
  }

  static async cancelRequest(id: string, userId: string, isPrivileged: boolean) {
    const request = await prisma.workforceRequest.findUnique({ where: { id } });
    if (!request) notFound('Solicitação de quadro não encontrada');

    if (!isPrivileged && request.requestedById !== userId) {
      badRequest('Você só pode cancelar solicitações que você mesmo abriu');
    }

    if (request.status !== 'PENDENTE') {
      badRequest(`Solicitação não pode ser cancelada (status atual: ${request.status})`);
    }

    await prisma.workforceRequest.delete({ where: { id } });
    return { id };
  }

  static async decideRequest(id: string, approverUserId: string, data: DecideWorkforceRequestInput) {
    const request = await prisma.workforceRequest.findUnique({ where: { id } });
    if (!request) notFound('Solicitação de quadro não encontrada');

    if (request.status !== 'PENDENTE') {
      badRequest(`Solicitação já foi decidida anteriormente (status atual: ${request.status})`);
    }

    return prisma.workforceRequest.update({
      where: { id },
      data: {
        status: data.status,
        approvedById: approverUserId,
        decisionNote: data.decisionNote,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true, employee: { select: { name: true } } } },
        approvedBy: { select: { id: true, email: true, employee: { select: { name: true } } } },
      },
    });
  }
}

function omit<T extends Record<string, any>>(obj: T, key: string): Partial<T> {
  const copy = { ...obj };
  delete copy[key];
  return copy;
}
