import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { VacationService } from '../services/vacation.service.js';

describe('Vacation Management & CLT Rules Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let gestorEmployeeId: string;
  let gestorUserId: string;
  let lideradoEmployeeId: string;
  let lideradoUserId: string;
  let rhUserId: string;

  before(async () => {
    // 1. Empresa e Setor
    const company = await prisma.company.create({
      data: {
        legalName: 'Férias CLT Testes S/A',
        tradeName: 'Férias Testes',
        cnpj: '77.888.999/0001-33',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Operações e Logística',
        code: 'OP-01',
      },
    });
    testDeptId = dept.id;

    // 2. Gestor
    const gestorEmp = await prisma.employee.create({
      data: {
        name: 'Gestor Carlos Eduardo',
        cpf: '77711122233',
        email: 'carlos.gestor@feriasteste.com',
        registrationNumber: 'MAT-VAC-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2023-01-10'),
      },
    });
    gestorEmployeeId = gestorEmp.id;

    const gestorUser = await prisma.user.create({
      data: {
        email: 'carlos.gestor@feriasteste.com',
        passwordHash: 'hash-teste',
        employeeId: gestorEmployeeId,
      },
    });
    gestorUserId = gestorUser.id;

    // 3. Liderado (Admitido há mais de 1 ano para ter período adquirido)
    const lideradoEmp = await prisma.employee.create({
      data: {
        name: 'Colaboradora Mariana Rios',
        cpf: '88822233344',
        email: 'mariana.rios@feriasteste.com',
        registrationNumber: 'MAT-VAC-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        managerId: gestorEmployeeId,
        admissionDate: new Date('2024-01-15'),
      },
    });
    lideradoEmployeeId = lideradoEmp.id;

    const lideradoUser = await prisma.user.create({
      data: {
        email: 'mariana.rios@feriasteste.com',
        passwordHash: 'hash-teste',
        employeeId: lideradoEmployeeId,
      },
    });
    lideradoUserId = lideradoUser.id;

    // 4. RH
    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.ferias@feriasteste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.vacationRequest.deleteMany({
        where: { employeeId: { in: [gestorEmployeeId, lideradoEmployeeId] } },
      });
      await prisma.vacationPeriod.deleteMany({
        where: { employeeId: { in: [gestorEmployeeId, lideradoEmployeeId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [gestorUserId, lideradoUserId, rhUserId] } },
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
    }
  });

  it('deve gerar períodos aquisitivos e permitir fluxo completo de solicitação, aprovação de gestor e homologação RH', async () => {
    // 1. Garante períodos e consulta resumo
    const summary = await VacationService.getEmployeeSummary(lideradoEmployeeId);
    assert.ok(summary.periods.length >= 1);

    const acquiredPeriod = summary.periods.find((p) => p.status === 'ADQUIRIDO' || p.daysRemaining > 0);
    assert.ok(acquiredPeriod);
    assert.equal(acquiredPeriod.daysRemaining, 30);

    // 2. Colaboradora solicita 15 dias de férias com início em uma segunda-feira (2026-10-05)
    // 2026-10-05 é Segunda-feira (dia 1)
    const request = await VacationService.createRequest(lideradoEmployeeId, lideradoUserId, {
      vacationPeriodId: acquiredPeriod.id,
      startDate: '2026-10-05',
      endDate: '2026-10-19', // 15 dias
      sellDaysCount: 0,
      advanceThirteenth: true,
      notes: 'Viagem em família programada',
    });

    assert.ok(request.id);
    assert.equal(request.daysCount, 15);
    assert.equal(request.status, 'PENDENTE_GESTOR');

    // Verifica dedução de saldo
    const periodAfter = await prisma.vacationPeriod.findUnique({
      where: { id: acquiredPeriod.id },
    });
    assert.equal(periodAfter?.daysScheduled, 15);
    assert.equal(periodAfter?.daysRemaining, 15);

    // 3. Gestor aprova a solicitação
    const managerApproved = await VacationService.managerApprove(
      request.id,
      gestorEmployeeId,
      gestorUserId,
      'Aprovado pelo gestor. Equipe alinhada para cobertura.'
    );
    assert.equal(managerApproved.status, 'PENDENTE_RH');
    assert.equal(managerApproved.managerNotes, 'Aprovado pelo gestor. Equipe alinhada para cobertura.');

    // 4. RH homologa e agenda as férias
    const rhApproved = await VacationService.rhApprove(
      request.id,
      rhUserId,
      'Homologado e lançado na folha de pagamento.'
    );
    assert.equal(rhApproved.status, 'APROVADO');
    assert.ok(rhApproved.rhActionAt);

    // 5. Calendário da equipe reflete o agendamento
    const calendar = await VacationService.getTeamCalendar(gestorEmployeeId, '2026-10-01', '2026-10-31');
    assert.ok(calendar.requests.some((r) => r.id === request.id));
  });

  it('deve aplicar validações trabalhistas da CLT (período < 5 dias, início em sexta/sábado e saldo insuficiente)', async () => {
    const summary = await VacationService.getEmployeeSummary(lideradoEmployeeId);
    const period = summary.periods[0];

    // 1. Tentar período com menos de 5 dias (ex: 3 dias)
    await assert.rejects(
      async () => {
        await VacationService.createRequest(lideradoEmployeeId, lideradoUserId, {
          vacationPeriodId: period.id,
          startDate: '2026-11-02',
          endDate: '2026-11-04', // 3 dias
          sellDaysCount: 0,
          advanceThirteenth: false,
        });
      },
      /inferior a 5 dias corridos/
    );

    // 2. Tentar início em uma Sexta-feira (2026-11-06)
    await assert.rejects(
      async () => {
        await VacationService.createRequest(lideradoEmployeeId, lideradoUserId, {
          vacationPeriodId: period.id,
          startDate: '2026-11-06', // Sexta-feira
          endDate: '2026-11-15',
          sellDaysCount: 0,
          advanceThirteenth: false,
        });
      },
      /dois dias que antecedem o repouso semanal remunerado/
    );

    // 3. Tentar solicitar mais dias do que o saldo disponível
    await assert.rejects(
      async () => {
        await VacationService.createRequest(lideradoEmployeeId, lideradoUserId, {
          vacationPeriodId: period.id,
          startDate: '2026-11-09',
          endDate: '2026-11-28', // 20 dias (saldo restante é 15)
          sellDaysCount: 0,
          advanceThirteenth: false,
        });
      },
      /Saldo insuficiente no período aquisitivo/
    );
  });

  it('deve estornar o saldo do período ao cancelar ou rejeitar uma solicitação', async () => {
    const summary = await VacationService.getEmployeeSummary(lideradoEmployeeId);
    const period = summary.periods[0];
    const saldoAntes = period.daysRemaining;

    // Solicita 10 dias
    const request = await VacationService.createRequest(lideradoEmployeeId, lideradoUserId, {
      vacationPeriodId: period.id,
      startDate: '2026-12-07', // Segunda-feira
      endDate: '2026-12-16', // 10 dias
      sellDaysCount: 0,
      advanceThirteenth: false,
    });

    const periodDuring = await prisma.vacationPeriod.findUnique({ where: { id: period.id } });
    assert.equal(periodDuring?.daysRemaining, saldoAntes - 10);

    // Cancela a solicitação
    await VacationService.cancel(request.id, lideradoEmployeeId, lideradoUserId);

    const periodAfter = await prisma.vacationPeriod.findUnique({ where: { id: period.id } });
    assert.equal(periodAfter?.daysRemaining, saldoAntes);
  });
});
