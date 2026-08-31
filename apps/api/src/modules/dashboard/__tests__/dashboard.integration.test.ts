import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { DashboardService } from '../services/dashboard.service.js';

describe('Dashboards Operacionais Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let gestorEmpId: string;
  let colabEmpId: string;

  before(async () => {
    // 1. Empresa e Departamento
    const company = await prisma.company.create({
      data: {
        legalName: 'Empresa Dashboard Teste S/A',
        tradeName: 'Dashboards Teste',
        cnpj: '88.111.222/0001-33',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Operações & Logística',
        code: 'OP-01',
      },
    });
    testDeptId = dept.id;

    // 2. Gestor
    const gestor = await prisma.employee.create({
      data: {
        name: 'Carlos Alberto Gestor',
        cpf: '33344455566',
        email: 'carlos.gestor@dashteste.com',
        registrationNumber: 'DASH-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2023-05-10'),
      },
    });
    gestorEmpId = gestor.id;

    // 3. Colaborador Subordinado
    const colab = await prisma.employee.create({
      data: {
        name: 'Mariana Silva',
        cpf: '44455566677',
        email: 'mariana.silva@dashteste.com',
        registrationNumber: 'DASH-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        managerId: gestorEmpId,
        admissionDate: new Date('2024-01-15'),
      },
    });
    colabEmpId = colab.id;

    // 4. Período de Férias e Ajuste de Ponto Pendente
    const now = new Date();
    await prisma.vacationPeriod.create({
      data: {
        employeeId: colabEmpId,
        vestingStartDate: new Date('2024-01-15'),
        vestingEndDate: new Date('2025-01-14'),
        deadlineDate: new Date('2026-09-15'),
        daysEntitled: 30,
        daysTaken: 10,
        daysRemaining: 20,
      },
    });

    await prisma.timeClockAdjustment.create({
      data: {
        employeeId: colabEmpId,
        date: new Date('2026-08-20'),
        targetTime: '17:00',
        adjustmentType: 'INCLUSAO',
        reason: 'Esquecimento de registro no horário de saída',
        status: 'PENDENTE_GESTOR',
      },
    });
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.timeClockAdjustment.deleteMany({
        where: { employeeId: colabEmpId },
      });
      await prisma.vacationPeriod.deleteMany({
        where: { employeeId: colabEmpId },
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

  it('deve retornar resumo do dashboard do colaborador com férias e solicitações', async () => {
    const summary = await DashboardService.getEmployeeDashboardSummary(colabEmpId);

    assert.equal(summary.employee.name, 'Mariana Silva');
    assert.equal(summary.vacations.availableDays, 20);
    assert.ok(summary.timeBalance.formattedBalance);
  });

  it('deve retornar resumo do gestor com pendências da equipe', async () => {
    const summary = await DashboardService.getManagerDashboardSummary(gestorEmpId);

    assert.equal(summary.teamTotalCount, 1);
    assert.ok(summary.pendingApprovalsCount >= 1);
    assert.equal(summary.pendingTimeAdjustments.length, 1);
    assert.equal(summary.pendingTimeAdjustments[0].employeeName, 'Mariana Silva');
  });

  it('deve retornar resumo corporativo do RH com headcount e férias a vencer', async () => {
    const summary = await DashboardService.getRhDashboardSummary({ companyId: testCompanyId });

    assert.ok(summary.headcount >= 2);
    assert.ok(typeof summary.turnoverRate === 'string');
    assert.ok(summary.expiringVacationsCount >= 1);
  });

  it('deve realizar busca universal por colaborador e departamento', async () => {
    const result = await DashboardService.globalSearch('Mariana');

    assert.ok(result.employees.length >= 1);
    assert.equal(result.employees[0].name, 'Mariana Silva');

    const resultDept = await DashboardService.globalSearch('Operações');
    assert.ok(resultDept.departments.length >= 1);
    assert.ok(resultDept.departments[0].name.includes('Operações'));
  });
});
