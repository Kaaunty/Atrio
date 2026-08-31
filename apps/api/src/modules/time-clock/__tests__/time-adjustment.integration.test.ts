import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../../../database/prisma.js';
import { WorkScheduleService } from '../services/work-schedule.service.js';
import { TimeAdjustmentService } from '../services/time-adjustment.service.js';
import { TimeSummaryService } from '../services/time-summary.service.js';

describe('Time Clock Adjustment Workflow Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let testScheduleId: string;
  let gestorId: string;
  let lideradoId: string;
  let rhUserId: string;

  before(async () => {
    // 1. Cria empresa e setor
    const company = await prisma.company.create({
      data: {
        legalName: 'Ajuste Ponto Testes S/A',
        tradeName: 'Ajuste Testes',
        cnpj: '77.888.999/0001-11',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Operações e Logística',
        code: 'LOG-01',
      },
    });
    testDeptId = dept.id;

    // 2. Cria Escala 40h (8h de Seg a Sex)
    const schedule = await WorkScheduleService.create({
      name: 'Comercial 40h Teste Ajuste',
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
        name: 'Gestor Fernando Silva',
        cpf: '77788899900',
        email: 'fernando.gestor@ajusteteste.com',
        registrationNumber: 'MAT-AJUSTE-001',
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
        name: 'Colaboradora Juliana Lima',
        cpf: '33344455566',
        email: 'juliana.lima@ajusteteste.com',
        registrationNumber: 'MAT-AJUSTE-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        managerId: gestorId,
        workScheduleId: testScheduleId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    lideradoId = liderado.id;

    // 5. Cadastra Usuário de RH
    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.avaliador@ajusteteste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.timeClockAdjustment.deleteMany({
        where: { employeeId: { in: [gestorId, lideradoId] } },
      });
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
      if (rhUserId) {
        await prisma.user.delete({
          where: { id: rhUserId },
        });
      }
    }
  });

  it('deve executar o fluxo completo de solicitação, aprovação de gestor, homologação de RH e recálculo do espelho', async () => {
    // 1. Simula um dia (segunda-feira 2026-08-10) com apenas 3 batidas (saída 2 ausente -> DIVERGÊNCIA)
    const timestamps = [
      '2026-08-10T11:00:00Z', // 08:00 BRT
      '2026-08-10T15:00:00Z', // 12:00 BRT
      '2026-08-10T16:00:00Z', // 13:00 BRT
    ];

    for (const ts of timestamps) {
      await prisma.timeClockEntry.create({
        data: {
          employeeId: lideradoId,
          registrationNumber: 'MAT-AJUSTE-002',
          timestamp: new Date(ts),
          hash: crypto.randomBytes(16).toString('hex'),
          source: 'CONTROL_ID_API',
        },
      });
    }

    // Consulta espelho antes do ajuste: o dia 10/08 deve estar com status DIVERGENCIA
    const monthlyBefore = await TimeSummaryService.getMonthlySummary(lideradoId, 2026, 8);
    const day10Before = monthlyBefore.days.find((d) => d.date === '2026-08-10');
    assert.ok(day10Before);
    assert.equal(day10Before.status, 'DIVERGENCIA');
    assert.equal(day10Before.s2, '---');

    // 2. Colaboradora cria solicitação de ajuste para incluir a saída das 17:00
    const adjustment = await TimeAdjustmentService.create(lideradoId, {
      date: '2026-08-10',
      adjustmentType: 'INCLUSAO',
      targetTime: '17:00',
      reason: 'Esquecimento de crachá na saída',
      notes: 'Trabalhei regularmente até às 17h.',
    });

    assert.ok(adjustment.id);
    assert.equal(adjustment.status, 'PENDENTE_GESTOR');

    // 3. Gestor lista pendências da equipe e vê a solicitação
    const teamPending = await TimeAdjustmentService.listTeam(gestorId, {
      status: 'PENDENTE_GESTOR',
    });
    assert.equal(teamPending.items.length, 1);
    assert.equal(teamPending.items[0].id, adjustment.id);

    // 4. Gestor aprova a solicitação
    const gestorApproved = await TimeAdjustmentService.managerApprove(adjustment.id, gestorId, {
      notes: 'Atesto que a colaboradora estava presente no escritório até as 17h.',
    });
    assert.equal(gestorApproved.status, 'PENDENTE_RH');
    assert.equal(gestorApproved.managerId, gestorId);

    // 5. RH lista pendências de homologação
    const rhPending = await TimeAdjustmentService.listRh({
      status: 'PENDENTE_RH',
    });
    assert.ok(rhPending.items.some((i) => i.id === adjustment.id));

    // 6. RH homologa a solicitação (deve disparar recálculo automático do espelho)
    const rhHomologated = await TimeAdjustmentService.rhApprove(adjustment.id, rhUserId, {
      notes: 'Homologado conforme parecer do gestor.',
    });
    assert.equal(rhHomologated.status, 'APROVADO');
    assert.equal(rhHomologated.rhUserId, rhUserId);

    // 7. Consulta espelho após homologação: o dia 10/08 deve estar com status OK e 4 batidas (8h realizadas)
    const monthlyAfter = await TimeSummaryService.getMonthlySummary(lideradoId, 2026, 8);
    const day10After = monthlyAfter.days.find((d) => d.date === '2026-08-10');
    assert.ok(day10After);
    assert.equal(day10After.status, 'OK');
    assert.equal(day10After.actualWorkMinutes, 480);
    assert.equal(day10After.balanceMinutes, 0);
    assert.equal(day10After.s2, '17:00');
    assert.ok(day10After.entries.some((e) => e.isAdjusted === true));
  });

  it('deve permitir cancelamento de solicitação pelo colaborador enquanto pendente com o gestor', async () => {
    const adj = await TimeAdjustmentService.create(lideradoId, {
      date: '2026-08-11',
      adjustmentType: 'INCLUSAO',
      targetTime: '08:00',
      reason: 'Solicitação de teste para cancelamento',
    });
    assert.equal(adj.status, 'PENDENTE_GESTOR');

    const cancelled = await TimeAdjustmentService.cancel(adj.id, lideradoId);
    assert.equal(cancelled.status, 'CANCELADO');
  });

  it('deve permitir rejeição fundamentada pelo gestor', async () => {
    const adj = await TimeAdjustmentService.create(lideradoId, {
      date: '2026-08-12',
      adjustmentType: 'INCLUSAO',
      targetTime: '19:00',
      reason: 'Hora extra alegada',
    });

    const rejected = await TimeAdjustmentService.managerReject(adj.id, gestorId, {
      notes: 'Hora extra não previamente autorizada pela gerência.',
    });

    assert.equal(rejected.status, 'REJEITADO');
    assert.equal(rejected.managerNotes, 'Hora extra não previamente autorizada pela gerência.');
  });
});
