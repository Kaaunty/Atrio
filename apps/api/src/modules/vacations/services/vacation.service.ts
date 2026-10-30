import { prisma } from '../../../database/prisma.js';
import {
  CreateVacationRequestInput,
  QueryRhPeriodsInput,
  ScheduleVacationRhInput,
  UpdateVacationPeriodRhInput,
} from '../vacations.dto.js';

export class VacationService {
  /**
   * Calcula os avos e dias proporcionais adquiridos para períodos EM_AQUISICAO
   * (2,5 dias por mês completo ou fração >= 15 dias trabalhados no período aquisitivo)
   */
  static calculateProportionalDays(
    vestingStartDate: Date | string,
    vestingEndDate: Date | string,
    daysEntitled: number = 30,
    daysTaken: number = 0,
    daysScheduled: number = 0,
    daysRemaining: number = 30,
    referenceDate: Date = new Date()
  ): { accruedDays: number; monthsWorked: number } {
    const start = new Date(vestingStartDate);
    const end = new Date(vestingEndDate);
    const ref = new Date(referenceDate);

    // Normaliza para meia-noite UTC para evitar distorção de fuso
    const startUtc = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const refUtc = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());

    if (refUtc >= endUtc) {
      return {
        accruedDays: Math.max(0, daysRemaining),
        monthsWorked: 12,
      };
    }

    if (refUtc < startUtc) {
      return {
        accruedDays: 0,
        monthsWorked: 0,
      };
    }

    // Cálculo de meses completos de ciclo trabalhados desde vestingStartDate
    let months =
      (ref.getUTCFullYear() - start.getUTCFullYear()) * 12 +
      (ref.getUTCMonth() - start.getUTCMonth());

    if (ref.getUTCDate() < start.getUTCDate()) {
      months = Math.max(0, months - 1);
    }

    const monthsWorked = Math.max(0, Math.min(11, months));
    const rawAccrued = (monthsWorked / 12) * daysEntitled;
    // Arredonda para múltiplos de 0.5 (ex: 2.5, 5, 7.5, ..., 27.5)
    const roundedAccrued = Math.round(rawAccrued * 2) / 2;
    const netAccrued = Math.max(0, roundedAccrued - daysTaken - daysScheduled);

    return {
      accruedDays: netAccrued,
      monthsWorked,
    };
  }

  /**
   * Calcula a urgência e dias até o vencimento concessivo
   */
  static calculateUrgency(
    deadlineDate: Date | string,
    status: string,
    daysRemaining: number,
    referenceDate: Date = new Date()
  ): { daysUntilDeadline: number; urgencyLevel: 'VENCIDO' | 'CRITICO' | 'ALERTA' | 'NORMAL' } {
    const deadline = new Date(deadlineDate);
    const diffDays = Math.ceil(
      (deadline.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (status === 'CONCLUIDO' || daysRemaining <= 0) {
      return { daysUntilDeadline: diffDays, urgencyLevel: 'NORMAL' };
    }

    if (status === 'EM_AQUISICAO') {
      return { daysUntilDeadline: diffDays, urgencyLevel: 'NORMAL' };
    }

    if (diffDays <= 0 || status === 'VENCIDO') {
      return { daysUntilDeadline: diffDays, urgencyLevel: 'VENCIDO' };
    }
    if (diffDays <= 30) {
      return { daysUntilDeadline: diffDays, urgencyLevel: 'CRITICO' };
    }
    if (diffDays <= 90) {
      return { daysUntilDeadline: diffDays, urgencyLevel: 'ALERTA' };
    }

    return { daysUntilDeadline: diffDays, urgencyLevel: 'NORMAL' };
  }

  /**
   * Enriquece um período aquisitivo com saldo proporcional e indicadores de prazo
   */
  static enrichPeriod(period: any, referenceDate: Date = new Date()) {
    const { accruedDays, monthsWorked } = this.calculateProportionalDays(
      period.vestingStartDate,
      period.vestingEndDate,
      period.daysEntitled,
      period.daysTaken,
      period.daysScheduled,
      period.daysRemaining,
      referenceDate
    );

    const { daysUntilDeadline, urgencyLevel } = this.calculateUrgency(
      period.deadlineDate,
      period.status,
      period.daysRemaining,
      referenceDate
    );

    return {
      ...period,
      accruedDays,
      monthsWorked,
      daysUntilDeadline,
      urgencyLevel,
    };
  }

  /**
   * Garante que os períodos aquisitivos do colaborador estejam gerados e atualizados
   * a partir de sua data de admissão, preservando saldos e ajustes existentes.
   */
  static async ensurePeriodsForEmployee(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        registrationNumber: true,
        contractType: true,
        admissionDate: true,
        status: true,
        deletedAt: true,
      },
    });

    if (
      !employee ||
      !employee.admissionDate ||
      employee.deletedAt ||
      employee.contractType === 'PJ' ||
      String(employee.registrationNumber || '').startsWith('LID-')
    ) {
      return [];
    }

    const admission = new Date(employee.admissionDate);
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    // Carrega períodos existentes do colaborador
    const allExistingPeriods = await prisma.vacationPeriod.findMany({
      where: { employeeId },
      include: { requests: true },
      orderBy: { vestingStartDate: 'asc' },
    });

    const periodsToEnsure: Array<{
      vestingStart: Date;
      vestingEnd: Date;
      deadline: Date;
    }> = [];

    let start = new Date(
      Date.UTC(admission.getUTCFullYear(), admission.getUTCMonth(), admission.getUTCDate())
    );

    // Gera períodos anuais desde a admissão até o período atual
    while (start <= now || periodsToEnsure.length === 0) {
      const vestingStart = new Date(start);
      const vestingEnd = new Date(
        Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate() - 1)
      );

      // Data limite operacional de gozo (~11 meses após fim aquisitivo / 30 dias antes de dobrar)
      const deadline = new Date(
        Date.UTC(vestingEnd.getUTCFullYear() + 1, vestingEnd.getUTCMonth(), vestingEnd.getUTCDate() - 29)
      );

      periodsToEnsure.push({
        vestingStart,
        vestingEnd,
        deadline,
      });

      start = new Date(
        Date.UTC(start.getUTCFullYear() + 1, start.getUTCMonth(), start.getUTCDate())
      );
      if (start.getUTCFullYear() > currentYear + 1) break;
    }

    const toDateKey = (d: Date | string) => new Date(d).toISOString().split('T')[0];
    const validStartKeys = new Set(periodsToEnsure.map((p) => toDateKey(p.vestingStart)));

    // Remove apenas períodos órfãos que nunca tiveram movimentação nem customização
    for (const exp of allExistingPeriods) {
      const key = toDateKey(exp.vestingStartDate);
      const isCustomized =
        exp.requests.length > 0 ||
        exp.daysTaken > 0 ||
        exp.daysScheduled > 0 ||
        exp.daysEntitled !== 30 ||
        exp.daysRemaining !== 30;

      if (!validStartKeys.has(key) && !isCustomized) {
        await prisma.vacationPeriod.delete({ where: { id: exp.id } });
      }
    }

    // Re-busca períodos remanescentes indexados por data de início (YYYY-MM-DD)
    const remainingExisting = await prisma.vacationPeriod.findMany({
      where: { employeeId },
    });
    const existingByStartKey = new Map(
      remainingExisting.map((ep) => [toDateKey(ep.vestingStartDate), ep])
    );

    // Se já houver períodos customizados no banco que cobrem o ciclo, evitamos duplicar ciclos conflitantes
    for (const p of periodsToEnsure) {
      const key = toDateKey(p.vestingStart);
      const existing = existingByStartKey.get(key);

      // Verifica se já existe um período customizado sobreposto (ex: mudança de ciclo após afastamento)
      if (!existing) {
        const overlappingCustom = remainingExisting.find((ep) => {
          const epStart = new Date(ep.vestingStartDate).getTime();
          const epEnd = new Date(ep.vestingEndDate).getTime();
          const pStart = p.vestingStart.getTime();
          return Math.abs(epStart - pStart) < 1000 * 60 * 60 * 24 * 180 || (pStart >= epStart && pStart <= epEnd);
        });
        if (overlappingCustom) {
          continue;
        }
      }

      const effectiveEnd = existing ? new Date(existing.vestingEndDate) : p.vestingEnd;
      const effectiveDeadline = existing ? new Date(existing.deadlineDate) : p.deadline;
      const effectiveRemaining = existing ? existing.daysRemaining : 30;
      const effectiveScheduled = existing ? existing.daysScheduled : 0;

      let calculatedStatus: 'EM_AQUISICAO' | 'ADQUIRIDO' | 'CONCLUIDO' | 'VENCIDO' = 'EM_AQUISICAO';
      if (now >= effectiveEnd) {
        if (effectiveRemaining <= 0 && effectiveScheduled === 0) {
          calculatedStatus = 'CONCLUIDO';
        } else if (now > effectiveDeadline && effectiveRemaining > 0) {
          calculatedStatus = 'VENCIDO';
        } else {
          calculatedStatus = 'ADQUIRIDO';
        }
      } else if (effectiveRemaining <= 0 && effectiveScheduled === 0 && existing && existing.daysTaken >= existing.daysEntitled) {
        calculatedStatus = 'CONCLUIDO';
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
      } else if (existing.status !== calculatedStatus) {
        await prisma.vacationPeriod.update({
          where: { id: existing.id },
          data: { status: calculatedStatus },
        });
      }
    }

    // Atualiza também o status de eventuais períodos customizados que não estavam na grade padrão
    for (const customPeriod of remainingExisting) {
      const key = toDateKey(customPeriod.vestingStartDate);
      if (!validStartKeys.has(key)) {
        const effEnd = new Date(customPeriod.vestingEndDate);
        const effDeadline = new Date(customPeriod.deadlineDate);
        let calcStatus: 'EM_AQUISICAO' | 'ADQUIRIDO' | 'CONCLUIDO' | 'VENCIDO' = 'EM_AQUISICAO';
        if (now >= effEnd) {
          if (customPeriod.daysRemaining <= 0 && customPeriod.daysScheduled === 0) {
            calcStatus = 'CONCLUIDO';
          } else if (now > effDeadline && customPeriod.daysRemaining > 0) {
            calcStatus = 'VENCIDO';
          } else {
            calcStatus = 'ADQUIRIDO';
          }
        }
        if (customPeriod.status !== calcStatus) {
          await prisma.vacationPeriod.update({
            where: { id: customPeriod.id },
            data: { status: calcStatus },
          });
        }
      }
    }

    const finalPeriods = await prisma.vacationPeriod.findMany({
      where: { employeeId },
      orderBy: { vestingStartDate: 'desc' },
      include: {
        requests: {
          orderBy: { startDate: 'desc' },
        },
      },
    });

    return finalPeriods.map((p) => this.enrichPeriod(p, now));
  }

  /**
   * Sincroniza automaticamente os períodos aquisitivos de todos os colaboradores ativos da empresa
   */
  static async syncCompanyPeriods(companyId?: string, forceAll: boolean = false): Promise<number> {
    const whereEmp: any = {
      deletedAt: null,
      status: { not: 'DESLIGADO' },
      contractType: { not: 'PJ' },
      NOT: {
        registrationNumber: { startsWith: 'LID-' },
      },
    };
    if (companyId) whereEmp.companyId = companyId;

    const employees = await prisma.employee.findMany({
      where: whereEmp,
      select: {
        id: true,
        _count: { select: { vacationPeriods: true } },
      },
    });

    let syncedCount = 0;
    for (const emp of employees) {
      if (forceAll || emp._count.vacationPeriods === 0) {
        await this.ensurePeriodsForEmployee(emp.id);
        syncedCount++;
      }
    }

    return syncedCount;
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
    const inAcquisitionPeriods = periods.filter((p) => p.status === 'EM_AQUISICAO');
    const totalDaysAvailable = activePeriods.reduce((acc, p) => acc + p.daysRemaining, 0);
    const totalProportionalDays = inAcquisitionPeriods.reduce((acc, p) => acc + (p.accruedDays || 0), 0);
    const totalDaysScheduled = periods.reduce((acc, p) => acc + p.daysScheduled, 0);
    const totalDaysTaken = periods.reduce((acc, p) => acc + p.daysTaken, 0);

    return {
      totalDaysAvailable,
      totalProportionalDays,
      totalDaysScheduled,
      totalDaysTaken,
      periods,
      requests,
    };
  }

  /**
   * Listagem centralizada de todos os períodos aquisitivos/concessivos para a página de Controle de Férias do RH
   */
  static async listRhPeriods(query: QueryRhPeriodsInput) {
    const {
      companyId,
      departmentId,
      managerId,
      status,
      urgency,
      search,
      page = 1,
      pageSize = 50,
    } = query;

    // Garante que colaboradores recém-cadastrados sem períodos tenham seus períodos gerados
    await this.syncCompanyPeriods(companyId, false);

    const employeeWhere: any = {
      deletedAt: null,
      status: { not: 'DESLIGADO' },
      contractType: { not: 'PJ' },
      NOT: {
        registrationNumber: { startsWith: 'LID-' },
      },
    };

    if (companyId) employeeWhere.companyId = companyId;
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (managerId) employeeWhere.managerId = managerId;

    if (search && search.trim()) {
      const s = search.trim();
      employeeWhere.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { registrationNumber: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const wherePeriod: any = {
      employee: employeeWhere,
    };

    if (status) {
      wherePeriod.status = status;
    }

    const allMatchingPeriods = await prisma.vacationPeriod.findMany({
      where: wherePeriod,
      orderBy: [{ deadlineDate: 'asc' }, { vestingStartDate: 'asc' }],
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            registrationNumber: true,
            name: true,
            admissionDate: true,
            contractType: true,
            status: true,
            companyId: true,
            departmentId: true,
            managerId: true,
            department: { select: { id: true, name: true } },
            manager: { select: { id: true, name: true } },
          },
        },
        requests: {
          where: { status: { in: ['APROVADO', 'PENDENTE_RH', 'PENDENTE_GESTOR'] } },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    const now = new Date();
    const enrichedAll = allMatchingPeriods.map((p) => this.enrichPeriod(p, now));

    // Indicadores globais (sobre o filtro de empresa/setor/gestor, independente de filtro de status/urgência)
    const acquiredOpenCount = enrichedAll.filter(
      (p) => (p.status === 'ADQUIRIDO' || p.status === 'VENCIDO') && p.daysRemaining > 0
    ).length;
    const inAcquisitionCount = enrichedAll.filter((p) => p.status === 'EM_AQUISICAO').length;
    const expiringAlertCount = enrichedAll.filter(
      (p) => ['VENCIDO', 'CRITICO', 'ALERTA'].includes(p.urgencyLevel) && p.daysRemaining > 0
    ).length;
    const scheduledRequestsCount = enrichedAll.reduce(
      (acc, p) => acc + (p.requests?.length || 0),
      0
    );

    const filtered = urgency
      ? enrichedAll.filter((p) => p.urgencyLevel === urgency)
      : enrichedAll;

    const total = filtered.length;
    const skip = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(skip, skip + pageSize);

    return {
      items: paginatedItems,
      summary: {
        totalPeriods: enrichedAll.length,
        acquiredOpenCount,
        inAcquisitionCount,
        expiringAlertCount,
        scheduledRequestsCount,
      },
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  /**
   * RH programa/lança férias diretamente para um colaborador
   */
  static async scheduleByRh(rhUserId: string, data: ScheduleVacationRhInput) {
    const period = await prisma.vacationPeriod.findUnique({
      where: { id: data.vacationPeriodId },
      include: {
        employee: true,
      },
    });

    if (!period) {
      const error: any = new Error('Período aquisitivo não encontrado');
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

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const totalRequested = daysCount + (data.sellDaysCount || 0);

    if (totalRequested > period.daysRemaining) {
      const error: any = new Error(
        `Saldo insuficiente no período. Solicitado: ${totalRequested} dias (Gozo: ${daysCount} + Abono: ${data.sellDaysCount || 0}), Disponível: ${period.daysRemaining} dias.`
      );
      error.statusCode = 400;
      throw error;
    }

    const finalStatus = data.autoApprove !== false ? 'APROVADO' : 'PENDENTE_RH';

    const request = await prisma.vacationRequest.create({
      data: {
        employeeId: period.employeeId,
        vacationPeriodId: period.id,
        startDate: start,
        endDate: end,
        daysCount,
        sellDaysCount: data.sellDaysCount || 0,
        advanceThirteenth: Boolean(data.advanceThirteenth),
        notes: data.notes || 'Férias programadas diretamente pelo RH.',
        status: finalStatus,
        managerId: period.employee.managerId || null,
        rhUserId: finalStatus === 'APROVADO' ? rhUserId : null,
        rhActionAt: finalStatus === 'APROVADO' ? new Date() : null,
        rhNotes: finalStatus === 'APROVADO' ? (data.notes || 'Programado e homologado pelo RH.') : null,
      },
      include: {
        employee: { select: { id: true, name: true, registrationNumber: true } },
        vacationPeriod: true,
      },
    });

    const newRemaining = Math.max(0, period.daysRemaining - totalRequested);
    const newScheduled = period.daysScheduled + totalRequested;

    await prisma.vacationPeriod.update({
      where: { id: period.id },
      data: {
        daysScheduled: newScheduled,
        daysRemaining: newRemaining,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: period.employeeId,
        action: 'FERIAS_PROGRAMADAS_RH',
        entity: 'VacationRequest',
        recordId: request.id,
        newValue: {
          vacationPeriodId: period.id,
          startDate: data.startDate,
          endDate: data.endDate,
          daysCount,
          sellDaysCount: data.sellDaysCount,
          status: finalStatus,
        },
      },
    });

    return request;
  }

  /**
   * RH ajusta saldos, dias cedidos ou datas de um período aquisitivo
   */
  static async updatePeriodByRh(
    periodId: string,
    rhUserId: string,
    data: UpdateVacationPeriodRhInput
  ) {
    const existing = await prisma.vacationPeriod.findUnique({
      where: { id: periodId },
    });

    if (!existing) {
      const error: any = new Error('Período aquisitivo não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const daysEntitled = data.daysEntitled ?? existing.daysEntitled;
    const daysTaken = data.daysTaken ?? existing.daysTaken;
    const daysScheduled = data.daysScheduled ?? existing.daysScheduled;
    const daysRemaining =
      data.daysRemaining !== undefined
        ? data.daysRemaining
        : Math.max(0, daysEntitled - daysTaken - daysScheduled);

    const vestingStartDate = data.vestingStartDate
      ? new Date(data.vestingStartDate)
      : existing.vestingStartDate;
    const vestingEndDate = data.vestingEndDate
      ? new Date(data.vestingEndDate)
      : existing.vestingEndDate;
    const deadlineDate = data.deadlineDate
      ? new Date(data.deadlineDate)
      : existing.deadlineDate;

    const now = new Date();
    let status: 'EM_AQUISICAO' | 'ADQUIRIDO' | 'CONCLUIDO' | 'VENCIDO' = 'EM_AQUISICAO';
    if (now >= vestingEndDate) {
      if (daysRemaining <= 0 && daysScheduled === 0) {
        status = 'CONCLUIDO';
      } else if (now > deadlineDate && daysRemaining > 0) {
        status = 'VENCIDO';
      } else {
        status = 'ADQUIRIDO';
      }
    } else if (daysRemaining <= 0 && daysScheduled === 0 && daysTaken >= daysEntitled) {
      status = 'CONCLUIDO';
    }

    const updated = await prisma.vacationPeriod.update({
      where: { id: periodId },
      data: {
        daysEntitled,
        daysTaken,
        daysScheduled,
        daysRemaining,
        vestingStartDate,
        vestingEndDate,
        deadlineDate,
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: existing.employeeId,
        action: 'PERIODO_FERIAS_AJUSTADO_RH',
        entity: 'VacationPeriod',
        recordId: periodId,
        previousValue: {
          daysEntitled: existing.daysEntitled,
          daysTaken: existing.daysTaken,
          daysRemaining: existing.daysRemaining,
          deadlineDate: existing.deadlineDate,
          status: existing.status,
        },
        newValue: {
          daysEntitled,
          daysTaken,
          daysRemaining,
          deadlineDate,
          status,
        },
      },
    });

    return this.enrichPeriod(updated, now);
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
  static async getExpiringAlerts(companyId?: string) {
    await this.syncCompanyPeriods(companyId, false);

    const now = new Date();
    const alertLimit = new Date();
    alertLimit.setDate(alertLimit.getDate() + 90); // 90 dias

    const whereClause: any = {
      status: { in: ['ADQUIRIDO', 'VENCIDO'] },
      daysRemaining: { gt: 0 },
      deadlineDate: { lte: alertLimit },
      employee: {
        deletedAt: null,
        status: { not: 'DESLIGADO' },
        contractType: { not: 'PJ' },
        NOT: {
          registrationNumber: { startsWith: 'LID-' },
        },
        ...(companyId ? { companyId } : {}),
      },
    };

    const periods = await prisma.vacationPeriod.findMany({
      where: whereClause,
      orderBy: { deadlineDate: 'asc' },
      include: {
        employee: {
          select: {
            id: true,
            code: true,
            name: true,
            registrationNumber: true,
            department: { select: { id: true, name: true } },
            manager: { select: { id: true, name: true } },
          },
        },
      },
    });

    return periods.map((p) => this.enrichPeriod(p, now));
  }
}
