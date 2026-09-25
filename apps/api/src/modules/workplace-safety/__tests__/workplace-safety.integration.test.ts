import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { PpeService } from '../services/ppe.service.js';
import { AccidentsService } from '../services/accidents.service.js';
import { InspectionsService } from '../services/inspections.service.js';
import { CipaService } from '../services/cipa.service.js';
import { ActivitiesService } from '../services/activities.service.js';
import { DocumentsService } from '../services/documents.service.js';
import { CorrectiveActionsService } from '../services/corrective-actions.service.js';

describe('Workplace Safety (Segurança do Trabalho) Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let employeeId: string;
  let inspectorId: string;

  before(async () => {
    const company = await prisma.company.create({
      data: {
        legalName: 'Segurança do Trabalho Testes S/A',
        tradeName: 'SST Testes',
        cnpj: `22.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Produção Industrial',
        code: 'PROD-SST',
      },
    });
    testDeptId = dept.id;

    const employee = await prisma.employee.create({
      data: {
        name: 'Colaborador João Silva',
        cpf: '11122233355',
        email: 'joao.silva@sstteste.com',
        registrationNumber: 'MAT-SST-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2024-01-10'),
      },
    });
    employeeId = employee.id;

    const inspector = await prisma.employee.create({
      data: {
        name: 'Técnico de Segurança Ana Costa',
        cpf: '22233344466',
        email: 'ana.costa@sstteste.com',
        registrationNumber: 'MAT-SST-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2023-05-01'),
      },
    });
    inspectorId = inspector.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.correctiveAction.deleteMany({});
      await prisma.safetyActivityParticipant.deleteMany({});
      await prisma.safetyActivity.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.safetyDocument.deleteMany({});
      await prisma.cipaMeeting.deleteMany({});
      await prisma.cipaMember.deleteMany({ where: { employeeId: { in: [employeeId, inspectorId] } } });
      await prisma.safetyInspection.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.workplaceAccident.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.ppeDelivery.deleteMany({ where: { employeeId } });
      await prisma.ppe.deleteMany({ where: { name: 'Capacete de Segurança Teste' } });
      await prisma.employee.deleteMany({ where: { companyId: testCompanyId } });
      await prisma.department.deleteMany({ where: { companyId: testCompanyId } });
      await prisma.company.delete({ where: { id: testCompanyId } });
    }
  });

  it('deve gerenciar EPIs: cadastro, entrega (baixa de estoque) e devolução (reposição de estoque)', async () => {
    const ppe = await PpeService.create({
      name: 'Capacete de Segurança Teste',
      ca: 'CA-12345',
      category: 'Proteção da Cabeça',
      stockQuantity: 10,
      active: true,
    });
    assert.ok(ppe.id);
    assert.equal(ppe.stockQuantity, 10);

    const delivery = await PpeService.createDelivery({
      ppeId: ppe.id,
      employeeId,
      movementType: 'ENTREGA',
      quantity: 2,
      signatureConfirmed: true,
    });
    assert.ok(delivery.id);

    const ppeAfterDelivery = await PpeService.getById(ppe.id);
    assert.equal((ppeAfterDelivery as any).stockQuantity, 8);

    await PpeService.createDelivery({
      ppeId: ppe.id,
      employeeId,
      movementType: 'DEVOLUCAO',
      quantity: 1,
      signatureConfirmed: true,
    });

    const ppeAfterReturn = await PpeService.getById(ppe.id);
    assert.equal((ppeAfterReturn as any).stockQuantity, 9);

    const deliveries = await PpeService.listDeliveries({ employeeId });
    assert.equal(deliveries.length, 2);
  });

  it('deve registrar acidente de trabalho com CAT e permitir criação de ação corretiva vinculada', async () => {
    const accident = await AccidentsService.create({
      departmentId: null,
      employeeId,
      type: 'ACIDENTE',
      occurredAt: '2026-08-15T10:30:00.000Z',
      description: 'Corte superficial na mão durante manuseio de ferramenta.',
      catNumber: 'CAT-2026-0001',
      catIssuedAt: '2026-08-16',
      status: 'ABERTO',
    });
    assert.ok(accident.id);
    assert.equal(accident.status, 'ABERTO');
    assert.equal(accident.departmentId, testDeptId);

    const correctiveAction = await CorrectiveActionsService.create({
      sourceType: 'ACCIDENT',
      accidentId: accident.id,
      description: 'Reforçar treinamento de uso de EPI de proteção das mãos.',
      responsibleId: inspectorId,
      dueDate: '2026-09-15',
      status: 'PENDENTE',
    });
    assert.ok(correctiveAction.id);
    assert.equal(correctiveAction.accidentId, accident.id);

    const completed = await CorrectiveActionsService.update(correctiveAction.id, { status: 'CONCLUIDA' });
    assert.equal(completed.status, 'CONCLUIDA');
    assert.ok(completed.completedAt);

    const updatedAccident = await AccidentsService.update(accident.id, { status: 'CONCLUIDO' });
    assert.equal(updatedAccident.status, 'CONCLUIDO');
  });

  it('deve registrar inspeção de segurança com checklist e vincular ação corretiva por irregularidade', async () => {
    const inspection = await InspectionsService.create({
      departmentId: testDeptId,
      inspectorId,
      inspectionDate: '2026-08-20',
      checklist: [
        { item: 'Extintores', status: 'CONFORME' },
        { item: 'Saídas de emergência', status: 'NAO_CONFORME', observation: 'Obstruída por caixas' },
      ],
      irregularitiesFound: 'Saída de emergência obstruída no setor de produção.',
      status: 'ABERTO',
    });
    assert.ok(inspection.id);
    assert.equal((inspection.checklist as any[]).length, 2);

    const correctiveAction = await CorrectiveActionsService.create({
      sourceType: 'INSPECTION',
      inspectionId: inspection.id,
      description: 'Desobstruir e sinalizar saída de emergência.',
      dueDate: '2026-09-01',
      status: 'PENDENTE',
    });
    assert.equal(correctiveAction.inspectionId, inspection.id);

    const actionsForInspection = await CorrectiveActionsService.list({ inspectionId: inspection.id });
    assert.equal(actionsForInspection.length, 1);
  });

  it('deve exigir acidente ou inspeção compatível com o tipo de origem da ação corretiva', async () => {
    await assert.rejects(async () => {
      await CorrectiveActionsService.create({
        sourceType: 'ACCIDENT',
        description: 'Ação sem origem válida',
        dueDate: '2026-09-01',
        status: 'PENDENTE',
      } as any);
    });
  });

  it('deve gerenciar membros e reuniões da CIPA', async () => {
    const member = await CipaService.createMember({
      employeeId,
      role: 'REPRESENTANTE_EMPREGADO',
      termStart: '2026-01-01',
      termEnd: '2027-12-31',
      active: true,
    });
    assert.ok(member.id);

    const members = await CipaService.listMembers(true);
    assert.ok(members.some((m) => m.id === member.id));

    const meeting = await CipaService.createMeeting({
      meetingDate: '2026-08-10',
      minutes: 'Discussão sobre uso de EPIs e mapa de risco do setor de produção.',
      pendingActions: [{ description: 'Atualizar mapa de risco', done: false }],
    });
    assert.ok(meeting.id);

    const updatedMember = await CipaService.updateMember(member.id, { active: false });
    assert.equal(updatedMember.active, false);
  });

  it('deve criar atividade SIPATMA/DDS com participantes e permitir controle de presença', async () => {
    const activity = await ActivitiesService.create({
      type: 'DDS',
      title: 'DDS - Uso correto de EPIs',
      departmentId: testDeptId,
      activityDate: '2026-08-25',
      topics: 'Importância do uso de capacete e luvas de proteção.',
      responsibleId: inspectorId,
      participantIds: [employeeId],
    });
    assert.ok(activity.id);
    assert.equal(activity.participants.length, 1);

    const participant = activity.participants[0];
    const updatedParticipant = await ActivitiesService.setParticipantAttendance(participant.id, false);
    assert.equal(updatedParticipant.attended, false);

    const added = await ActivitiesService.addParticipants(activity.id, { employeeIds: [inspectorId] });
    assert.equal(added.participants.length, 2);
  });

  it('deve gerenciar documentos de SST e listar documentos próximos do vencimento', async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const soonDateStr = soon.toISOString().slice(0, 10);

    const document = await DocumentsService.create({
      type: 'PGR',
      title: 'Programa de Gerenciamento de Riscos 2026',
      fileUrl: 'https://files.example.com/pgr-2026.pdf',
      issueDate: '2026-01-01',
      expiryDate: soonDateStr,
      active: true,
    });
    assert.ok(document.id);

    const expiring = await DocumentsService.getExpiringDocuments(30);
    assert.ok(expiring.some((d) => d.id === document.id));

    const inactivated = await DocumentsService.remove(document.id);
    assert.equal(inactivated.active, false);
  });
});
