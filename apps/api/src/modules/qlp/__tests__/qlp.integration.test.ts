import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { QlpService } from '../services/qlp.service.js';

describe('QLP - Quadro de Lotação de Pessoal Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let testPositionId: string;
  let managerEmployeeId: string;
  let managerUserId: string;
  let rhUserId: string;
  const createdEmployeeIds: string[] = [];

  before(async () => {
    const company = await prisma.company.create({
      data: {
        legalName: 'QLP Testes S/A',
        tradeName: 'QLP Testes',
        cnpj: `11.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Produção QLP',
        code: 'QLP-01',
      },
    });
    testDeptId = dept.id;

    const position = await prisma.position.create({
      data: {
        departmentId: testDeptId,
        title: 'Operador de Produção QLP',
        level: 'Júnior',
      },
    });
    testPositionId = position.id;

    const managerEmp = await prisma.employee.create({
      data: {
        name: 'Gestor QLP Roberto',
        cpf: '99911122200',
        email: 'roberto.gestor@qlpteste.com',
        registrationNumber: 'MAT-QLP-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2022-01-10'),
      },
    });
    managerEmployeeId = managerEmp.id;
    createdEmployeeIds.push(managerEmployeeId);

    await prisma.department.update({
      where: { id: testDeptId },
      data: { managerId: managerEmployeeId },
    });

    const managerUser = await prisma.user.create({
      data: {
        email: 'roberto.gestor@qlpteste.com',
        passwordHash: 'hash-teste',
        employeeId: managerEmployeeId,
      },
    });
    managerUserId = managerUser.id;

    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.qlp@qlpteste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;

    // 2 colaboradores ativos ocupando a função monitorada
    for (let i = 1; i <= 2; i++) {
      const emp = await prisma.employee.create({
        data: {
          name: `Colaborador QLP ${i}`,
          cpf: `1234567890${i}`,
          email: `colaborador${i}@qlpteste.com`,
          registrationNumber: `MAT-QLP-10${i}`,
          companyId: testCompanyId,
          departmentId: testDeptId,
          positionId: testPositionId,
          admissionDate: new Date('2024-03-01'),
          shiftType: 'MANHA',
          laborClassification: 'DIRETA',
          contractType: 'CLT',
        },
      });
      createdEmployeeIds.push(emp.id);
    }
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.workforceRequest.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.workforceParameter.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.user.deleteMany({ where: { id: { in: [managerUserId, rhUserId] } } });
      await prisma.employee.deleteMany({ where: { companyId: testCompanyId } });
      await prisma.position.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.department.deleteMany({ where: { companyId: testCompanyId } });
      await prisma.company.delete({ where: { id: testCompanyId } });
    }
  });

  it('deve criar um parâmetro de dimensionamento e validar as regras de min/ideal/max', async () => {
    await assert.rejects(
      async () =>
        QlpService.createParameter({
          departmentId: testDeptId,
          positionId: testPositionId,
          shiftType: 'MANHA',
          laborClassification: 'DIRETA',
          minQuantity: 5,
          plannedQuantity: 3,
          maxQuantity: 6,
          allowedContractTypes: ['CLT'],
          effectiveFrom: '2026-01-01',
          effectiveTo: null,
          active: true,
        } as any),
      /não pode ser maior/
    );

    const parameter = await QlpService.createParameter({
      departmentId: testDeptId,
      positionId: testPositionId,
      shiftType: 'MANHA',
      laborClassification: 'DIRETA',
      minQuantity: 3,
      plannedQuantity: 4,
      maxQuantity: 5,
      allowedContractTypes: ['CLT', 'APRENDIZ'],
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      active: true,
    } as any);

    assert.ok(parameter.id);
    assert.equal(parameter.minQuantity, 3);
    assert.equal(parameter.department.id, testDeptId);
  });

  it('deve montar o painel de lotação comparando o efetivo real contra o parâmetro (abaixo do mínimo)', async () => {
    const dashboard = await QlpService.getDashboard({ departmentId: testDeptId } as any);

    const row = dashboard.comparison.find((c) => c.position?.id === testPositionId);
    assert.ok(row, 'Deveria haver uma linha de comparação para a função monitorada');
    assert.equal(row!.currentQuantity, 2);
    assert.equal(row!.minQuantity, 3);
    assert.equal(row!.situation, 'ABAIXO_MINIMO');
    assert.equal(row!.gapToMin, 1);

    assert.ok(dashboard.totals.headcount >= 3);
  });

  it('deve listar colaboradores filtrados por setor/função/turno/vínculo', async () => {
    const employees = await QlpService.listEmployees({
      departmentId: testDeptId,
      positionId: testPositionId,
      shiftType: 'MANHA',
      contractType: 'CLT',
    } as any);

    assert.equal(employees.length, 2);
    assert.ok(employees.every((e) => e.department?.id === testDeptId));
  });

  it('deve permitir o fluxo completo de solicitação de reposição de quadro e aprovação do RH', async () => {
    const request = await QlpService.createRequest(managerUserId, {
      departmentId: testDeptId,
      positionId: testPositionId,
      shiftType: 'MANHA',
      requestType: 'REPOSICAO',
      quantity: 1,
      justification: 'Reposição para atingir a quantidade mínima definida no dimensionamento.',
    });

    assert.ok(request.id);
    assert.equal(request.status, 'PENDENTE');
    assert.equal(request.requestedById, managerUserId);

    const teamRequests = await QlpService.listRequests(
      { departmentId: testDeptId } as any,
      { userId: managerUserId, employeeId: managerEmployeeId, isPrivileged: false }
    );
    assert.ok(teamRequests.some((r) => r.id === request.id));

    const decided = await QlpService.decideRequest(request.id, rhUserId, {
      status: 'APROVADO',
      decisionNote: 'Aprovado pelo RH — abertura de vaga autorizada.',
    });

    assert.equal(decided.status, 'APROVADO');
    assert.equal(decided.approvedById, rhUserId);

    await assert.rejects(
      async () =>
        QlpService.decideRequest(request.id, rhUserId, {
          status: 'REJEITADO',
          decisionNote: 'Tentativa de decidir novamente',
        }),
      /já foi decidida/
    );
  });

  it('deve impedir que um solicitante cancele a solicitação de outra pessoa e permitir cancelamento próprio quando pendente', async () => {
    const request = await QlpService.createRequest(managerUserId, {
      departmentId: testDeptId,
      positionId: testPositionId,
      shiftType: 'MANHA',
      requestType: 'AMPLIACAO',
      quantity: 2,
      justification: 'Ampliação de quadro para novo turno de produção.',
    });

    await assert.rejects(
      async () => QlpService.cancelRequest(request.id, rhUserId, false),
      /só pode cancelar/
    );

    const cancelled = await QlpService.cancelRequest(request.id, managerUserId, false);
    assert.equal(cancelled.id, request.id);

    const afterCancel = await prisma.workforceRequest.findUnique({ where: { id: request.id } });
    assert.equal(afterCancel, null);
  });
});
