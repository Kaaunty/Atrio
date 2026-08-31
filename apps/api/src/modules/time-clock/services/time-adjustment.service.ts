import { prisma } from '../../../database/prisma.js';
import { CreateAdjustmentInput, QueryAdjustmentsInput, ReviewAdjustmentInput } from '../adjustment.dto.js';
import { TimeSummaryService } from './time-summary.service.js';

export class TimeAdjustmentService {
  /**
   * Colaborador cria uma solicitação de ajuste de ponto
   */
  static async create(employeeId: string, data: CreateAdjustmentInput) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      select: { id: true, name: true, managerId: true, companyId: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    let originalTimestamp: Date | null = null;

    if (data.originalEntryId) {
      const originalEntry = await prisma.timeClockEntry.findUnique({
        where: { id: data.originalEntryId },
      });
      if (originalEntry) {
        originalTimestamp = originalEntry.timestamp;
      }
    }

    // Se o colaborador não tiver gestor direto cadastrado, encaminha direto para a fila do RH
    const initialStatus = employee.managerId ? 'PENDENTE_GESTOR' : 'PENDENTE_RH';

    const adjustment = await prisma.timeClockAdjustment.create({
      data: {
        employeeId: employee.id,
        date: new Date(data.date),
        adjustmentType: data.adjustmentType,
        targetTime: data.targetTime,
        originalEntryId: data.originalEntryId || null,
        originalTimestamp,
        reason: data.reason,
        notes: data.notes || null,
        attachmentUrl: data.attachmentUrl || null,
        status: initialStatus,
      },
      include: {
        employee: {
          select: { id: true, name: true, registrationNumber: true },
        },
      },
    });

    // Registra auditoria da solicitação
    await prisma.auditLog.create({
      data: {
        employeeId: employee.id,
        action: 'SOLICITACAO_AJUSTE_PONTO_CRIADA',
        entity: 'TimeClockAdjustment',
        recordId: adjustment.id,
        newValue: {
          date: data.date,
          adjustmentType: data.adjustmentType,
          targetTime: data.targetTime,
          reason: data.reason,
          status: initialStatus,
        },
      },
    });

    return adjustment;
  }

  /**
   * Consulta solicitações criadas pelo próprio colaborador logado
   */
  static async listMe(employeeId: string, query: QueryAdjustmentsInput) {
    const { status, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      employeeId,
    };
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.timeClockAdjustment.count({ where }),
      prisma.timeClockAdjustment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          manager: { select: { id: true, name: true } },
          rhUser: { select: { id: true, email: true } },
          originalEntry: true,
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Consulta solicitações da equipe pendentes de análise pelo Gestor
   */
  static async listTeam(managerEmployeeId: string, query: QueryAdjustmentsInput) {
    const { status, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const subordinates = await prisma.employee.findMany({
      where: { managerId: managerEmployeeId, deletedAt: null },
      select: { id: true },
    });

    const subordinateIds = subordinates.map((s) => s.id);

    const where: any = {
      employeeId: { in: subordinateIds },
    };
    if (status) {
      where.status = status;
    } else {
      // Padrão do gestor: pendentes de sua análise ou em andamento
      where.status = { in: ['PENDENTE_GESTOR', 'PENDENTE_RH', 'APROVADO', 'REJEITADO'] };
    }

    const [total, items] = await Promise.all([
      prisma.timeClockAdjustment.count({ where }),
      prisma.timeClockAdjustment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              department: { select: { name: true } },
              position: { select: { title: true } },
            },
          },
          originalEntry: true,
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Consulta solicitações para homologação do RH com filtros amplos
   */
  static async listRh(query: QueryAdjustmentsInput) {
    const { status, employeeId, startDate, endDate, departmentId, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (status) where.status = status;
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { departmentId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [total, items] = await Promise.all([
      prisma.timeClockAdjustment.count({ where }),
      prisma.timeClockAdjustment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              company: { select: { tradeName: true } },
              department: { select: { name: true } },
              position: { select: { title: true } },
              manager: { select: { name: true } },
            },
          },
          manager: { select: { id: true, name: true } },
          rhUser: { select: { id: true, email: true } },
          originalEntry: true,
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Gestor aprova a solicitação (encaminha para homologação do RH)
   */
  static async managerApprove(id: string, managerEmployeeId: string, data: ReviewAdjustmentInput) {
    const adjustment = await prisma.timeClockAdjustment.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!adjustment) {
      const error: any = new Error('Solicitação de ajuste não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (adjustment.status !== 'PENDENTE_GESTOR') {
      const error: any = new Error(
        `Operação inválida: a solicitação está no status "${adjustment.status}" e não pode ser aprovada pelo gestor`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.timeClockAdjustment.update({
      where: { id },
      data: {
        status: 'PENDENTE_RH',
        managerId: managerEmployeeId,
        managerActionAt: new Date(),
        managerNotes: data.notes,
      },
      include: { employee: true },
    });

    await prisma.auditLog.create({
      data: {
        employeeId: managerEmployeeId,
        action: 'AJUSTE_PONTO_APROVADO_GESTOR',
        entity: 'TimeClockAdjustment',
        recordId: id,
        previousValue: { status: 'PENDENTE_GESTOR' },
        newValue: { status: 'PENDENTE_RH', managerNotes: data.notes },
      },
    });

    return updated;
  }

  /**
   * Gestor rejeita a solicitação
   */
  static async managerReject(id: string, managerEmployeeId: string, data: ReviewAdjustmentInput) {
    const adjustment = await prisma.timeClockAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      const error: any = new Error('Solicitação de ajuste não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (adjustment.status !== 'PENDENTE_GESTOR') {
      const error: any = new Error(
        `Operação inválida: a solicitação está no status "${adjustment.status}"`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.timeClockAdjustment.update({
      where: { id },
      data: {
        status: 'REJEITADO',
        managerId: managerEmployeeId,
        managerActionAt: new Date(),
        managerNotes: data.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        employeeId: managerEmployeeId,
        action: 'AJUSTE_PONTO_REJEITADO_GESTOR',
        entity: 'TimeClockAdjustment',
        recordId: id,
        previousValue: { status: 'PENDENTE_GESTOR' },
        newValue: { status: 'REJEITADO', managerNotes: data.notes },
      },
    });

    return updated;
  }

  /**
   * RH homologa a solicitação (aplica a alteração e recalcula o espelho do dia)
   */
  static async rhApprove(id: string, rhUserId: string, data: ReviewAdjustmentInput) {
    const adjustment = await prisma.timeClockAdjustment.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!adjustment) {
      const error: any = new Error('Solicitação de ajuste não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (!['PENDENTE_RH', 'PENDENTE_GESTOR'].includes(adjustment.status)) {
      const error: any = new Error(
        `Operação inválida: a solicitação já foi finalizada com status "${adjustment.status}"`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.timeClockAdjustment.update({
      where: { id },
      data: {
        status: 'APROVADO',
        rhUserId,
        rhActionAt: new Date(),
        rhNotes: data.notes,
      },
      include: { employee: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: adjustment.employeeId,
        action: 'AJUSTE_PONTO_HOMOLOGADO_RH',
        entity: 'TimeClockAdjustment',
        recordId: id,
        previousValue: { status: adjustment.status },
        newValue: { status: 'APROVADO', rhNotes: data.notes },
      },
    });

    // Dispara recálculo automático da apuração para a data afetada
    const dateStr = adjustment.date.toISOString().split('T')[0];
    await TimeSummaryService.recalculatePeriod({
      employeeId: adjustment.employeeId,
      startDate: dateStr,
      endDate: dateStr,
      yearMonth: dateStr.substring(0, 7),
    });

    return updated;
  }

  /**
   * RH rejeita a solicitação
   */
  static async rhReject(id: string, rhUserId: string, data: ReviewAdjustmentInput) {
    const adjustment = await prisma.timeClockAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      const error: any = new Error('Solicitação de ajuste não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (!['PENDENTE_RH', 'PENDENTE_GESTOR'].includes(adjustment.status)) {
      const error: any = new Error(
        `Operação inválida: a solicitação já se encontra no status "${adjustment.status}"`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.timeClockAdjustment.update({
      where: { id },
      data: {
        status: 'REJEITADO',
        rhUserId,
        rhActionAt: new Date(),
        rhNotes: data.notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: adjustment.employeeId,
        action: 'AJUSTE_PONTO_REJEITADO_RH',
        entity: 'TimeClockAdjustment',
        recordId: id,
        previousValue: { status: adjustment.status },
        newValue: { status: 'REJEITADO', rhNotes: data.notes },
      },
    });

    return updated;
  }

  /**
   * Colaborador cancela sua própria solicitação antes da análise
   */
  static async cancel(id: string, employeeId: string) {
    const adjustment = await prisma.timeClockAdjustment.findFirst({
      where: { id, employeeId },
    });

    if (!adjustment) {
      const error: any = new Error('Solicitação de ajuste não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (adjustment.status !== 'PENDENTE_GESTOR') {
      const error: any = new Error(
        'Não é possível cancelar uma solicitação que já está em análise pelo RH ou já foi deliberada'
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.timeClockAdjustment.update({
      where: { id },
      data: { status: 'CANCELADO' },
    });

    return updated;
  }
}
