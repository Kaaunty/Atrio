import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TimeCalculationEngine } from '../services/time-calculation.engine.js';

describe('TimeCalculationEngine (CLT & Apuração Diária)', () => {
  it('deve calcular corretamente um dia normal com 4 batidas (8h cravadas)', () => {
    const res = TimeCalculationEngine.calculateDay({
      dateStr: '2026-08-28',
      dayOfWeek: 5, // Sexta-feira
      scheduleRule: {
        dayOfWeek: 5,
        isWorkDay: true,
        expectedWorkMinutes: 480, // 8h
        intervals: [
          { start: '08:00', end: '12:00' },
          { start: '13:00', end: '17:00' },
        ],
      },
      toleranceMinutes: 10,
      rawEntries: [
        { id: '1', timestamp: '2026-08-28T08:00:00-03:00', source: 'CONTROL_ID' },
        { id: '2', timestamp: '2026-08-28T12:00:00-03:00', source: 'CONTROL_ID' },
        { id: '3', timestamp: '2026-08-28T13:00:00-03:00', source: 'CONTROL_ID' },
        { id: '4', timestamp: '2026-08-28T17:00:00-03:00', source: 'CONTROL_ID' },
      ],
      isPastOrToday: true,
    });

    assert.equal(res.expectedWorkMinutes, 480);
    assert.equal(res.actualWorkMinutes, 480);
    assert.equal(res.balanceMinutes, 0);
    assert.equal(res.extraHoursMinutes, 0);
    assert.equal(res.delayMinutes, 0);
    assert.equal(res.status, 'OK');
    assert.equal(res.entries.length, 4);
    assert.equal(res.divergenceReasons.length, 0);
  });

  it('deve aplicar tolerância legal CLT (Art. 58 CLT) quando a variação diária for de até 10 minutos', () => {
    // Trabalhou 488 minutos (+8 min, dentro da tolerância de 10 min) -> Saldo = 0
    const res = TimeCalculationEngine.calculateDay({
      dateStr: '2026-08-28',
      dayOfWeek: 5,
      scheduleRule: {
        dayOfWeek: 5,
        isWorkDay: true,
        expectedWorkMinutes: 480,
        intervals: [],
      },
      toleranceMinutes: 10,
      rawEntries: [
        { id: '1', timestamp: '2026-08-28T07:56:00-03:00', source: 'CONTROL_ID' }, // +4 min cedo
        { id: '2', timestamp: '2026-08-28T12:00:00-03:00', source: 'CONTROL_ID' },
        { id: '3', timestamp: '2026-08-28T13:00:00-03:00', source: 'CONTROL_ID' },
        { id: '4', timestamp: '2026-08-28T17:04:00-03:00', source: 'CONTROL_ID' }, // +4 min tarde -> Total +8 min
      ],
      isPastOrToday: true,
    });

    assert.equal(res.actualWorkMinutes, 488);
    assert.equal(res.balanceMinutes, 0); // Tolerado: não gera hora extra
    assert.equal(res.extraHoursMinutes, 0);
    assert.equal(res.status, 'OK');
  });

  it('deve computar a totalidade dos minutos excedentes quando ultrapassar a tolerância CLT', () => {
    // Trabalhou 495 minutos (+15 min, ultrapassa 10 min de tolerância) -> Saldo = +15 min
    const res = TimeCalculationEngine.calculateDay({
      dateStr: '2026-08-28',
      dayOfWeek: 5,
      scheduleRule: {
        dayOfWeek: 5,
        isWorkDay: true,
        expectedWorkMinutes: 480,
        intervals: [],
      },
      toleranceMinutes: 10,
      rawEntries: [
        { id: '1', timestamp: '2026-08-28T08:00:00-03:00', source: 'CONTROL_ID' },
        { id: '2', timestamp: '2026-08-28T12:00:00-03:00', source: 'CONTROL_ID' },
        { id: '3', timestamp: '2026-08-28T13:00:00-03:00', source: 'CONTROL_ID' },
        { id: '4', timestamp: '2026-08-28T17:15:00-03:00', source: 'CONTROL_ID' },
      ],
      isPastOrToday: true,
    });

    assert.equal(res.actualWorkMinutes, 495);
    assert.equal(res.balanceMinutes, 15);
    assert.equal(res.extraHoursMinutes, 15);
    assert.equal(res.delayMinutes, 0);
  });

  it('deve identificar batida ímpar e registrar divergência', () => {
    // Apenas 3 batidas (esqueceu a saída final)
    const res = TimeCalculationEngine.calculateDay({
      dateStr: '2026-08-28',
      dayOfWeek: 5,
      scheduleRule: {
        dayOfWeek: 5,
        isWorkDay: true,
        expectedWorkMinutes: 480,
        intervals: [],
      },
      toleranceMinutes: 10,
      rawEntries: [
        { id: '1', timestamp: '2026-08-28T08:00:00-03:00', source: 'CONTROL_ID' },
        { id: '2', timestamp: '2026-08-28T12:00:00-03:00', source: 'CONTROL_ID' },
        { id: '3', timestamp: '2026-08-28T13:00:00-03:00', source: 'CONTROL_ID' },
      ],
      isPastOrToday: true,
    });

    assert.equal(res.actualWorkMinutes, 240); // 4 horas do primeiro turno
    assert.equal(res.status, 'DIVERGENCIA');
    assert.ok(res.divergenceReasons.some((r) => r.includes('ímpar') || r.includes('saída')));
  });

  it('deve calcular falta integral em dia de trabalho decorrido sem batidas', () => {
    const res = TimeCalculationEngine.calculateDay({
      dateStr: '2026-08-28',
      dayOfWeek: 5,
      scheduleRule: {
        dayOfWeek: 5,
        isWorkDay: true,
        expectedWorkMinutes: 528, // 8h48m
        intervals: [],
      },
      rawEntries: [],
      isPastOrToday: true,
    });

    assert.equal(res.expectedWorkMinutes, 528);
    assert.equal(res.actualWorkMinutes, 0);
    assert.equal(res.absenceMinutes, 528);
    assert.equal(res.balanceMinutes, -528);
    assert.equal(res.status, 'FALTA');
  });

  it('deve identificar dia de folga / fim de semana sem gerar débitos', () => {
    const res = TimeCalculationEngine.calculateDay({
      dateStr: '2026-08-30',
      dayOfWeek: 0, // Domingo
      scheduleRule: {
        dayOfWeek: 0,
        isWorkDay: false,
        expectedWorkMinutes: 0,
        intervals: [],
      },
      rawEntries: [],
      isPastOrToday: true,
    });

    assert.equal(res.expectedWorkMinutes, 0);
    assert.equal(res.actualWorkMinutes, 0);
    assert.equal(res.balanceMinutes, 0);
    assert.equal(res.status, 'FOLGA');
  });

  it('deve formatar minutos em formatos amigáveis com e sem sinal', () => {
    assert.equal(TimeCalculationEngine.formatMinutesToHours(125), '02h 05m');
    assert.equal(TimeCalculationEngine.formatMinutesToHours(125, true), '+02h 05m');
    assert.equal(TimeCalculationEngine.formatMinutesToHours(-45, true), '-00h 45m');
    assert.equal(TimeCalculationEngine.formatMinutesToHours(0, true), '00h 00m');
    assert.equal(TimeCalculationEngine.formatMinutesToTime(125, true), '+02:05');
    assert.equal(TimeCalculationEngine.formatMinutesToTime(-45, true), '-00:45');
  });
});
