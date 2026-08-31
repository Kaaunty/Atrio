import { prisma } from '../../../database/prisma.js';
import { CreateVacationRequestInput } from '../vacations.dto.js';

export class VacationService {
  /**
   * Garante que os períodos aquisitivos do colaborador estejam gerados e atualizados
   */
  static async ensurePeriodsForEmployee(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, admissionDate: true },
    });

    if (!employee || !employee.admissionDate) return [];

    const admission = new Date(employee.admissionDate);
    const now = new Date();
    const currentYear = now.getFullYear();

    const periodsToEnsure = [];
    let start = new Date(admission);

    // Gera períodos anuais desde a admissão até o período atual
    while (start <= now || periodsToEnsure.length === 0) {
      const vestingStart = new Date(start);
      const vestingEnd = new Date(start);
      vestingEnd.setFullYear(vestingEnd.getFullYear() + 1);
      vestingEnd.setDate(vestingEnd.getDate() - 1);

      const deadline = new Date(vestingEnd);
      deadline.setFullYear(deadline.getFullYear() + 1); // 12 meses para gozo

      periodsToEnsure.push({
        vestingStart,
        vestingEnd,
        deadline,
      });

      start = new Date(start);
      start.setFullYear(start.getFullYear() + 1);
      if (start.getFullYear() > currentYear + 1) break;
    }

    for (const p of periodsToEnsure) {
      const existing = await prisma.vacationPeriod.findUnique({
        where: {
          employeeId_vestingStartDate: {
            employeeId,
            vestingStartDate: p.vestingStart,
          },
        },
      });

      let calculatedStatus: any = 'EM_AQUISICAO';
      if (now >= p.vestingEnd) {
        if (existing && existing.daysRemaining === 0) {
          calculatedStatus = 'CONCLUIDO';
        } else if (now > p.deadline && (!existing || existing.daysRemaining > 0)) {
          calculatedStatus = 'VENCIDO';
        } else {
          calculatedStatus = 'ADQUIRIDO';
        }
      }

      if (!existing) {
        await prisma.vacationPeriod.create({
          data: {
            employeeId,
            vestingStartDate: p.vestingStart,
            vestingEndDate: p.vestingEnd,
            deadlineDate: p.deadline,
            daysEntitled: 30,
            daysTaken: 0,
            daysScheduled: 0,
            daysRemaining: 30,
            status: calculatedStatus,
          },
        });
      } else {
        await prisma.vacationPeriod.update({
          where: { id: existing.id },
          data: { status: calculatedStatus },
        });
      }
    }

    return prisma.vacationPeriod.findMany({
      where: { employeeId },
      orderBy: { vestingStartDate: 'desc' },
      include: {
        requests: {
          orderBy: { startDate: 'desc' },
        },
      },
    });
  }

  /**
   * Retorna resumo de férias do colaborador (saldos, períodos e solicitações)
   */
  static async getEmployeeSummary(employeeId: string) {
    const periods = await this.ensurePeriodsForEmployee(employeeId);

    const requests = await prisma.vacationRequest.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
      include: {
        vacationPeriod: true,
        manager: { select: { id: true, name: true } },
        rhUser: { select: { id: true, email: true } },
      },
    });

    const activePeriods = periods.filter((p) => p.status === 'ADQUIRIDO' || p.status === 'VENCIDO');
    const totalDaysAvailable = activePeriods.reduce((acc, p) => acc + p.daysRemaining, 0);
    const totalDaysScheduled = periods.reduce((acc, p) => acc + p.daysScheduled, 0);
    const totalDaysTaken = periods.reduce((acc, p) => acc + p.daysTaken, 0);

    return {
      totalDaysAvailable,
      totalDaysScheduled,
      totalDaysTaken,
      periods,
      requests,
    };
  }

  /**
   * Cria nova solicitação de férias com validação de regras CLT
   */
  static async createRequest(
    employeeId: string,
    actorUserId: string,
    data: CreateVacationRequestInput
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { manager: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const period = await prisma.vacationPeriod.findUnique({
      where: { id: data.vacationPeriodId },
      include: {
        requests: {
          where: { status: { in: ['APROVADO', 'PENDENTE_RH', 'PENDENTE_GESTOR'] } },
        },
      },
    });

    if (!period || period.employeeId !== employeeId) {
      const error: any = new Error('Período aquisitivo não encontrado ou inválido para este colaborador');
      error.statusCode = 404;
      throw error;
    }

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    if (end < start) {
      const error: any = new Error('A data final não pode ser anterior à data inicial');
      error.statusCode = 400;
      throw error;
    }

    // Calcula quantidade de dias corridos
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // 1. Regra CLT: Nenhum período pode ser inferior a 5 dias
    if (daysCount < 5) {
      const error: any = new Error('Conforme a CLT (Art. 134, § 1º), nenhum período de férias pode ser inferior a 5 dias corridos.');
      error.statusCode = 400;
      throw error;
    }

    // 2. Regra CLT: Saldo disponível
    const totalRequested = daysCount + data.sellDaysCount;
    if (totalRequested > period.daysRemaining) {
      const error: any = new Error(
        `Saldo insuficiente no período aquisitivo. Solicitado: ${totalRequested} dias (Gozo: ${daysCount} + Abono: ${data.sellDaysCount}), Disponível: ${period.daysRemaining} dias.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Regra CLT: Início das férias não pode anteceder descanso semanal em 2 dias (sexta/sábado)
    // getUTCDay: 0 = Domingo, 5 = Sexta, 6 = Sábado
    const dayOfWeek = new Date(`${data.startDate}T12:00:00Z`).getUTCDay();
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      const error: any = new Error(
        'Conforme a CLT (Art. 134, § 3º), é vedado o início das férias nos dois dias que antecedem o repouso semanal remunerado (sexta-feira e sábado).'
      );
      error.statusCode = 400;
      throw error;
    }

    // 4. Regra de Fracionamento: Máximo 3 períodos e pelo menos 1 deve ter >= 14 dias
    const existingRequestsCount = period.requests.length;
    if (existingRequestsCount >= 2) {
      // Este será o 3º e último período permitido
      const allDays = [...period.requests.map((r) => r.daysCount), daysCount];
      const hasFourteenOrMore = allDays.some((d) => d >= 14);
      if (!hasFourteenOrMore) {
        const error: any = new Error(
          'Conforme a CLT, ao fracionar em 3 períodos, pelo menos um dos períodos deve ter no mínimo 14 dias corridos.'
        );
        error.statusCode = 400;
        throw error;
      }
    }

    const initialStatus = employee.managerId ? 'PENDENTE_GESTOR' : 'PENDENTE_RH';

    const request = await prisma.vacationRequest.create({
      data: {
        employeeId,
        vacationPeriodId: period.id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        daysCount,
        sellDaysCount: data.sellDaysCount,
        advanceThirteenth: data.advanceThirteenth,
        notes: data.notes || null,
        status: initialStatus,
        managerId: employee.managerId || null,
      },
      include: {
        employee: { select: { name: true, registrationNumber: true } },
        vacationPeriod: true,
      },
    });

    // Deduz do saldo disponível e incrementa agendados
    await prisma.vacationPeriod.update({
      where: { id: period.id },
      data: {
        daysScheduled: period.daysScheduled + totalRequested,
        daysRemaining: period.daysRemaining - totalRequested,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId,
        action: 'FERIAS_SOLICITADAS',
        entity: 'VacationRequest',
        recordId: request.id,
        newValue: {
          startDate: data.startDate,
          endDate: data.endDate,
          daysCount,
          sellDaysCount: data.sellDaysCount,
          advanceThirteenth: data.advanceThirteenth,
          status: initialStatus,
        },
      },
    });

    return request;
  }

  /**
   * Gestor aprova solicitação de férias
   */
  static async managerApprove(
    requestId: string,
    managerEmployeeId: string,
    actorUserId: string,
    notes: string
  ) {
    const request = await prisma.vacationRequest.findUnique({
      where: { id: requestId },
      include: { employee: true },
    });

    if (!request) {
      const error: any = new Error('Solicitação de férias não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (request.status !== 'PENDENTE_GESTOR') {
      const error: any = new Error(`Solicitação não está pendente de aprovação do gestor (status atual: ${request.status})`);
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'PENDENTE_RH',
        managerId: managerEmployeeId,
        managerActionAt: new Date(),
        managerNotes: notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId: managerEmployeeId,
        action: 'FERIAS_APROVADAS_GESTOR',
        entity: 'VacationRequest',
        recordId: requestId,
        previousValue: { status: 'PENDENTE_GESTOR' },
        newValue: { status: 'PENDENTE_RH', notes },
      },
    });

    return updated;
  }

  /**
   * Gestor rejeita solicitação de férias
   */
  static async managerReject(
    requestId: string,
    managerEmployeeId: string,
    actorUserId: string,
    notes: string
  ) {
    const request = await prisma.vacationRequest.findUnique({
      where: { id: requestId },
      include: { vacationPeriod: true },
    });

    if (!request) {
      const error: any = new Error('Solicitação de férias não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const totalDays = request.daysCount + request.sellDaysCount;

    const updated = await prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJEITADO',
        managerId: managerEmployeeId,
        managerActionAt: new Date(),
        managerNotes: notes,
      },
    });

    // Estorna saldo do período
    if (request.vacationPeriod) {
      await prisma.vacationPeriod.update({
        where: { id: request.vacationPeriodId },
        data: {
          daysScheduled: Math.max(0, request.vacationPeriod.daysScheduled - totalDays),
          daysRemaining: request.vacationPeriod.daysRemaining + totalDays,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId: managerEmployeeId,
        action: 'FERIAS_REJEITADAS_GESTOR',
        entity: 'VacationRequest',
        recordId: requestId,
        previousValue: { status: request.status },
        newValue: { status: 'REJEITADO', notes },
      },
    });

    return updated;
  }

  /**
   * RH homologa e confirma o agendamento de férias
   */
  static async rhApprove(requestId: string, rhUserId: string, notes: string) {
    const request = await prisma.vacationRequest.findUnique({
      where: { id: requestId },
      include: { vacationPeriod: true },
    });

    if (!request) {
      const error: any = new Error('Solicitação de férias não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'APROVADO',
        rhUserId,
        rhActionAt: new Date(),
        rhNotes: notes,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        action: 'FERIAS_HOMOLOGADAS_RH',
        entity: 'VacationRequest',
        recordId: requestId,
        previousValue: { status: request.status },
        newValue: { status: 'APROVADO', notes },
      },
    });

    return updated;
  }

  /**
   * RH rejeita solicitação de férias
   */
  static async rhReject(requestId: string, rhUserId: string, notes: string) {
    const request = await prisma.vacationRequest.findUnique({
      where: { id: requestId },
      include: { vacationPeriod: true },
    });

    if (!request) {
      const error: any = new Error('Solicitação de férias não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const totalDays = request.daysCount + request.sellDaysCount;

    const updated = await prisma.vacationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJEITADO',
        rhUserId,
        rhActionAt: new Date(),
        rhNotes: notes,
      },
    });

    // Estorna saldo
    if (request.vacationPeriod) {
      await prisma.vacationPeriod.update({
        where: { id: request.vacationPeriodId },
        data: {
          daysScheduled: Math.max(0, request.vacationPeriod.daysScheduled - totalDays),
          daysRemaining: request.vacationPeriod.daysRemaining + totalDays,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        action: 'FERIAS_REJEITADAS_RH',
        entity: 'VacationRequest',
        recordId: requestId,
        previousValue: { status: request.status },
        newValue: { status: 'REJEITADO', notes },
      },
    });

    return updated;
  }

  /**
   * Colaborador cancela solicitação
   */
  static async cancel(requestId: string, employeeId: string, actorUserId: string) {
    const request = await prisma.vacationRequest.findFirst({
      where: { id: requestId, employeeId },
      include: { vacationPeriod: true },
    });

    if (!request) {
      const error: any = new Error('Solicitação de férias não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (['REJEITADO', 'CANCELADO'].includes(request.status)) {
      const error: any = new Error('Esta solicitação já foi finalizada ou cancelada');
      error.statusCode = 400;
      throw error;
    }

    const totalDays = request.daysCount + request.sellDaysCount;

    const updated = await prisma.vacationRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELADO' },
    });

    if (request.vacationPeriod) {
      await prisma.vacationPeriod.update({
        where: { id: request.vacationPeriodId },
        data: {
          daysScheduled: Math.max(0, request.vacationPeriod.daysScheduled - totalDays),
          daysRemaining: request.vacationPeriod.daysRemaining + totalDays,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId,
        action: 'FERIAS_CANCELADAS',
        entity: 'VacationRequest',
        recordId: requestId,
        previousValue: { status: request.status },
        newValue: { status: 'CANCELADO' },
      },
    });

    return updated;
  }

  /**
   * Retorna solicitações pendentes para a equipe do gestor
   */
  static async listTeamPending(managerEmployeeId: string) {
    return prisma.vacationRequest.findMany({
      where: {
        status: 'PENDENTE_GESTOR',
        employee: { managerId: managerEmployeeId },
      },
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
        vacationPeriod: true,
      },
    });
  }

  /**
   * Retorna solicitações pendentes para o RH
   */
  static async listRhPending() {
    return prisma.vacationRequest.findMany({
      where: {
        status: { in: ['PENDENTE_RH', 'PENDENTE_GESTOR'] },
      },
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
        manager: { select: { id: true, name: true } },
        vacationPeriod: true,
      },
    });
  }

  /**
   * Calendário da equipe com detecção de sobreposição de ausências
   */
  static async getTeamCalendar(
    managerEmployeeId: string | null,
    startDateStr?: string,
    endDateStr?: string
  ) {
    const where: any = {
      status: { in: ['APROVADO', 'PENDENTE_RH', 'PENDENTE_GESTOR'] },
    };

    if (managerEmployeeId) {
      where.employee = { managerId: managerEmployeeId };
    }

    if (startDateStr && endDateStr) {
      where.OR = [
        {
          startDate: { lte: new Date(endDateStr) },
          endDate: { gte: new Date(startDateStr) },
        },
      ];
    }

    const requests = await prisma.vacationRequest.findMany({
      where,
      orderBy: { startDate: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Detecta sobreposições no mesmo setor
    const overlaps: any[] = [];
    for (let i = 0; i < requests.length; i++) {
      for (let j = i + 1; j < requests.length; j++) {
        const reqA = requests[i];
        const reqB = requests[j];

        if (reqA.employeeId !== reqB.employeeId) {
          const aStart = new Date(reqA.startDate).getTime();
          const aEnd = new Date(reqA.endDate).getTime();
          const bStart = new Date(reqB.startDate).getTime();
          const bEnd = new Date(reqB.endDate).getTime();

          const isOverlapping = aStart <= bEnd && bStart <= aEnd;
          if (isOverlapping) {
            overlaps.push({
              requestAId: reqA.id,
              employeeAName: reqA.employee.name,
              requestBId: reqB.id,
              employeeBName: reqB.employee.name,
              overlapStartDate: new Date(Math.max(aStart, bStart)),
              overlapEndDate: new Date(Math.min(aEnd, bEnd)),
            });
          }
        }
      }
    }

    return {
      requests,
      overlaps,
    };
  }

  /**
   * Alertas de períodos concessivos prestes a vencer (Risco de pagamento em dobro)
   */
  static async getExpiringAlerts() {
    const now = new Date();
    const alertLimit = new Date();
    alertLimit.setDate(alertLimit.getDate() + 90); // 90 dias

    const periods = await prisma.vacationPeriod.findMany({
      where: {
        status: { in: ['ADQUIRIDO', 'VENCIDO'] },
        daysRemaining: { gt: 0 },
        deadlineDate: { lte: alertLimit },
      },
      orderBy: { deadlineDate: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
            manager: { select: { name: true } },
          },
        },
      },
    });

    return periods.map((p) => {
      const diffDays = Math.ceil(
        (new Date(p.deadlineDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      let urgencyLevel = 'NORMAL';
      if (diffDays <= 0) {
        urgencyLevel = 'VENCIDO';
      } else if (diffDays <= 30) {
        urgencyLevel = 'CRITICO';
      } else if (diffDays <= 90) {
        urgencyLevel = 'ALERTA';
      }

      return {
        ...p,
        daysUntilDeadline: diffDays,
        urgencyLevel,
      };
    });
  }
}
