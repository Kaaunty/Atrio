import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../../../database/prisma.js';
import { WorkScheduleService } from '../services/work-schedule.service.js';
import { TimeSummaryService } from '../services/time-summary.service.js';
import { TimeBalanceService } from '../services/time-balance.service.js';

describe('Time Clock & Bank of Hours Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let testScheduleId: string;
  let gestorId: string;
  let lideradoId: string;

  before(async () => {
    // 1. Cria empresa e setor
    const company = await prisma.company.create({
      data: {
        legalName: 'Ponto Eletronico Testes S/A',
        tradeName: 'Ponto Testes',
        cnpj: '11.222.333/0001-44',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Operações e Ponto',
        code: 'OP-01',
      },
    });
    testDeptId = dept.id;

    // 2. Cria Escala 40h (8h de Seg a Sex com 1h de almoço)
    const schedule = await WorkScheduleService.create({
      name: 'Comercial 40h - 08:00 às 17:00',
      description: 'Jornada semanal de 40 horas (8h diárias de Seg a Sex)',
      weeklyHours: 40,
      toleranceMinutes: 10,
      lunchIntervalMinutes: 60,
      flexibleInterval: true,
      scheduleRules: [
        { dayOfWeek: 0, isWorkDay: false, expectedWorkMinutes: 0, intervals: [] },
        {
          dayOfWeek: 1,
          isWorkDay: true,
          expectedWorkMinutes: 480,
          intervals: [
            { start: '08:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ],
        },
        {
          dayOfWeek: 2,
          isWorkDay: true,
          expectedWorkMinutes: 480,
          intervals: [
            { start: '08:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ],
        },
        {
          dayOfWeek: 3,
          isWorkDay: true,
          expectedWorkMinutes: 480,
          intervals: [
            { start: '08:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ],
        },
        {
          dayOfWeek: 4,
          isWorkDay: true,
          expectedWorkMinutes: 480,
          intervals: [
            { start: '08:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ],
        },
        {
          dayOfWeek: 5,
          isWorkDay: true,
          expectedWorkMinutes: 480,
          intervals: [
            { start: '08:00', end: '12:00' },
            { start: '13:00', end: '17:00' },
          ],
        },
        { dayOfWeek: 6, isWorkDay: false, expectedWorkMinutes: 0, intervals: [] },
      ],
    });
    testScheduleId = schedule.id;

    // 3. Cadastra Gestor
    const gestor = await prisma.employee.create({
      data: {
        name: 'Gestora Maria Silva',
        cpf: '11122233344',
        email: 'maria.gestora@pontoteste.com',
        registrationNumber: 'MAT-PONTO-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        workScheduleId: testScheduleId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    gestorId = gestor.id;

    // 4. Cadastra Liderado
    const liderado = await prisma.employee.create({
      data: {
        name: 'Colaborador Lucas Santos',
        cpf: '55566677788',
        email: 'lucas.santos@pontoteste.com',
        registrationNumber: 'MAT-PONTO-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        managerId: gestorId,
        workScheduleId: testScheduleId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    lideradoId = liderado.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.timeClockEntry.deleteMany({
        where: { employeeId: { in: [gestorId, lideradoId] } },
      });
      await prisma.timeDailySummary.deleteMany({
        where: { employeeId: { in: [gestorId, lideradoId] } },
      });
      await prisma.timeBalance.deleteMany({
        where: { employeeId: { in: [gestorId, lideradoId] } },
      });
      await prisma.employee.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prisma.department.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prisma.company.delete({
        where: { id: testCompanyId },
      });
      if (testScheduleId) {
        await prisma.workSchedule.delete({
          where: { id: testScheduleId },
        });
      }
    }
  });

  it('deve registrar batidas de ponto, apurar o dia e gerar espelho de ponto com saldo e banco de horas', async () => {
    // 1. Simula batidas de um dia trabalhado com hora extra (08:00 às 12:00 e 13:00 às 17:30 = 8h30m = 510 min -> +30 min saldo)
    // Usando uma data específica de segunda-feira: 2026-08-03
    const timestamps = [
      '2026-08-03T11:00:00Z', // 08:00 BRT (UTC-3)
      '2026-08-03T15:00:00Z', // 12:00 BRT
      '2026-08-03T16:00:00Z', // 13:00 BRT
      '2026-08-03T20:30:00Z', // 17:30 BRT
    ];

    for (const ts of timestamps) {
      await prisma.timeClockEntry.create({
        data: {
          employeeId: lideradoId,
          registrationNumber: 'MAT-PONTO-002',
          timestamp: new Date(ts),
          hash: crypto.randomBytes(16).toString('hex'),
          source: 'CONTROL_ID_API',
        },
      });
    }

    // 2. Consulta o espelho de ponto do mês 08/2026
    const monthlySummary = await TimeSummaryService.getMonthlySummary(lideradoId, 2026, 8);

    assert.ok(monthlySummary.employee);
    assert.equal(monthlySummary.employee.id, lideradoId);
    assert.equal(monthlySummary.period.year, 2026);
    assert.equal(monthlySummary.period.month, 8);
    assert.equal(monthlySummary.period.daysInMonth, 31);

    // Encontra o dia 03/08
    const day03 = monthlySummary.days.find((d) => d.date === '2026-08-03');
    assert.ok(day03);
    assert.equal(day03.actualWorkMinutes, 510);
    assert.equal(day03.expectedWorkMinutes, 480);
    assert.equal(day03.balanceMinutes, 30);
    assert.equal(day03.status, 'OK');
    assert.equal(day03.e1, '08:00');
    assert.equal(day03.s1, '12:00');
    assert.equal(day03.e2, '13:00');
    assert.equal(day03.s2, '17:30');

    // 3. Verifica consolidação do banco de horas
    const balance = await TimeBalanceService.getBalance(lideradoId);
    assert.ok(typeof balance.accumulatedBalanceMinutes === 'number');
    assert.ok(balance.statement.length > 0);

    // 4. Testa aplicação de ajuste manual no banco de horas
    const adjusted = await TimeBalanceService.addManualAdjustment(
      lideradoId,
      '2026-08',
      60, // +1 hora de crédito manual
      'Compensação de plantão de suporte autorizado'
    );
    assert.ok(adjusted);
    assert.equal(adjusted.manualAdjustmentsMinutes, 60);

    // 5. Testa recálculo de período
    const recalcResult = await TimeSummaryService.recalculatePeriod({
      employeeId: lideradoId,
      yearMonth: '2026-08',
    });
    assert.ok(recalcResult.success);
    assert.equal(recalcResult.employeesCount, 1);
    assert.equal(recalcResult.daysProcessed, 31);
  });
});
