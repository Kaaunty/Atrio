import { prisma } from '../../../database/prisma.js';
import { TimeCalculationEngine } from './time-calculation.engine.js';

export interface MonthlyBalanceStatementItem {
  yearMonth: string;
  startingBalanceMinutes: number;
  startingBalanceFormatted: string;
  totalCreditsMinutes: number;
  totalCreditsFormatted: string;
  totalDebitsMinutes: number;
  totalDebitsFormatted: string;
  manualAdjustmentsMinutes: number;
  manualAdjustmentsFormatted: string;
  closingBalanceMinutes: number;
  closingBalanceFormatted: string;
  isClosed: boolean;
}

export class TimeBalanceService {
  /**
   * Consolida o balanço mensal do banco de horas para um colaborador a partir das apurações diárias
   */
  static async consolidateMonth(employeeId: string, yearMonth: string) {
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    // Busca todas as apurações diárias salvas do mês
    const dailySummaries = await prisma.timeDailySummary.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let totalCreditsMinutes = 0;
    let totalDebitsMinutes = 0;

    for (const d of dailySummaries) {
      if (d.balanceMinutes > 0) {
        totalCreditsMinutes += d.balanceMinutes;
      } else if (d.balanceMinutes < 0) {
        totalDebitsMinutes += Math.abs(d.balanceMinutes);
      }
    }

    // Busca o saldo final do mês anterior como saldo inicial deste mês
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const prevBalance = await prisma.timeBalance.findUnique({
      where: {
        employeeId_yearMonth: {
          employeeId,
          yearMonth: prevYearMonth,
        },
      },
    });

    const startingBalanceMinutes = prevBalance ? prevBalance.closingBalanceMinutes : 0;

    // Busca registro atual se houver para preservar ajustes manuais autorizados
    const currentBalance = await prisma.timeBalance.findUnique({
      where: {
        employeeId_yearMonth: {
          employeeId,
          yearMonth,
        },
      },
    });

    const manualAdjustmentsMinutes = currentBalance ? currentBalance.manualAdjustmentsMinutes : 0;
    const closingBalanceMinutes =
      startingBalanceMinutes + totalCreditsMinutes - totalDebitsMinutes + manualAdjustmentsMinutes;

    const saved = await prisma.timeBalance.upsert({
      where: {
        employeeId_yearMonth: {
          employeeId,
          yearMonth,
        },
      },
      create: {
        employeeId,
        yearMonth,
        startingBalanceMinutes,
        totalCreditsMinutes,
        totalDebitsMinutes,
        manualAdjustmentsMinutes,
        closingBalanceMinutes,
        isClosed: false,
      },
      update: {
        startingBalanceMinutes,
        totalCreditsMinutes,
        totalDebitsMinutes,
        closingBalanceMinutes,
      },
    });

    return saved;
  }

  /**
   * Consulta extrato completo e saldo acumulado atual do banco de horas
   */
  static async getBalance(employeeId: string) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, registrationNumber: true, admissionDate: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Busca todos os balanços mensais ordenados cronologicamente
    const balances = await prisma.timeBalance.findMany({
      where: { employeeId },
      orderBy: { yearMonth: 'desc' },
      take: 24, // últimos 24 meses
    });

    const statement: MonthlyBalanceStatementItem[] = balances.map((b) => ({
      yearMonth: b.yearMonth,
      startingBalanceMinutes: b.startingBalanceMinutes,
      startingBalanceFormatted: TimeCalculationEngine.formatMinutesToHours(b.startingBalanceMinutes, true),
      totalCreditsMinutes: b.totalCreditsMinutes,
      totalCreditsFormatted: TimeCalculationEngine.formatMinutesToHours(b.totalCreditsMinutes, true),
      totalDebitsMinutes: b.totalDebitsMinutes,
      totalDebitsFormatted: TimeCalculationEngine.formatMinutesToHours(-b.totalDebitsMinutes, true),
      manualAdjustmentsMinutes: b.manualAdjustmentsMinutes,
      manualAdjustmentsFormatted: TimeCalculationEngine.formatMinutesToHours(b.manualAdjustmentsMinutes, true),
      closingBalanceMinutes: b.closingBalanceMinutes,
      closingBalanceFormatted: TimeCalculationEngine.formatMinutesToHours(b.closingBalanceMinutes, true),
      isClosed: b.isClosed,
    }));

    // O saldo acumulado atual é o closingBalanceMinutes do mês mais recente
    const currentMonthBalance = balances.length > 0 ? balances[0] : null;
    const accumulatedMinutes = currentMonthBalance ? currentMonthBalance.closingBalanceMinutes : 0;

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        registrationNumber: employee.registrationNumber,
      },
      accumulatedBalanceMinutes: accumulatedMinutes,
      accumulatedBalanceFormatted: TimeCalculationEngine.formatMinutesToHours(accumulatedMinutes, true),
      statement,
    };
  }

  /**
   * Aplica um ajuste manual no saldo do banco de horas (com auditoria)
   */
  static async addManualAdjustment(
    employeeId: string,
    yearMonth: string,
    minutes: number,
    reason: string,
    authorUserId?: string
  ) {
    const balance = await prisma.timeBalance.upsert({
      where: {
        employeeId_yearMonth: {
          employeeId,
          yearMonth,
        },
      },
      create: {
        employeeId,
        yearMonth,
        startingBalanceMinutes: 0,
        totalCreditsMinutes: 0,
        totalDebitsMinutes: 0,
        manualAdjustmentsMinutes: minutes,
        closingBalanceMinutes: minutes,
      },
      update: {
        manualAdjustmentsMinutes: {
          increment: minutes,
        },
        closingBalanceMinutes: {
          increment: minutes,
        },
      },
    });

    // Registra log de auditoria
    if (authorUserId) {
      await prisma.auditLog.create({
        data: {
          userId: authorUserId,
          employeeId,
          action: 'AJUSTE_MANUAL_BANCO_HORAS',
          entity: 'TimeBalance',
          recordId: balance.id,
          newValue: {
            yearMonth,
            adjustmentMinutes: minutes,
            reason,
          },
        },
      });
    }

    return balance;
  }
}
