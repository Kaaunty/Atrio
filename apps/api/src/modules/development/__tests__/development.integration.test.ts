import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma';
import { DevelopmentService } from '../services/development.service';

describe('Treinamentos, Feedbacks e PDI Integration Flow', () => {
  let userId: string;
  let employeeId: string;
  let trainingId: string;
  let empTrainingId: string;
  let feedbackId: string;
  let planId: string;
  let goalId: string;

  before(async () => {
    // 1. Empresa e Colaborador
    const company = await prisma.company.create({
      data: {
        legalName: 'Átrio Treinamentos e PDI S.A.',
        tradeName: 'Átrio Treinamentos',
        cnpj: `77.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        name: 'Colaborador em Desenvolvimento',
        registrationNumber: `DEV-${Date.now()}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        email: `dev_${Date.now()}@atrio.com.br`,
        admissionDate: new Date('2026-01-01'),
        contractType: 'CLT',
        status: 'ATIVO',
      },
    });
    employeeId = employee.id;

    // 2. Usuário Gestor/Avaliador
    const user = await prisma.user.create({
      data: {
        email: `manager_dev_${Date.now()}@atrio.com.br`,
        passwordHash: 'hashed_pw',
        employeeId,
      },
    });
    userId = user.id;
  });

  after(async () => {
    if (userId) {
      await prisma.developmentPlanGoal.deleteMany({ where: { developmentPlanId: planId } });
      await prisma.developmentPlan.deleteMany({ where: { employeeId } });
      await prisma.feedback.deleteMany({ where: { employeeId } });
      await prisma.employeeTraining.deleteMany({ where: { employeeId } });
      await prisma.training.deleteMany({ where: { id: trainingId } });
      await prisma.user.delete({ where: { id: userId } });
      await prisma.employee.delete({ where: { id: employeeId } });
      await prisma.company.deleteMany({ where: { tradeName: 'Átrio Treinamentos' } });
    }
  });

  it('deve cadastrar um treinamento obrigatório com validade e atribuir ao colaborador', async () => {
    const training = await DevelopmentService.createTraining({
      title: 'Segurança da Informação e LGPD 2026',
      description: 'Treinamento obrigatório de conformidade e boas práticas.',
      category: 'OBRIGATORIO_LEGAL',
      validityMonths: 12,
      workloadHours: 4,
      provider: 'Interno',
    });

    assert.ok(training.id);
    trainingId = training.id;

    const assignResult = await DevelopmentService.assignTrainingToEmployees({
      trainingId,
      employeeIds: [employeeId],
    });

    assert.equal(assignResult.count, 1);

    const myTrainings = await DevelopmentService.getMyTrainings(employeeId);
    assert.equal(myTrainings.length, 1);
    assert.equal(myTrainings[0].status, 'PENDENTE');
    empTrainingId = myTrainings[0].id;
  });

  it('deve realizar upload de certificado e calcular data de expiração (expiresAt)', async () => {
    const updated = await DevelopmentService.uploadCertificate(empTrainingId, {
      certificateUrl: 'https://storage.atrio.com.br/certificados/lgpd_2026.pdf',
    });

    assert.equal(updated.status, 'CONCLUIDO');
    assert.ok(updated.completedAt);
    assert.ok(updated.expiresAt);
    assert.equal(updated.certificateUrl, 'https://storage.atrio.com.br/certificados/lgpd_2026.pdf');
  });

  it('deve registrar uma sessão de feedback 1:1 com acordos combinados', async () => {
    const feedback = await DevelopmentService.createFeedback(userId, {
      employeeId,
      feedbackType: 'REUNIAO_1ON1',
      subject: 'Alinhamento Trimestral de Performance',
      content: 'Discutidos pontos fortes em entregas técnicas e oportunidades em mentoria de novos devs.',
      actionItems: [
        { task: 'Concluir curso de Arquitetura de Software', deadline: '2026-10-30', completed: false },
      ],
      visibility: 'PRIVATE_MANAGER_EMPLOYEE',
    });

    assert.ok(feedback.id);
    assert.equal(feedback.subject, 'Alinhamento Trimestral de Performance');
    feedbackId = feedback.id;

    const myFeedbacks = await DevelopmentService.getMyFeedbacks(userId, employeeId);
    assert.ok(myFeedbacks.length >= 1);
  });

  it('deve criar um PDI com metas de carreira e atualizar evidências de conclusão', async () => {
    const plan = await DevelopmentService.createDevelopmentPlan({
      employeeId,
      title: 'PDI 2026 - Evolução para Especialista',
      periodYear: 2026,
    });

    assert.ok(plan.id);
    planId = plan.id;

    const goal = await DevelopmentService.addGoalToPlan(planId, {
      title: 'Dominar Arquitetura Limpa e Microserviços',
      competency: 'Conhecimento Técnico Avançado',
      targetDate: '2026-11-30',
      actionSteps: 'Estudar padrões DDD e implementar serviço desacoplado.',
    });

    assert.ok(goal.id);
    goalId = goal.id;

    const updatedGoal = await DevelopmentService.updateGoal(goalId, {
      status: 'CONCLUIDO',
      evidenceNotes: 'Módulo de onboarding refatorado com cobertura de testes 100%.',
    });

    assert.equal(updatedGoal.status, 'CONCLUIDO');
    assert.equal(updatedGoal.evidenceNotes, 'Módulo de onboarding refatorado com cobertura de testes 100%.');
  });
});
