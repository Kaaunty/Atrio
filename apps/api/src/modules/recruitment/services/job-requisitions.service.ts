import { prisma } from '../../../database/prisma.js';
import { CreateJobRequisitionInput } from '../recruitment.dto.js';

export class JobRequisitionsService {
  /**
   * Gestor solicita a abertura de uma vaga para sua equipe/departamento
   */
  static async create(actorUserId: string, data: CreateJobRequisitionInput) {
    const department = await prisma.department.findUnique({ where: { id: data.departmentId } });
    if (!department) {
      const error: any = new Error('Departamento não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.positionId) {
      const position = await prisma.position.findUnique({ where: { id: data.positionId } });
      if (!position) {
        const error: any = new Error('Cargo não encontrado');
        error.statusCode = 404;
        throw error;
      }
    }

    if (data.workforceRequestId) {
      const workforceRequest = await prisma.workforceRequest.findUnique({
        where: { id: data.workforceRequestId },
      });
      if (!workforceRequest) {
        const error: any = new Error('Solicitação de quadro de pessoal (QLP) não encontrada');
        error.statusCode = 404;
        throw error;
      }
    }

    const created = await prisma.jobRequisition.create({
      data: {
        departmentId: data.departmentId,
        positionId: data.positionId || null,
        shiftType: data.shiftType || null,
        requestedQuantity: data.requestedQuantity,
        contractType: data.contractType,
        justification: data.justification,
        requestedById: actorUserId,
        workforceRequestId: data.workforceRequestId || null,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'VAGA_SOLICITADA',
        entity: 'JobRequisition',
        recordId: created.id,
        newValue: {
          departmentId: data.departmentId,
          requestedQuantity: data.requestedQuantity,
          status: 'PENDENTE',
        },
      },
    });

    return created;
  }

  static async list(filters: { status?: string; departmentId?: string }) {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.departmentId) where.departmentId = filters.departmentId;

    return prisma.jobRequisition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
        jobOpenings: { select: { id: true, title: true, status: true } },
      },
    });
  }

  static async listMine(requestedById: string) {
    return prisma.jobRequisition.findMany({
      where: { requestedById },
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        approvedBy: { select: { id: true, email: true } },
        jobOpenings: { select: { id: true, title: true, status: true } },
      },
    });
  }

  static async listPending() {
    return prisma.jobRequisition.findMany({
      where: { status: 'PENDENTE' },
      orderBy: { createdAt: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true } },
      },
    });
  }

  static async getById(id: string) {
    const requisition = await prisma.jobRequisition.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        requestedBy: { select: { id: true, email: true } },
        approvedBy: { select: { id: true, email: true } },
        jobOpenings: true,
      },
    });

    if (!requisition) {
      const error: any = new Error('Solicitação de vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    return requisition;
  }

  static async approve(id: string, rhUserId: string) {
    const requisition = await prisma.jobRequisition.findUnique({ where: { id } });
    if (!requisition) {
      const error: any = new Error('Solicitação de vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (requisition.status !== 'PENDENTE') {
      const error: any = new Error(
        `Solicitação de vaga não está pendente de análise (status atual: ${requisition.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.jobRequisition.update({
      where: { id },
      data: {
        status: 'APROVADA',
        approvedById: rhUserId,
      },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        action: 'VAGA_SOLICITACAO_APROVADA',
        entity: 'JobRequisition',
        recordId: id,
        previousValue: { status: 'PENDENTE' },
        newValue: { status: 'APROVADA' },
      },
    });

    return updated;
  }

  static async reject(id: string, rhUserId: string) {
    const requisition = await prisma.jobRequisition.findUnique({ where: { id } });
    if (!requisition) {
      const error: any = new Error('Solicitação de vaga não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (requisition.status !== 'PENDENTE') {
      const error: any = new Error(
        `Solicitação de vaga não está pendente de análise (status atual: ${requisition.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.jobRequisition.update({
      where: { id },
      data: {
        status: 'REJEITADA',
        approvedById: rhUserId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        action: 'VAGA_SOLICITACAO_REJEITADA',
        entity: 'JobRequisition',
        recordId: id,
        previousValue: { status: 'PENDENTE' },
        newValue: { status: 'REJEITADA' },
      },
    });

    return updated;
  }
}
