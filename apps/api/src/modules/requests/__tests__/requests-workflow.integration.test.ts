import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { RequestsService } from '../services/requests.service.js';
import { WorkflowEngineService } from '../services/workflow-engine.service.js';

describe('Workflow Engine & Requests Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let gestorEmployeeId: string;
  let gestorUserId: string;
  let lideradoEmployeeId: string;
  let lideradoUserId: string;
  let rhUserId: string;
  let rhRoleId: string;

  before(async () => {
    // 1. Empresa e Setor
    const company = await prisma.company.create({
      data: {
        legalName: 'Workflow Engine Testes S/A',
        tradeName: 'Workflow Testes',
        cnpj: '88.999.000/0001-22',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Tecnologia da Informação',
        code: 'TI-01',
      },
    });
    testDeptId = dept.id;

    // 2. Roles
    let rhRole = await prisma.role.findFirst({ where: { name: 'RH' } });
    if (!rhRole) {
      rhRole = await prisma.role.create({
        data: { name: 'RH', description: 'Recursos Humanos' },
      });
    }
    rhRoleId = rhRole.id;

    // 3. Gestor
    const gestorEmp = await prisma.employee.create({
      data: {
        name: 'Gestora Vanessa Dias',
        cpf: '11122233344',
        email: 'vanessa.gestora@workflowteste.com',
        registrationNumber: 'MAT-WF-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    gestorEmployeeId = gestorEmp.id;

    const gestorUser = await prisma.user.create({
      data: {
        email: 'vanessa.gestora@workflowteste.com',
        passwordHash: 'hash-teste',
        employeeId: gestorEmployeeId,
      },
    });
    gestorUserId = gestorUser.id;

    // 4. Liderado
    const lideradoEmp = await prisma.employee.create({
      data: {
        name: 'Desenvolvedor Bruno Santos',
        cpf: '55566677788',
        email: 'bruno.santos@workflowteste.com',
        registrationNumber: 'MAT-WF-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        managerId: gestorEmployeeId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    lideradoEmployeeId = lideradoEmp.id;

    const lideradoUser = await prisma.user.create({
      data: {
        email: 'bruno.santos@workflowteste.com',
        passwordHash: 'hash-teste',
        employeeId: lideradoEmployeeId,
      },
    });
    lideradoUserId = lideradoUser.id;

    // 5. RH User
    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.atendimento@workflowteste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;

    await prisma.userRole.create({
      data: {
        userId: rhUserId,
        roleId: rhRoleId,
      },
    });
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.requestAttachment.deleteMany({
        where: { request: { requesterId: { in: [gestorEmployeeId, lideradoEmployeeId] } } },
      });
      await prisma.requestHistory.deleteMany({
        where: { request: { requesterId: { in: [gestorEmployeeId, lideradoEmployeeId] } } },
      });
      await prisma.request.deleteMany({
        where: { requesterId: { in: [gestorEmployeeId, lideradoEmployeeId] } },
      });
      await prisma.userRole.deleteMany({
        where: { userId: { in: [gestorUserId, lideradoUserId, rhUserId] } },
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

  it('deve executar o ciclo completo de workflow (Abertura -> Aprovação Gestor -> Aprovação RH -> Conclusão)', async () => {
    // 1. Inicializa tipos padrão
    await RequestsService.seedDefaultTypes();

    // 2. Colaborador abre uma solicitação de atendimento geral (Gestor -> RH)
    const request = await RequestsService.createRequest(lideradoEmployeeId, lideradoUserId, {
      requestTypeCode: 'SOLICITACAO_GERAL',
      title: 'Aquisição de Monitor Adicional para Home Office',
      description: 'Preciso de um segundo monitor para desenvolvimento frontend.',
      priority: 'ALTA',
      formData: {
        setorDestino: 'TI / Suporte',
        detalhamento: 'Monitor 27 polegadas HDMI.',
      },
    });

    assert.ok(request.id);
    assert.ok(request.requestNumber.startsWith('SOL-'));
    assert.equal(request.status, 'AGUARDANDO_GESTOR');
    assert.equal(request.currentStepOrder, 1);
    assert.equal(request.currentAssigneeId, gestorEmployeeId);

    // 3. Gestor consulta sua caixa de entrada e enxerga a solicitação
    const managerInbox = await RequestsService.listInbox(
      gestorUserId,
      gestorEmployeeId,
      ['COLABORADOR'],
      {}
    );
    assert.ok(managerInbox.items.some((i) => i.id === request.id));

    // 4. Gestor aprova a etapa 1
    const gestorApproved = await WorkflowEngineService.advanceStep(
      request.id,
      gestorUserId,
      gestorEmployeeId,
      ['COLABORADOR'],
      'Aprovado pelo gestor. Equipamento justificável para o projeto.'
    );

    assert.equal(gestorApproved.status, 'AGUARDANDO_RH');
    assert.equal(gestorApproved.currentStepOrder, 2);

    // 5. RH consulta sua caixa de entrada e enxerga a solicitação
    const rhInbox = await RequestsService.listInbox(rhUserId, null, ['RH'], {});
    assert.ok(rhInbox.items.some((i) => i.id === request.id));

    // 6. RH aprova a etapa 2 (última etapa -> deve concluir a solicitação)
    const rhApproved = await WorkflowEngineService.advanceStep(
      request.id,
      rhUserId,
      null,
      ['RH'],
      'Equipamento reservado no estoque de TI. Pedido de compra finalizado.'
    );

    assert.equal(rhApproved.status, 'CONCLUIDO');
    assert.ok(rhApproved.closedAt);

    // 7. Consulta detalhes e verifica histórico completo
    const details = await RequestsService.getById(request.id, lideradoUserId, lideradoEmployeeId, [
      'COLABORADOR',
    ]);
    assert.ok(details.request);
    assert.equal(details.request.history.length, 3); // CRIADA, AVANCADA, CONCLUIDA
    assert.equal(details.request.history[0].action, 'CRIADA');
    assert.equal(details.request.history[1].action, 'AVANCADA');
    assert.equal(details.request.history[2].action, 'CONCLUIDA');
  });

  it('deve permitir inclusão de comentário na linha do tempo', async () => {
    const request = await RequestsService.createRequest(lideradoEmployeeId, lideradoUserId, {
      requestTypeCode: 'DECLARACAO_VINCULO',
      title: 'Declaração para Financiamento',
      formData: {
        finalidade: 'Comprovação de Renda / Aluguel',
        incluirSalario: 'Sim',
      },
    });

    const comment = await WorkflowEngineService.addComment(
      request.id,
      gestorUserId,
      'Favor priorizar emissão com assinatura digital ICP-Brasil.'
    );

    assert.ok(comment.id);
    assert.equal(comment.action, 'COMENTADA');
    assert.equal(comment.comment, 'Favor priorizar emissão com assinatura digital ICP-Brasil.');
  });

  it('deve permitir cancelamento pelo solicitante enquanto aberta', async () => {
    const request = await RequestsService.createRequest(lideradoEmployeeId, lideradoUserId, {
      requestTypeCode: 'DECLARACAO_VINCULO',
      title: 'Solicitação para Cancelar',
    });

    const cancelled = await WorkflowEngineService.cancel(
      request.id,
      lideradoEmployeeId,
      lideradoUserId
    );
    assert.equal(cancelled.status, 'CANCELADO');
    assert.ok(cancelled.closedAt);
  });
});
