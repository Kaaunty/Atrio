import { prisma } from '../../../database/prisma.js';

export class DashboardService {
  /**
   * Visão Consolidada do Colaborador (Meu Espaço)
   */
  static async getEmployeeDashboardSummary(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
      },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado');
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // 1. Saldo de Banco de Horas
    const timeBalance = await prisma.timeBalance.findFirst({
      where: { employeeId, yearMonth },
    });

    const totalBalanceMinutes = timeBalance ? timeBalance.accumulatedMinutes : 0;
    const sign = totalBalanceMinutes >= 0 ? '+' : '-';
    const absMins = Math.abs(totalBalanceMinutes);
    const hours = Math.floor(absMins / 60);
    const mins = absMins % 60;
    const formattedBalance = `${sign}${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;

    // 2. Férias Disponíveis & Próxima Programação
    const vacationPeriods = await prisma.vacationPeriod.findMany({
      where: { employeeId },
    });

    const totalAvailableDays = vacationPeriods.reduce(
      (acc, p) => acc + p.daysRemaining,
      0
    );

    const nextVacation = await prisma.vacationRequest.findFirst({
      where: {
        employeeId,
        status: 'APROVADO',
        startDate: { gte: now },
      },
      orderBy: { startDate: 'asc' },
    });

    // 3. Solicitações em Andamento
    const pendingRequests = await prisma.request.findMany({
      where: {
        requesterId: employeeId,
        status: { in: ['ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_GESTOR', 'AGUARDANDO_RH'] },
      },
      include: { requestType: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 4. Documentos Pendentes de Leitura / Aceite
    const accessibleDocs = await prisma.employeeDocument.findMany({
      where: {
        deletedAt: null,
        OR: [
          { employeeId },
          { visibility: 'COMPANY_WIDE' },
          ...(employee.departmentId
            ? [{ visibility: 'DEPARTMENT' as const, departmentId: employee.departmentId }]
            : []),
        ],
        documentType: { requiresReadAcknowledgement: true },
      },
      include: {
        readReceipts: { where: { employeeId } },
      },
    });

    const unreadDocsCount = accessibleDocs.filter((d) => d.readReceipts.length === 0).length;

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        registrationNumber: employee.registrationNumber,
        department: employee.department?.name || '—',
        position: employee.position?.title || '—',
        status: employee.status,
      },
      timeBalance: {
        totalBalanceMinutes,
        formattedBalance,
        isPositive: totalBalanceMinutes >= 0,
      },
      vacations: {
        availableDays: Math.max(0, totalAvailableDays),
        nextScheduledDate: nextVacation ? nextVacation.startDate.toISOString().split('T')[0] : null,
        nextScheduledDays: nextVacation ? nextVacation.daysCount : null,
      },
      requests: {
        pendingCount: pendingRequests.length,
        recentList: pendingRequests.map((r) => ({
          id: r.id,
          typeCode: r.requestType.code,
          typeName: r.requestType.name,
          status: r.status,
          createdAt: r.createdAt,
        })),
      },
      unreadDocumentsCount: unreadDocsCount,
    };
  }

  /**
   * Visão Tática da Equipe do Gestor
   */
  static async getManagerDashboardSummary(managerEmployeeId: string) {
    const subordinates = await prisma.employee.findMany({
      where: { managerId: managerEmployeeId, deletedAt: null },
      select: { id: true, name: true, registrationNumber: true, departmentId: true },
    });

    const subIds = subordinates.map((s) => s.id);
    const now = new Date();

    if (subIds.length === 0) {
      return {
        teamTotalCount: 0,
        absentToday: [],
        pendingApprovalsCount: 0,
        pendingTimeAdjustments: [],
        pendingVacations: [],
        teamDivergencesMonthCount: 0,
        teamExtraHoursMonthMinutes: 0,
        upcomingAbsences: [],
      };
    }

    // 1. Ausentes Hoje (Afastamento ou Férias)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const leavesToday = await prisma.leaveOfAbsence.findMany({
      where: {
        employeeId: { in: subIds },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
    });

    const vacationsToday = await prisma.vacationRequest.findMany({
      where: {
        employeeId: { in: subIds },
        status: 'APROVADO',
        startDate: { lte: today },
        endDate: { gte: today },
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
    });

    const absentToday = [
      ...leavesToday.map((l) => ({
        employeeId: l.employeeId,
        name: l.employee.name,
        reason: 'Afastamento / Saúde',
      })),
      ...vacationsToday.map((v) => ({
        employeeId: v.employeeId,
        name: v.employee.name,
        reason: 'Férias Programadas',
      })),
    ];

    // 2. Pendências de Aprovação de Ponto da Equipe
    const pendingAdjustments = await prisma.timeClockAdjustment.findMany({
      where: {
        employeeId: { in: subIds },
        status: 'PENDENTE_GESTOR',
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 3. Pendências de Aprovação de Férias da Equipe
    const pendingVacations = await prisma.vacationRequest.findMany({
      where: {
        employeeId: { in: subIds },
        status: 'PENDENTE_GESTOR',
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // 4. Divergências e Horas Extras do Mês Vigente
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const summariesMonth = await prisma.timeDailySummary.findMany({
      where: {
        employeeId: { in: subIds },
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const teamDivergencesCount = summariesMonth.filter((s) => s.status === 'DIVERGENTE').length;
    const teamExtraHoursMins = summariesMonth.reduce((acc, s) => acc + s.extraHoursMinutes, 0);

    // 5. Ausências Agendadas nos Próximos 30 Dias
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);

    const upcomingVacations = await prisma.vacationRequest.findMany({
      where: {
        employeeId: { in: subIds },
        status: 'APROVADO',
        startDate: { gte: now, lte: thirtyDaysAhead },
      },
      include: {
        employee: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return {
      teamTotalCount: subordinates.length,
      absentToday,
      pendingApprovalsCount: pendingAdjustments.length + pendingVacations.length,
      pendingTimeAdjustments: pendingAdjustments.map((a) => ({
        id: a.id,
        employeeName: a.employee.name,
        date: a.date.toISOString().split('T')[0],
        adjustmentType: a.adjustmentType,
        reason: a.reason,
        createdAt: a.createdAt,
      })),
      pendingVacations: pendingVacations.map((v) => ({
        id: v.id,
        employeeName: v.employee.name,
        startDate: v.startDate.toISOString().split('T')[0],
        endDate: v.endDate.toISOString().split('T')[0],
        daysCount: v.daysCount,
        createdAt: v.createdAt,
      })),
      teamDivergencesMonthCount: teamDivergencesCount,
      teamExtraHoursMonthMinutes: teamExtraHoursMins,
      upcomingAbsences: upcomingVacations.map((v) => ({
        employeeName: v.employee.name,
        startDate: v.startDate.toISOString().split('T')[0],
        endDate: v.endDate.toISOString().split('T')[0],
        daysCount: v.daysCount,
      })),
    };
  }

  /**
   * Visão Estratégica do RH & Diretoria (Corporativo)
   */
  static async getRhDashboardSummary(filters: { companyId?: string; departmentId?: string; period?: string }) {
    const whereEmp: any = { deletedAt: null };
    if (filters.departmentId) whereEmp.departmentId = filters.departmentId;

    // 1. Headcount de Ativos
    const headcount = await prisma.employee.count({
      where: { ...whereEmp, status: 'ATIVO' },
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // 2. Admissões e Desligamentos do Mês
    const admissionsMonth = await prisma.employee.count({
      where: {
        ...whereEmp,
        admissionDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const terminationsMonth = await prisma.employee.count({
      where: {
        ...whereEmp,
        terminationDate: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const turnoverRate = headcount > 0
      ? Number((((admissionsMonth + terminationsMonth) / 2 / headcount) * 100).toFixed(1))
      : 0;

    // 3. Férias a Vencer (Expiração em < 60 dias)
    const sixtyDaysAhead = new Date();
    sixtyDaysAhead.setDate(sixtyDaysAhead.getDate() + 60);

    const expiringVacationPeriods = await prisma.vacationPeriod.findMany({
      where: {
        deadlineDate: { lte: sixtyDaysAhead },
        employee: whereEmp,
      },
      include: {
        employee: {
          select: { id: true, name: true, registrationNumber: true, department: { select: { name: true } } },
        },
      },
      orderBy: { deadlineDate: 'asc' },
    });

    const expiringList = expiringVacationPeriods
      .map((p) => {
        const availableDays = p.daysRemaining;
        return {
          periodId: p.id,
          employeeName: p.employee.name,
          registrationNumber: p.employee.registrationNumber,
          departmentName: p.employee.department?.name || '—',
          expirationDate: p.deadlineDate.toISOString().split('T')[0],
          availableDays,
        };
      })
      .filter((p) => p.availableDays > 0);

    // 4. Divergências de Ponto e Fila de Solicitações do RH
    const pendingDivergencesCount = await prisma.timeDailySummary.count({
      where: {
        status: 'FALTA',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const requestsQueue = await prisma.request.groupBy({
      by: ['status'],
      _count: true,
    });

    const requestsSummary = {
      NOVA: 0,
      EM_ANDAMENTO: 0,
      CONCLUIDA: 0,
      REJEITADA: 0,
    };

    requestsQueue.forEach((r) => {
      if (r.status in requestsSummary) {
        requestsSummary[r.status as keyof typeof requestsSummary] = r._count;
      }
    });

    // 5. Absenteísmo Estimado
    const totalDailySummaries = await prisma.timeDailySummary.count({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
    });

    const absentDailySummaries = await prisma.timeDailySummary.count({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['FALTA', 'AFASTAMENTO'] },
      },
    });

    const absenteeismRate = totalDailySummaries > 0
      ? Number(((absentDailySummaries / totalDailySummaries) * 100).toFixed(1))
      : 0;

    return {
      headcount,
      admissionsMonth,
      terminationsMonth,
      turnoverRate: `${turnoverRate}%`,
      expiringVacationsCount: expiringList.length,
      expiringVacationsList: expiringList.slice(0, 10),
      pendingDivergencesCount,
      absenteeismRate: `${absenteeismRate}%`,
      requestsQueueSummary: requestsSummary,
    };
  }

  /**
   * Busca Universal Global (RH & Gestores)
   */
  static async globalSearch(query: string) {
    if (!query || query.trim().length < 2) {
      return { employees: [], departments: [], requests: [] };
    }

    const q = query.trim();

    const [employees, departments, requests] = await Promise.all([
      prisma.employee.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { registrationNumber: { contains: q, mode: 'insensitive' } },
            { cpf: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          registrationNumber: true,
          email: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
        take: 5,
      }),
      prisma.department.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, name: true, code: true },
        take: 3,
      }),
      prisma.request.findMany({
        where: {
          OR: [
            { requestNumber: { contains: q, mode: 'insensitive' } },
            { requestType: { name: { contains: q, mode: 'insensitive' } } },
            { requester: { name: { contains: q, mode: 'insensitive' } } },
          ],
        },
        include: {
          requester: { select: { name: true } },
          requestType: { select: { name: true } },
        },
        take: 5,
      }),
    ]);

    return {
      employees,
      departments,
      requests: requests.map((r) => ({
        id: r.id,
        requestNumber: r.requestNumber,
        employeeName: r.requester.name,
        typeName: r.requestType.name,
        status: r.status,
      })),
    };
  }
}
