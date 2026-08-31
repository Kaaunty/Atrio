import { TimeDailySummaryStatus } from '@prisma/client';
import { ScheduleRuleDay } from '../time-clock.dto.js';

export interface ProcessedEntryItem {
  id: string;
  time: string; // HH:mm
  fullTimestamp: string; // ISO
  source: string;
  isAdjusted?: boolean;
  hash?: string;
}

export interface DayCalculationInput {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 (Domingo) a 6 (Sábado)
  scheduleRule?: ScheduleRuleDay | null;
  toleranceMinutes?: number;
  lunchIntervalMinutes?: number;
  flexibleInterval?: boolean;
  rawEntries: {
    id: string;
    timestamp: Date | string;
    source: string;
    hash?: string;
    isAdjusted?: boolean;
  }[];
  isPastOrToday: boolean;
  isHoliday?: boolean;
  holidayName?: string;
}

export interface DayCalculationResult {
  date: string;
  expectedWorkMinutes: number;
  actualWorkMinutes: number;
  balanceMinutes: number;
  extraHoursMinutes: number;
  delayMinutes: number;
  absenceMinutes: number;
  status: TimeDailySummaryStatus;
  divergenceReasons: string[];
  entries: ProcessedEntryItem[];
}

export class TimeCalculationEngine {
  /**
   * Converte minutos em formato legível de horas e minutos (ex: "+01h 30m" ou "-00h 45m" ou "08h 00m")
   */
  static formatMinutesToHours(minutes: number, withSign: boolean = false): string {
    const isNegative = minutes < 0;
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const padH = String(hours).padStart(2, '0');
    const padM = String(mins).padStart(2, '0');

    if (withSign) {
      if (minutes > 0) return `+${padH}h ${padM}m`;
      if (minutes < 0) return `-${padH}h ${padM}m`;
      return `00h 00m`;
    }

    return `${padH}h ${padM}m`;
  }

  /**
   * Converte minutos em formato "HH:MM" (ex: "+01:30" ou "-00:45" ou "08:00")
   */
  static formatMinutesToTime(minutes: number, withSign: boolean = false): string {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;
    const padH = String(hours).padStart(2, '0');
    const padM = String(mins).padStart(2, '0');

    if (withSign) {
      if (minutes > 0) return `+${padH}:${padM}`;
      if (minutes < 0) return `-${padH}:${padM}`;
      return `00:00`;
    }

    return `${padH}:${padM}`;
  }

  /**
   * Extrai o horário no formato HH:mm de uma data ou timestamp ISO considerando fuso horário
   */
  static formatTimeToHHMM(timestamp: Date | string): string {
    const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    // Extrai no fuso de Brasília (America/Sao_Paulo)
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return formatter.format(d);
  }

  /**
   * Converte uma string HH:MM em minutos desde 00:00
   */
  static timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    return (h || 0) * 60 + (m || 0);
  }

  /**
   * Motor de Apuração Diária de Jornada e Ponto CLT
   */
  static calculateDay(input: DayCalculationInput): DayCalculationResult {
    const {
      dateStr,
      scheduleRule,
      toleranceMinutes = 10,
      lunchIntervalMinutes = 60,
      flexibleInterval = true,
      rawEntries,
      isPastOrToday,
      isHoliday = false,
      holidayName,
    } = input;

    const divergenceReasons: string[] = [];

    // 1. Tratamento e ordenação cronológica das batidas do dia
    const sortedRaw = [...rawEntries].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    const entries: ProcessedEntryItem[] = sortedRaw.map((e) => ({
      id: e.id,
      time: this.formatTimeToHHMM(e.timestamp),
      fullTimestamp: new Date(e.timestamp).toISOString(),
      source: e.source,
      isAdjusted: e.isAdjusted || false,
      hash: e.hash,
    }));

    // 2. Determinação de previsão da jornada
    const isWorkDay = scheduleRule ? scheduleRule.isWorkDay : (input.dayOfWeek >= 1 && input.dayOfWeek <= 5);
    const expectedWorkMinutes = isHoliday
      ? 0
      : scheduleRule
      ? scheduleRule.expectedWorkMinutes
      : isWorkDay
      ? 480 // 8 horas padrão caso não haja escala configurada
      : 0;

    // 3. Caso especial: Feriado
    if (isHoliday) {
      if (entries.length === 0) {
        return {
          date: dateStr,
          expectedWorkMinutes: 0,
          actualWorkMinutes: 0,
          balanceMinutes: 0,
          extraHoursMinutes: 0,
          delayMinutes: 0,
          absenceMinutes: 0,
          status: 'FERIADO',
          divergenceReasons: holidayName ? [`Feriado: ${holidayName}`] : ['Feriado'],
          entries,
        };
      }
    }

    // 4. Caso especial: Dia de folga (Fim de semana ou escala livre)
    if (!isWorkDay) {
      if (entries.length === 0) {
        return {
          date: dateStr,
          expectedWorkMinutes: 0,
          actualWorkMinutes: 0,
          balanceMinutes: 0,
          extraHoursMinutes: 0,
          delayMinutes: 0,
          absenceMinutes: 0,
          status: 'FOLGA',
          divergenceReasons: [],
          entries: [],
        };
      }
    }

    // 5. Caso especial: Falta integral (Dia de trabalho, 0 batidas, data hoje ou passada)
    if (isWorkDay && entries.length === 0) {
      if (isPastOrToday) {
        divergenceReasons.push('Falta integral no dia trabalhado previsto');
        return {
          date: dateStr,
          expectedWorkMinutes,
          actualWorkMinutes: 0,
          balanceMinutes: -expectedWorkMinutes,
          extraHoursMinutes: 0,
          delayMinutes: 0,
          absenceMinutes: expectedWorkMinutes,
          status: 'FALTA',
          divergenceReasons,
          entries: [],
        };
      }

      // Dia futuro sem batidas ainda
      return {
        date: dateStr,
        expectedWorkMinutes,
        actualWorkMinutes: 0,
        balanceMinutes: 0,
        extraHoursMinutes: 0,
        delayMinutes: 0,
        absenceMinutes: 0,
        status: 'OK',
        divergenceReasons: [],
        entries: [],
      };
    }

    // 6. Cálculo dos pares de batidas (E1-S1, E2-S2, etc.)
    let actualWorkMinutes = 0;
    const numEntries = sortedRaw.length;

    for (let i = 0; i < numEntries - 1; i += 2) {
      const entryTime = new Date(sortedRaw[i].timestamp).getTime();
      const exitTime = new Date(sortedRaw[i + 1].timestamp).getTime();
      const durationMs = exitTime - entryTime;
      const durationMinutes = Math.max(0, Math.round(durationMs / 60000));
      actualWorkMinutes += durationMinutes;
    }

    // Verificação de batida ímpar (saída não registrada)
    const isOddEntries = numEntries % 2 !== 0;
    if (isOddEntries) {
      divergenceReasons.push('Batida ímpar registrada (marcação de saída ausente ou pendente)');
    }

    // Verificação de intervalo de almoço (quando há 4 ou mais batidas)
    if (numEntries >= 4) {
      const lunchOutTime = new Date(sortedRaw[1].timestamp).getTime();
      const lunchReturnTime = new Date(sortedRaw[2].timestamp).getTime();
      const intervalMinutes = Math.round((lunchReturnTime - lunchOutTime) / 60000);

      if (intervalMinutes < 15 && expectedWorkMinutes > 360) {
        divergenceReasons.push(`Intervalo intrajornada muito curto (${intervalMinutes} min)`);
      } else if (!flexibleInterval && intervalMinutes < lunchIntervalMinutes) {
        divergenceReasons.push(
          `Intervalo de refeição de ${intervalMinutes} min inferior ao mínimo previsto de ${lunchIntervalMinutes} min`
        );
      }
    }

    // 7. Aplicação da tolerância legal da CLT (Artigo 58, § 1º)
    const rawDiff = actualWorkMinutes - expectedWorkMinutes;
    let balanceMinutes = 0;
    let extraHoursMinutes = 0;
    let delayMinutes = 0;

    if (!isWorkDay) {
      // Em dias de folga, todo o tempo trabalhado é crédito/hora extra
      balanceMinutes = actualWorkMinutes;
      extraHoursMinutes = actualWorkMinutes;
    } else {
      if (Math.abs(rawDiff) <= toleranceMinutes) {
        // Dentro da tolerância CLT diária: saldo zero
        balanceMinutes = 0;
        extraHoursMinutes = 0;
        delayMinutes = 0;
      } else if (rawDiff > toleranceMinutes) {
        // Ultrapassou a tolerância em horas extras: computa o total excedente
        balanceMinutes = rawDiff;
        extraHoursMinutes = rawDiff;
        delayMinutes = 0;
      } else {
        // Ultrapassou a tolerância em atraso: computa o total de débito
        balanceMinutes = rawDiff;
        extraHoursMinutes = 0;
        delayMinutes = Math.abs(rawDiff);
      }
    }

    // 8. Determinação do Status Diário
    let status: TimeDailySummaryStatus = 'OK';
    if (isOddEntries || divergenceReasons.length > 0) {
      status = 'DIVERGENCIA';
    } else if (!isWorkDay) {
      status = 'FOLGA';
    }

    return {
      date: dateStr,
      expectedWorkMinutes,
      actualWorkMinutes,
      balanceMinutes,
      extraHoursMinutes,
      delayMinutes,
      absenceMinutes: 0,
      status,
      divergenceReasons,
      entries,
    };
  }
}
