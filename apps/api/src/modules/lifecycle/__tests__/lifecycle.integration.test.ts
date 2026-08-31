import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma';
import { LifecycleService } from '../services/lifecycle.service';

describe('Processos de Onboarding e Offboarding Integration Flow', () => {
  let userId: string;
  let employeeId: string;
  let processId: string;

  before(async () => {
    // 1. Usuário criador
    const user = await prisma.user.create({
      data: {
        email: `lifecycle_initiator_${Date.now()}@atrio.com.br`,
        passwordHash: 'hashed_pw',
      },
    });
    userId = user.id;

    // 2. Empresa e Colaborador para Onboarding
    const company = await prisma.company.create({
      data: {
        legalName: 'Átrio Onboarding S.A.',
        tradeName: 'Átrio Onboarding',
        cnpj: `66.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });

    const employee = await prisma.employee.create({
      data: {
        companyId: company.id,
        name: 'Novo Colaborador Admitido',
        registrationNumber: `ONB-${Date.now()}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        email: `onb_${Date.now()}@atrio.com.br`,
        admissionDate: new Date('2026-09-01'),
        contractType: 'CLT',
        status: 'ATIVO',
      },
    });
    employeeId = employee.id;
  });

  after(async () => {
    if (userId) {
      await prisma.lifecycleTask.deleteMany({ where: { processId } });
      await prisma.lifecycleProcess.deleteMany({ where: { employeeId } });
      await prisma.employee.deleteMany({ where: { id: employeeId } });
      await prisma.company.deleteMany({ where: { tradeName: 'Átrio Onboarding' } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it('deve instanciar um novo processo de Onboarding a partir do template padrão', async () => {
    const process = await LifecycleService.createProcess(userId, {
      employeeId,
      processType: 'ONBOARDING',
      targetDate: '2026-09-01',
    });

    assert.ok(process.id);
    assert.equal(process.processType, 'ONBOARDING');
    assert.equal(process.status, 'EM_ANDAMENTO');
    assert.ok(process.totalTasks >= 5);
    assert.equal(process.completedTasks, 0);
    assert.equal(process.progressPercentage, 0);
    processId = process.id;
  });

  it('deve listar o processo no painel de acompanhamento (GET /lifecycle-processes)', async () => {
    const list = await LifecycleService.getProcesses({ processType: 'ONBOARDING' });
    assert.ok(list.data.length >= 1);
    const item = list.data.find((p) => p.id === processId);
    assert.ok(item);
    assert.equal(item?.employee.name, 'Novo Colaborador Admitido');
  });

  it('deve agrupar as tarefas por área responsável (RH, TI, Facilities, Gestor)', async () => {
    const detail = await LifecycleService.getProcessById(processId);
    assert.ok(detail.groupedTasks.RH.length > 0);
    assert.ok(detail.groupedTasks.TI.length > 0);
  });

  it('deve concluir tarefas e atualizar o status do processo para CONCLUIDO automaticamente', async () => {
    const detail = await LifecycleService.getProcessById(processId);
    const tasks = detail.tasks;

    // Concluir todas as tarefas exceto a última
    for (let i = 0; i < tasks.length - 1; i++) {
      await LifecycleService.completeTask(tasks[i].id, userId, 'Tarefa executada no prazo.');
    }

    const processMid = await LifecycleService.getProcessById(processId);
    assert.equal(processMid.status, 'EM_ANDAMENTO');

    // Concluir a última tarefa
    const lastTask = tasks[tasks.length - 1];
    await LifecycleService.completeTask(lastTask.id, userId, 'Última tarefa finalizada.');

    const processFinal = await LifecycleService.getProcessById(processId);
    assert.equal(processFinal.status, 'CONCLUIDO');
    assert.ok(processFinal.completedAt);
    assert.equal(processFinal.progressPercentage, 100);
  });
});
