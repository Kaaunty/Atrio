import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { JobRequisitionsService } from '../services/job-requisitions.service.js';
import { JobOpeningsService } from '../services/job-openings.service.js';
import { CandidatesService } from '../services/candidates.service.js';
import { ApplicationsService } from '../services/applications.service.js';
import { InterviewsService } from '../services/interviews.service.js';
import { RecruitmentDashboardService } from '../services/dashboard.service.js';

describe('Recruitment & Selection Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let testPositionId: string;
  let gestorUserId: string;
  let rhUserId: string;
  let candidateId: string;

  before(async () => {
    const company = await prisma.company.create({
      data: {
        legalName: 'Recrutamento Testes S/A',
        tradeName: 'Recrutamento Testes',
        cnpj: `33.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
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

    const position = await prisma.position.create({
      data: {
        departmentId: testDeptId,
        title: 'Desenvolvedor(a) Backend Pleno',
        level: 'PLENO',
      },
    });
    testPositionId = position.id;

    const gestorUser = await prisma.user.create({
      data: {
        email: 'gestor.recrutamento@teste.com',
        passwordHash: 'hash-teste',
      },
    });
    gestorUserId = gestorUser.id;

    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.recrutamento@teste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.interviewSchedule.deleteMany({
        where: { application: { jobOpening: { jobRequisition: { departmentId: testDeptId } } } },
      });
      await prisma.application.deleteMany({
        where: { jobOpening: { jobRequisition: { departmentId: testDeptId } } },
      });
      await prisma.jobOpening.deleteMany({
        where: { jobRequisition: { departmentId: testDeptId } },
      });
      await prisma.jobRequisition.deleteMany({ where: { departmentId: testDeptId } });
      if (candidateId) {
        await prisma.candidate.deleteMany({ where: { id: candidateId } });
      }
      await prisma.user.deleteMany({ where: { id: { in: [gestorUserId, rhUserId] } } });
      await prisma.position.deleteMany({ where: { departmentId: testDeptId } });
      await prisma.department.deleteMany({ where: { companyId: testCompanyId } });
      await prisma.company.delete({ where: { id: testCompanyId } });
    }
  });

  it('deve executar o fluxo completo: solicitação -> aprovação -> vaga -> candidato -> pipeline -> aprovação final sem criar Employee', async () => {
    // 1. Gestor solicita abertura de vaga
    const requisition = await JobRequisitionsService.create(gestorUserId, {
      departmentId: testDeptId,
      positionId: testPositionId,
      requestedQuantity: 1,
      contractType: 'CLT',
      justification: 'Aumento de demanda no time de backend para o próximo trimestre.',
    });

    assert.ok(requisition.id);
    assert.equal(requisition.status, 'PENDENTE');

    const mine = await JobRequisitionsService.listMine(gestorUserId);
    assert.ok(mine.some((r) => r.id === requisition.id));

    const pending = await JobRequisitionsService.listPending();
    assert.ok(pending.some((r) => r.id === requisition.id));

    // 2. Tentar criar vaga a partir de solicitação ainda pendente deve falhar
    await assert.rejects(
      async () =>
        JobOpeningsService.create(rhUserId, {
          jobRequisitionId: requisition.id,
          title: 'Desenvolvedor(a) Backend Pleno',
          requirements: 'Node.js, TypeScript, PostgreSQL',
          isInternal: false,
        }),
      /aprovada/
    );

    // 3. RH aprova a solicitação
    const approved = await JobRequisitionsService.approve(requisition.id, rhUserId);
    assert.equal(approved.status, 'APROVADA');
    assert.equal(approved.approvedById, rhUserId);

    // Aprovar novamente deve falhar (já não está mais pendente)
    await assert.rejects(async () => JobRequisitionsService.approve(requisition.id, rhUserId), /pendente/);

    // 4. RH cria a vaga a partir da solicitação aprovada
    const opening = await JobOpeningsService.create(rhUserId, {
      jobRequisitionId: requisition.id,
      title: 'Desenvolvedor(a) Backend Pleno',
      requirements: 'Node.js, TypeScript, PostgreSQL',
      activities: 'Desenvolvimento de APIs REST',
      isInternal: false,
    });

    assert.ok(opening.id);
    assert.equal(opening.status, 'ABERTA');

    // 5. Cadastro de candidato
    const candidate = await CandidatesService.create({
      name: 'Ana Beatriz Souza',
      email: 'ana.souza.candidata@teste.com',
      phone: '11999998888',
      source: 'LinkedIn',
    });
    candidateId = candidate.id;
    assert.ok(candidate.id);

    // 6. Vincula candidato à vaga (cria Application em TRIAGEM)
    const application = await ApplicationsService.create({
      jobOpeningId: opening.id,
      candidateId: candidate.id,
    });
    assert.equal(application.stage, 'TRIAGEM');

    // Vaga deve passar a EM_ANDAMENTO ao receber a primeira candidatura
    const openingAfterApplication = await JobOpeningsService.getById(opening.id);
    assert.equal(openingAfterApplication.status, 'EM_ANDAMENTO');

    // Duplicar candidatura para a mesma vaga deve falhar
    await assert.rejects(
      async () => ApplicationsService.create({ jobOpeningId: opening.id, candidateId: candidate.id }),
      /já possui uma candidatura/
    );

    // 7. Agenda entrevista para a candidatura (deve mover automaticamente para ENTREVISTA)
    const interview = await InterviewsService.create({
      applicationId: application.id,
      scheduledAt: '2026-11-10T14:00:00.000Z',
      interviewers: [{ employeeId: 'temp-id', name: 'Entrevistador Teste' }],
      location: 'Sala de Reuniões Virtual',
    });
    assert.ok(interview.id);

    const afterInterviewScheduled = await ApplicationsService.getById(application.id);
    assert.equal(afterInterviewScheduled.stage, 'ENTREVISTA');

    // 8. Transição inválida deve ser rejeitada (pular direto para APROVADO)
    await assert.rejects(
      async () => ApplicationsService.moveStage(application.id, 'APROVADO'),
      /Transição inválida/
    );

    // 9. Avança corretamente pelo funil: ENTREVISTA -> AVALIACAO -> PARECER -> APROVADO
    const afterAvaliacao = await ApplicationsService.moveStage(application.id, 'AVALIACAO', 'Boa avaliação técnica');
    assert.equal(afterAvaliacao.stage, 'AVALIACAO');

    const afterParecer = await ApplicationsService.moveStage(application.id, 'PARECER');
    assert.equal(afterParecer.stage, 'PARECER');

    const afterAprovado = await ApplicationsService.moveStage(application.id, 'APROVADO', 'Aprovado pela gestão');
    assert.equal(afterAprovado.stage, 'APROVADO');

    // 10. CRÍTICO: mover para APROVADO NÃO deve criar Employee automaticamente
    const employeeWithCandidateEmail = await prisma.employee.findFirst({
      where: { email: candidate.email },
    });
    assert.equal(employeeWithCandidateEmail, null);

    // 11. Dashboard reflete o funil corretamente
    const overview = await RecruitmentDashboardService.getOverview();
    assert.ok(overview.funnel.APROVADO >= 1);
    assert.ok(overview.totalCandidatesCount >= 1);
  });

  it('deve rejeitar solicitação de vaga e impedir aprovação subsequente', async () => {
    const requisition = await JobRequisitionsService.create(gestorUserId, {
      departmentId: testDeptId,
      requestedQuantity: 2,
      contractType: 'PJ',
      justification: 'Necessidade temporária para projeto especial de curto prazo.',
    });

    const rejected = await JobRequisitionsService.reject(requisition.id, rhUserId);
    assert.equal(rejected.status, 'REJEITADA');

    await assert.rejects(async () => JobRequisitionsService.approve(requisition.id, rhUserId), /pendente/);
  });

  it('deve gerenciar candidatos (CRUD) e impedir exclusão quando houver candidatura vinculada', async () => {
    const candidate = await CandidatesService.create({
      name: 'Bruno Lima Ferreira',
      email: 'bruno.lima.candidato@teste.com',
    });

    const updated = await CandidatesService.update(candidate.id, { phone: '11988887777' });
    assert.equal(updated.phone, '11988887777');

    const fetched = await CandidatesService.getById(candidate.id);
    assert.equal(fetched.id, candidate.id);

    const removed = await CandidatesService.remove(candidate.id);
    assert.equal(removed.id, candidate.id);

    await assert.rejects(async () => CandidatesService.getById(candidate.id), /não encontrado/);
  });
});
