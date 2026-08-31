import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma';
import { ReportsService } from '../services/reports.service';

describe('Módulo de Relatórios & Exportações Integration Flow', () => {
  let companyId: string;
  let employeeId: string;

  before(async () => {
    // 1. Empresa
    const company = await prisma.company.create({
      data: {
        legalName: 'Átrio Relatórios S.A.',
        tradeName: 'Átrio Relatórios',
        cnpj: `99.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });
    companyId = company.id;

    // 2. Colaborador
    const employee = await prisma.employee.create({
      data: {
        companyId,
        name: 'Relatório Teste Colaborador',
        registrationNumber: `REP-${Date.now()}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        email: `rep_${Date.now()}@atrio.com.br`,
        admissionDate: new Date('2024-01-01'),
        contractType: 'CLT',
        status: 'ATIVO',
      },
    });
    employeeId = employee.id;

    // 3. Ponto diário
    await prisma.timeDailySummary.create({
      data: {
        employeeId,
        date: new Date('2026-08-15'),
        expectedWorkMinutes: 480,
        actualWorkMinutes: 480,
        balanceMinutes: 0,
        extraHoursMinutes: 0,
        delayMinutes: 0,
        absenceMinutes: 0,
        entries: [],
        status: 'OK',
      },
    });
  });

  after(async () => {
    if (companyId) {
      await prisma.timeDailySummary.deleteMany({ where: { employeeId } });
      await prisma.employee.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
  });

  it('deve gerar relatório de colaboradores em formato CSV', async () => {
    const report = await ReportsService.exportEmployees({ format: 'CSV', companyId });
    assert.equal(report.contentType, 'text/csv');
    assert.ok(report.buffer.length > 0);
    assert.ok(report.buffer.toString('utf-8').includes('Relatório Teste Colaborador'));
  });

  it('deve gerar relatório de colaboradores em formato XLSX', async () => {
    const report = await ReportsService.exportEmployees({ format: 'XLSX', companyId });
    assert.equal(report.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(report.buffer.length > 0);
  });

  it('deve gerar relatório de colaboradores em formato PDF', async () => {
    const report = await ReportsService.exportEmployees({ format: 'PDF', companyId });
    assert.equal(report.contentType, 'application/pdf');
    assert.ok(report.buffer.length > 0);
  });

  it('deve gerar espelho de ponto em formato XLSX', async () => {
    const report = await ReportsService.exportTimeClockSummary({ format: 'XLSX' });
    assert.equal(report.contentType, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.ok(report.buffer.length > 0);
  });

  it('deve gerar espelho mensal em PDF formatado para assinatura', async () => {
    const report = await ReportsService.generateMonthlyMirrorPdf({
      employeeId,
      yearMonth: '2026-08',
    });

    assert.ok(report.filename.includes('espelho_ponto_'));
    assert.ok(report.buffer.length > 0);
    assert.ok(report.buffer.toString('ascii').startsWith('%PDF'));
  });
});
