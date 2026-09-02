import { prisma } from '../../../database/prisma.js';
import { ScheduleRuleDay } from '../time-clock.dto.js';
import { TimeBalanceService } from './time-balance.service.js';
import { TimeCalculationEngine, ProcessedEntryItem } from './time-calculation.engine.js';
import { WorkScheduleService, DEFAULT_STANDARD_44H_RULES } from './work-schedule.service.js';

export interface DaySummaryView {
  date: string; // YYYY-MM-DD
  dayOfWeek: number;
  dayOfWeekName: string;
  e1: string;
  s1: string;
  e2: string;
  s2: string;
  extraEntries: string[];
  expectedWorkMinutes: number;
  expectedWorkFormatted: string;
  actualWorkMinutes: number;
  actualWorkFormatted: string;
  balanceMinutes: number;
  balanceFormatted: string;
  status: string;
  divergenceReasons: string[];
  entries: ProcessedEntryItem[];
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export class TimeSummaryService {
  /**
   * Retorna a data de hoje no fuso horário oficial (America/Sao_Paulo) no formato YYYY-MM-DD
   */
  static getTodayDateStr(): string {
    return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  }

  /**
   * Converte uma string YYYY-MM-DD nos limites de início e fim do dia em UTC
   */
  static getDayDateRange(dateStr: string): { start: Date; end: Date; dayOfWeek: number } {
    const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
    const start = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
    const end = new Date(Date.UTC(y, m - 1, d + 1, 2, 59, 59, 999));
    const localDate = new Date(y, m - 1, d);
    const dayOfWeek = localDate.getDay();

    return { start, end, dayOfWeek };
  }

  /**
   * Converte uma string de horários do RHiD/Control iD em um array estruturado de regras por dia da semana
   */
  static parseRawScheduleText(rawStr: string): ScheduleRuleDay[] {
    const DAY_MAP: Record<string, number> = { dom: 0, seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6, sáb: 6 };
    const resultDays: Record<number, { isWorkDay: boolean; expectedWorkMinutes: number; intervals: { start: string; end: string }[] }> = {};
    for (let d = 0; d <= 6; d++) {
      resultDays[d] = { isWorkDay: false, expectedWorkMinutes: 0, intervals: [] };
    }
    if (!rawStr || typeof rawStr !== 'string') return Object.entries(resultDays).map(([d, val]) => ({ dayOfWeek: Number(d), ...val }));

    const blockRegex = /(?:Seg|Ter|Qua|Qui|Sex|Sáb|Sab|Dom)(?:[\s,]+(?:Seg|Ter|Qua|Qui|Sex|Sáb|Sab|Dom))*\s*:/gi;
    const matches = Array.from(rawStr.matchAll(blockRegex));

    if (matches.length === 0) {
      const times = Array.from(rawStr.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g));
      let totalMins = 0;
      const intervals = times.map((m) => {
        const [h1, m1] = m[1].split(':').map(Number);
        const [h2, m2] = m[2].split(':').map(Number);
        totalMins += (h2 * 60 + m2) - (h1 * 60 + m1);
        return { start: m[1], end: m[2] };
      });
      for (let d = 1; d <= 5; d++) {
        resultDays[d] = { isWorkDay: true, expectedWorkMinutes: totalMins, intervals };
      }
      return Object.entries(resultDays).map(([d, val]) => ({ dayOfWeek: Number(d), ...val }));
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const header = match[0].toLowerCase();
      const startIdx = match.index! + match[0].length;
      const endIdx = i + 1 < matches.length ? matches[i + 1].index! : rawStr.length;
      const body = rawStr.substring(startIdx, endIdx);
      const matchedDays: number[] = [];

      for (const [name, dayNum] of Object.entries(DAY_MAP)) {
        const regex = new RegExp('\\b' + name + '\\b', 'i');
        if (regex.test(header)) {
          matchedDays.push(dayNum);
        }
      }

      const isFolga = /folga/i.test(body);
      const times = Array.from(body.matchAll(/(\d{2}:\d{2})-(\d{2}:\d{2})/g));
      let totalMins = 0;
      const intervals = times.map((m) => {
        const [h1, m1] = m[1].split(':').map(Number);
        const [h2, m2] = m[2].split(':').map(Number);
        totalMins += (h2 * 60 + m2) - (h1 * 60 + m1);
        return { start: m[1], end: m[2] };
      });

      for (const d of matchedDays) {
        resultDays[d] = {
          isWorkDay: !isFolga && intervals.length > 0,
          expectedWorkMinutes: isFolga ? 0 : totalMins,
          intervals: isFolga ? [] : intervals,
        };
      }
    }

    return Object.entries(resultDays).map(([d, val]) => ({ dayOfWeek: Number(d), ...val }));
  }

  /**
   * Extrai com segurança o array de regras da escala de trabalho, previnindo falhas quando scheduleRules for objeto ou string raw
   */
  static getScheduleRulesArray(scheduleRules: any): ScheduleRuleDay[] {
    if (Array.isArray(scheduleRules) && scheduleRules.length > 0 && typeof scheduleRules[0] === 'object') {
      const first = scheduleRules[0];
      if ('dayOfWeek' in first && ('isWorkDay' in first || 'expectedWorkMinutes' in first || 'startTime' in first)) {
        return scheduleRules.map((r: any) => {
          let expectedMins = r.expectedWorkMinutes ?? r.expectedMinutes;
          let intervals = r.intervals || [];
          if ((expectedMins === undefined || expectedMins === null) && r.startTime && r.endTime) {
            const [h1, m1] = r.startTime.split(':').map(Number);
            const [h2, m2] = r.endTime.split(':').map(Number);
            let dur = (h2 * 60 + m2) - (h1 * 60 + m1);
            if (r.lunchStart && r.lunchEnd) {
              const [lh1, lm1] = r.lunchStart.split(':').map(Number);
              const [lh2, lm2] = r.lunchEnd.split(':').map(Number);
              dur -= ((lh2 * 60 + lm2) - (lh1 * 60 + lm1));
              intervals = [
                { start: r.startTime, end: r.lunchStart },
                { start: r.lunchEnd, end: r.endTime },
              ];
            } else {
              intervals = [{ start: r.startTime, end: r.endTime }];
            }
            expectedMins = Math.max(0, dur);
          }
          return {
            dayOfWeek: r.dayOfWeek,
            isWorkDay: r.isWorkDay ?? true,
            expectedWorkMinutes: expectedMins ?? 0,
            intervals,
          };
        });
      }
    }
    if (scheduleRules && typeof scheduleRules === 'object') {
      if (Array.isArray(scheduleRules.rules)) {
        return this.getScheduleRulesArray(scheduleRules.rules);
      }
      if (typeof scheduleRules.raw === 'string' && scheduleRules.raw.trim().length > 0) {
        return this.parseRawScheduleText(scheduleRules.raw);
      }
    }
    if (typeof scheduleRules === 'string' && scheduleRules.trim().length > 0) {
      return this.parseRawScheduleText(scheduleRules);
    }
    return DEFAULT_STANDARD_44H_RULES;
  }

  /**
   * Aplica ajustes de ponto homologados (inclusões, alterações e exclusões de duplicadas)
   */
  static applyApprovedAdjustments(
    dateStr: string,
    rawEntries: { id: string; timestamp: Date | string; source: string; hash?: string; isAdjusted?: boolean }[],
    adjustments: { id: string; adjustmentType: any; targetTime: string; originalEntryId?: string | null; reason: string }[]
  ) {
    let entries = [...rawEntries];

    for (const adj of adjustments) {
      if (adj.adjustmentType === 'EXCLUSAO_DUPLICADA' && adj.originalEntryId) {
        entries = entries.filter((e) => e.id !== adj.originalEntryId);
      } else if (adj.adjustmentType === 'ALTERACAO' && adj.originalEntryId) {
        const idx = entries.findIndex((e) => e.id === adj.originalEntryId);
        if (idx !== -1) {
          const [h, m] = adj.targetTime.split(':');
          const adjustedIso = `${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00-03:00`;
          entries[idx] = {
            ...entries[idx],
            timestamp: new Date(adjustedIso),
            isAdjusted: true,
          };
        }
      } else if (adj.adjustmentType === 'INCLUSAO') {
        const [h, m] = adj.targetTime.split(':');
        const adjustedIso = `${dateStr}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00-03:00`;
        entries.push({
          id: `adj-${adj.id}`,
          timestamp: new Date(adjustedIso),
          source: 'AJUSTE_HOMOLOGADO',
          isAdjusted: true,
        });
      }
    }

    entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return entries;
  }

  /**
   * Consulta a apuração e batidas do dia atual do colaborador
   */
  static async getToday(employeeId: string) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      include: { workSchedule: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const todayStr = this.getTodayDateStr();
    const { start, end, dayOfWeek } = this.getDayDateRange(todayStr);

    const schedule = await WorkScheduleService.getScheduleForEmployee(employee.id);
    const rules = this.getScheduleRulesArray(schedule.scheduleRules);
    const todayRule = rules.find((r) => r.dayOfWeek === dayOfWeek) || null;

    // Busca batidas registradas hoje e ajustes homologados
    const [rawEntries, approvedAdjustments] = await Promise.all([
      prisma.timeClockEntry.findMany({
        where: {
          OR: [
            { employeeId: employee.id },
            { registrationNumber: employee.registrationNumber },
          ],
          timestamp: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.timeClockAdjustment.findMany({
        where: {
          employeeId: employee.id,
          date: new Date(todayStr),
          status: 'APROVADO',
        },
      }),
    ]);

    const effectiveEntries = this.applyApprovedAdjustments(
      todayStr,
      rawEntries.map((e) => ({
        id: e.id,
        timestamp: e.timestamp,
        source: e.source,
        hash: e.hash,
      })),
      approvedAdjustments
    );

    const dayCalc = TimeCalculationEngine.calculateDay({
      dateStr: todayStr,
      dayOfWeek,
      scheduleRule: todayRule,
      toleranceMinutes: schedule.toleranceMinutes,
      lunchIntervalMinutes: schedule.lunchIntervalMinutes,
      flexibleInterval: schedule.flexibleInterval,
      rawEntries: effectiveEntries,
      isPastOrToday: true,
    });

    let currentShiftStatus = 'NAO_INICIADO';
    const totalMarks = dayCalc.entries.length;

    if (totalMarks === 0) {
      currentShiftStatus = dayCalc.status === 'FOLGA' ? 'FOLGA' : 'NAO_INICIADO';
    } else if (totalMarks % 2 !== 0) {
      currentShiftStatus = 'TRABALHANDO';
    } else if (totalMarks === 2) {
      currentShiftStatus = 'INTERVALO_ALMOCO';
    } else if (totalMarks >= 4) {
      currentShiftStatus = 'JORNADA_ENCERRADA';
    }

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        registrationNumber: employee.registrationNumber,
      },
      today: {
        date: todayStr,
        dayOfWeek,
        dayOfWeekName: DAY_NAMES[dayOfWeek],
        currentShiftStatus,
        expectedWorkMinutes: dayCalc.expectedWorkMinutes,
        expectedWorkFormatted: TimeCalculationEngine.formatMinutesToHours(dayCalc.expectedWorkMinutes),
        actualWorkMinutes: dayCalc.actualWorkMinutes,
        actualWorkFormatted: TimeCalculationEngine.formatMinutesToHours(dayCalc.actualWorkMinutes),
        balanceMinutes: dayCalc.balanceMinutes,
        balanceFormatted: TimeCalculationEngine.formatMinutesToHours(dayCalc.balanceMinutes, true),
        status: dayCalc.status,
        divergenceReasons: dayCalc.divergenceReasons,
        entries: dayCalc.entries,
      },
    };
  }

  /**
   * Consulta e gera o espelho de ponto completo de um determinado mês
   */
  static async getMonthlySummary(employeeId: string, year?: number, month?: number) {
    const todayStr = this.getTodayDateStr();
    const [todayY, todayM] = todayStr.split('-').map((v) => parseInt(v, 10));

    const targetYear = year || todayY;
    const targetMonth = month || todayM;
    const yearMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
      include: {
        company: { select: { id: true, tradeName: true, cnpj: true } },
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true, level: true } },
        workSchedule: true,
      },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const schedule = await WorkScheduleService.getScheduleForEmployee(employee.id);
    const rules = this.getScheduleRulesArray(schedule.scheduleRules);
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

    // Busca batidas brutas e ajustes homologados do mês de forma concorrente
    const [monthRawEntries, monthAdjustments] = await Promise.all([
      prisma.timeClockEntry.findMany({
        where: {
          OR: [
            { employeeId: employee.id },
            { registrationNumber: employee.registrationNumber },
          ],
          timestamp: {
            gte: monthStart,
            lte: new Date(monthEnd.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'asc' },
      }),
      prisma.timeClockAdjustment.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: new Date(`${targetYear}-${String(targetMonth).padStart(2, '0')}-01`),
            lte: new Date(`${targetYear}-${String(targetMonth).padStart(2, '0')}-${daysInMonth}`),
          },
          status: 'APROVADO',
        },
      }),
    ]);

    const days: DaySummaryView[] = [];
    let totalExpectedMinutes = 0;
    let totalActualMinutes = 0;
    let totalBalanceMinutes = 0;
    let totalExtraHoursMinutes = 0;
    let totalDelayMinutes = 0;
    let totalAbsenceMinutes = 0;
    let divergencesCount = 0;
    let workDaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const { start, end, dayOfWeek } = this.getDayDateRange(dateStr);

      const dayRule = rules.find((r) => r.dayOfWeek === dayOfWeek) || null;
      const isPastOrToday = dateStr <= todayStr;

      // Filtra as batidas brutas do dia
      const dayRawEntries = monthRawEntries.filter(
        (e) => e.timestamp.getTime() >= start.getTime() && e.timestamp.getTime() <= end.getTime()
      );

      // Filtra os ajustes homologados do dia
      const dayAdjustments = monthAdjustments.filter(
        (a) => a.date.toISOString().split('T')[0] === dateStr
      );

      // Aplica os ajustes sobre as batidas
      const effectiveEntries = this.applyApprovedAdjustments(
        dateStr,
        dayRawEntries.map((e) => ({
          id: e.id,
          timestamp: e.timestamp,
          source: e.source,
          hash: e.hash,
        })),
        dayAdjustments
      );

      const dayCalc = TimeCalculationEngine.calculateDay({
        dateStr,
        dayOfWeek,
        scheduleRule: dayRule,
        toleranceMinutes: schedule.toleranceMinutes,
        lunchIntervalMinutes: schedule.lunchIntervalMinutes,
        flexibleInterval: schedule.flexibleInterval,
        rawEntries: effectiveEntries,
        isPastOrToday,
      });

      if (isPastOrToday) {
        prisma.timeDailySummary
          .upsert({
            where: {
              employeeId_date: {
                employeeId: employee.id,
                date: new Date(dateStr),
              },
            },
            create: {
              employeeId: employee.id,
              date: new Date(dateStr),
              expectedWorkMinutes: dayCalc.expectedWorkMinutes,
              actualWorkMinutes: dayCalc.actualWorkMinutes,
              balanceMinutes: dayCalc.balanceMinutes,
              extraHoursMinutes: dayCalc.extraHoursMinutes,
              delayMinutes: dayCalc.delayMinutes,
              absenceMinutes: dayCalc.absenceMinutes,
              entries: dayCalc.entries as any,
              status: dayCalc.status,
              divergenceReasons: dayCalc.divergenceReasons as any,
            },
            update: {
              expectedWorkMinutes: dayCalc.expectedWorkMinutes,
              actualWorkMinutes: dayCalc.actualWorkMinutes,
              balanceMinutes: dayCalc.balanceMinutes,
              extraHoursMinutes: dayCalc.extraHoursMinutes,
              delayMinutes: dayCalc.delayMinutes,
              absenceMinutes: dayCalc.absenceMinutes,
              entries: dayCalc.entries as any,
              status: dayCalc.status,
              divergenceReasons: dayCalc.divergenceReasons as any,
              recalculatedAt: new Date(),
            },
          })
          .catch((err) => console.error('Erro ao atualizar apuração diária:', err));
      }

      const e1 = dayCalc.entries[0]?.time || '---';
      const s1 = dayCalc.entries[1]?.time || '---';
      const e2 = dayCalc.entries[2]?.time || '---';
      const s2 = dayCalc.entries[3]?.time || '---';
      const extraEntries = dayCalc.entries.slice(4).map((e) => e.time);

      if (dayCalc.status === 'DIVERGENCIA') {
        divergencesCount++;
      }
      if (dayCalc.expectedWorkMinutes > 0) {
        workDaysCount++;
      }

      totalExpectedMinutes += dayCalc.expectedWorkMinutes;
      totalActualMinutes += dayCalc.actualWorkMinutes;
      totalBalanceMinutes += dayCalc.balanceMinutes;
      totalExtraHoursMinutes += dayCalc.extraHoursMinutes;
      totalDelayMinutes += dayCalc.delayMinutes;
      totalAbsenceMinutes += dayCalc.absenceMinutes;

      days.push({
        date: dateStr,
        dayOfWeek,
        dayOfWeekName: DAY_NAMES[dayOfWeek],
        e1,
        s1,
        e2,
        s2,
        extraEntries,
        expectedWorkMinutes: dayCalc.expectedWorkMinutes,
        expectedWorkFormatted: TimeCalculationEngine.formatMinutesToHours(dayCalc.expectedWorkMinutes),
        actualWorkMinutes: dayCalc.actualWorkMinutes,
        actualWorkFormatted: TimeCalculationEngine.formatMinutesToHours(dayCalc.actualWorkMinutes),
        balanceMinutes: dayCalc.balanceMinutes,
        balanceFormatted: TimeCalculationEngine.formatMinutesToHours(dayCalc.balanceMinutes, true),
        status: dayCalc.status,
        divergenceReasons: dayCalc.divergenceReasons,
        entries: dayCalc.entries,
      });
    }

    await TimeBalanceService.consolidateMonth(employee.id, yearMonth);
    const balanceInfo = await TimeBalanceService.getBalance(employee.id);

    const monthStatement = balanceInfo.statement.find((s) => s.yearMonth === yearMonth);
    const startingBalanceMinutes = monthStatement ? monthStatement.startingBalanceMinutes : 0;
    const closingBalanceMinutes = monthStatement ? monthStatement.closingBalanceMinutes : totalBalanceMinutes;

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        registrationNumber: employee.registrationNumber,
        cpf: employee.cpf,
        admissionDate: employee.admissionDate,
        company: employee.company,
        department: employee.department?.name || 'Não informado',
        position: employee.position ? `${employee.position.title} (${employee.position.level})` : 'Não informado',
        scheduleName: schedule.name,
      },
      period: {
        year: targetYear,
        month: targetMonth,
        yearMonth,
        monthName: MONTH_NAMES[targetMonth - 1],
        daysInMonth,
      },
      summary: {
        totalExpectedMinutes,
        totalExpectedFormatted: TimeCalculationEngine.formatMinutesToHours(totalExpectedMinutes),
        totalActualMinutes,
        totalActualFormatted: TimeCalculationEngine.formatMinutesToHours(totalActualMinutes),
        totalBalanceMinutes,
        totalBalanceFormatted: TimeCalculationEngine.formatMinutesToHours(totalBalanceMinutes, true),
        totalExtraHoursMinutes,
        totalExtraFormatted: TimeCalculationEngine.formatMinutesToHours(totalExtraHoursMinutes, true),
        totalDelayMinutes,
        totalDelayFormatted: TimeCalculationEngine.formatMinutesToHours(-totalDelayMinutes, true),
        totalAbsenceMinutes,
        totalAbsenceFormatted: TimeCalculationEngine.formatMinutesToHours(-totalAbsenceMinutes, true),
        divergencesCount,
        workDaysCount,
      },
      bankBalance: {
        startingBalanceMinutes,
        startingBalanceFormatted: TimeCalculationEngine.formatMinutesToHours(startingBalanceMinutes, true),
        monthBalanceMinutes: totalBalanceMinutes,
        monthBalanceFormatted: TimeCalculationEngine.formatMinutesToHours(totalBalanceMinutes, true),
        accumulatedClosingMinutes: closingBalanceMinutes,
        accumulatedClosingFormatted: TimeCalculationEngine.formatMinutesToHours(closingBalanceMinutes, true),
      },
      days,
    };
  }

  /**
   * Força o recálculo/reprocessamento da apuração para colaboradores e períodos
   */
  static async recalculatePeriod(params: {
    employeeId?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
    yearMonth?: string;
  }) {
    const todayStr = this.getTodayDateStr();

    let start = params.startDate;
    let end = params.endDate;

    if (params.yearMonth) {
      const [yStr, mStr] = params.yearMonth.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      start = `${y}-${String(m).padStart(2, '0')}-01`;
      end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!start || !end) {
      const [todayY, todayM] = todayStr.split('-').map((v) => parseInt(v, 10));
      const lastDay = new Date(todayY, todayM, 0).getDate();
      start = `${todayY}-${String(todayM).padStart(2, '0')}-01`;
      end = `${todayY}-${String(todayM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    const whereEmployee: any = { deletedAt: null };
    if (params.employeeId) whereEmployee.id = params.employeeId;
    if (params.companyId) whereEmployee.companyId = params.companyId;

    const employees = await prisma.employee.findMany({
      where: whereEmployee,
      select: { id: true, name: true, registrationNumber: true },
    });

    let totalDaysProcessed = 0;

    for (const emp of employees) {
      const schedule = await WorkScheduleService.getScheduleForEmployee(emp.id);
      const rules = this.getScheduleRulesArray(schedule.scheduleRules);

      const currDate = new Date(start);
      const lastDate = new Date(end);

      while (currDate <= lastDate) {
        const dateStr = currDate.toISOString().split('T')[0];
        const { start: dayStart, end: dayEnd, dayOfWeek } = this.getDayDateRange(dateStr);
        const dayRule = rules.find((r) => r.dayOfWeek === dayOfWeek) || null;
        const isPastOrToday = dateStr <= todayStr;

        const [dayRawEntries, dayAdjustments] = await Promise.all([
          prisma.timeClockEntry.findMany({
            where: {
              OR: [{ employeeId: emp.id }, { registrationNumber: emp.registrationNumber }],
              timestamp: { gte: dayStart, lte: dayEnd },
            },
            orderBy: { timestamp: 'asc' },
          }),
          prisma.timeClockAdjustment.findMany({
            where: {
              employeeId: emp.id,
              date: new Date(dateStr),
              status: 'APROVADO',
            },
          }),
        ]);

        const effectiveEntries = this.applyApprovedAdjustments(
          dateStr,
          dayRawEntries.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            source: e.source,
            hash: e.hash,
          })),
          dayAdjustments
        );

        const dayCalc = TimeCalculationEngine.calculateDay({
          dateStr,
          dayOfWeek,
          scheduleRule: dayRule,
          toleranceMinutes: schedule.toleranceMinutes,
          lunchIntervalMinutes: schedule.lunchIntervalMinutes,
          flexibleInterval: schedule.flexibleInterval,
          rawEntries: effectiveEntries,
          isPastOrToday,
        });

        await prisma.timeDailySummary.upsert({
          where: {
            employeeId_date: {
              employeeId: emp.id,
              date: new Date(dateStr),
            },
          },
          create: {
            employeeId: emp.id,
            date: new Date(dateStr),
            expectedWorkMinutes: dayCalc.expectedWorkMinutes,
            actualWorkMinutes: dayCalc.actualWorkMinutes,
            balanceMinutes: dayCalc.balanceMinutes,
            extraHoursMinutes: dayCalc.extraHoursMinutes,
            delayMinutes: dayCalc.delayMinutes,
            absenceMinutes: dayCalc.absenceMinutes,
            entries: dayCalc.entries as any,
            status: dayCalc.status,
            divergenceReasons: dayCalc.divergenceReasons as any,
          },
          update: {
            expectedWorkMinutes: dayCalc.expectedWorkMinutes,
            actualWorkMinutes: dayCalc.actualWorkMinutes,
            balanceMinutes: dayCalc.balanceMinutes,
            extraHoursMinutes: dayCalc.extraHoursMinutes,
            delayMinutes: dayCalc.delayMinutes,
            absenceMinutes: dayCalc.absenceMinutes,
            entries: dayCalc.entries as any,
            status: dayCalc.status,
            divergenceReasons: dayCalc.divergenceReasons as any,
            recalculatedAt: new Date(),
          },
        });

        totalDaysProcessed++;
        currDate.setDate(currDate.getDate() + 1);
      }

      const startYearMonth = start.substring(0, 7);
      await TimeBalanceService.consolidateMonth(emp.id, startYearMonth);
    }

    return {
      success: true,
      message: `Reprocessamento concluído: ${employees.length} colaborador(es) e ${totalDaysProcessed} diária(s) apurada(s).`,
      employeesCount: employees.length,
      daysProcessed: totalDaysProcessed,
    };
  }
}
