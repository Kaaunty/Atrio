/**
 * SEED GERAL — ÁTRIO RH
 * ============================================================
 * Popula todo o banco com dados realistas cobrindo todos os
 * módulos implementados (Etapas 00–08).
 *
 * Execução:
 *   npx tsx prisma/seed.ts
 *
 * Credenciais padrão: Atrio@2026
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Retorna todos os dias úteis (Seg–Sex) de Agosto/2026 */
function getWorkingDaysAugust2026(): Date[] {
  const days: Date[] = [];
  for (let d = 1; d <= 31; d++) {
    const date = new Date(Date.UTC(2026, 7, d));
    const dow = date.getUTCDay();
    if (dow >= 1 && dow <= 5) days.push(date);
  }
  return days;
}

/** Dias sem expediente (feriados / folgas) */
const DAYS_OFF = new Set(['2026-08-07', '2026-08-21']);

/** Configuração de batidas e saldo por tipo de dia */
function getDayConfig(date: Date) {
  const dow = date.getUTCDay();
  const base = date.toISOString().substring(0, 10);
  const ts = (h: number, m: number) =>
    new Date(`${base}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`);

  if (dow === 5) {
    // Sexta-feira — 7h (08:00–12:00 / 13:00–16:00)
    return { timestamps: [ts(8, 0), ts(12, 0), ts(13, 0), ts(16, 0)], expected: 420, actual: 420, extra: 0 };
  }
  if (dow === 2 || dow === 4) {
    // Terça / Quinta — hora extra (saída 19:00)
    return { timestamps: [ts(8, 0), ts(12, 0), ts(13, 0), ts(19, 0)], expected: 480, actual: 600, extra: 120 };
  }
  // Segunda / Quarta — 8h padrão (08:00–12:00 / 13:00–17:00)
  return { timestamps: [ts(8, 0), ts(12, 0), ts(13, 0), ts(17, 0)], expected: 480, actual: 480, extra: 0 };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seed Geral — Átrio RH');
  console.log('══════════════════════════════════════════\n');

  // ──────────────────────────────────────────
  // RESET — ordem inversa das FKs
  // ──────────────────────────────────────────
  console.log('🗑️  Limpando banco de dados...');

  await prisma.vacationRequest.deleteMany();
  await prisma.vacationPeriod.deleteMany();
  await prisma.requestAttachment.deleteMany();
  await prisma.requestHistory.deleteMany();
  await prisma.request.deleteMany();
  await prisma.requestWorkflowStep.deleteMany();
  await prisma.requestWorkflow.deleteMany();
  await prisma.requestType.deleteMany();
  await prisma.timeClockAdjustment.deleteMany();
  await prisma.timeBalance.deleteMany();
  await prisma.timeDailySummary.deleteMany();
  await prisma.timeClockSyncLog.deleteMany();
  await prisma.timeClockEntry.deleteMany();
  await prisma.timeClockDevice.deleteMany();
  await prisma.integrationConfig.deleteMany();
  await prisma.employeeHistory.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.position.deleteMany();
  // Desvincular hierarquia antes de deletar departamentos
  await prisma.department.updateMany({ data: { parentId: null } });
  await prisma.department.deleteMany();
  await prisma.workSchedule.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.company.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  console.log('✅ Banco limpo.\n');

  // ══════════════════════════════════════════
  // 1. EMPRESA
  // ══════════════════════════════════════════
  console.log('🏢 [1/14] Criando empresa...');

  const company = await prisma.company.create({
    data: {
      legalName: 'Átrio Soluções em Tecnologia Ltda.',
      tradeName: 'Átrio RH',
      cnpj: '12.345.678/0001-90',
    },
  });

  // ══════════════════════════════════════════
  // 2. UNIDADES
  // ══════════════════════════════════════════
  console.log('📍 [2/14] Criando unidades...');

  const unitMatriz = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: 'Matriz — São Paulo',
      city: 'São Paulo',
      state: 'SP',
      address: 'Av. Paulista, 1000 — Bela Vista, São Paulo/SP',
    },
  });

  const unitFilial = await prisma.unit.create({
    data: {
      companyId: company.id,
      name: 'Filial Sul — Curitiba',
      city: 'Curitiba',
      state: 'PR',
      address: 'R. XV de Novembro, 500 — Centro, Curitiba/PR',
    },
  });

  // ══════════════════════════════════════════
  // 3. DEPARTAMENTOS
  // ══════════════════════════════════════════
  console.log('🏗️  [3/14] Criando departamentos...');

  const deptDir = await prisma.department.create({
    data: { companyId: company.id, name: 'Diretoria', code: 'DIR', costCenter: 'CC-001' },
  });
  const deptRH = await prisma.department.create({
    data: { companyId: company.id, name: 'Recursos Humanos', code: 'RH', costCenter: 'CC-002', parentId: deptDir.id },
  });
  const deptTI = await prisma.department.create({
    data: { companyId: company.id, name: 'Tecnologia da Informação', code: 'TI', costCenter: 'CC-003', parentId: deptDir.id },
  });
  const deptOps = await prisma.department.create({
    data: { companyId: company.id, name: 'Operações', code: 'OPS', costCenter: 'CC-004', parentId: deptDir.id },
  });
  const deptAdm = await prisma.department.create({
    data: { companyId: company.id, name: 'Administrativo e Financeiro', code: 'ADM', costCenter: 'CC-005', parentId: deptDir.id },
  });

  // ══════════════════════════════════════════
  // 4. CARGOS
  // ══════════════════════════════════════════
  console.log('💼 [4/14] Criando cargos...');

  const [posDir, posGerRH, posAnalRH, posTechLead, posDevSr, posDevPl, posAnalTI, posCoordOps, posAssistAdm, posEstagTI] =
    await Promise.all([
      prisma.position.create({ data: { departmentId: deptDir.id, title: 'Diretor Geral', level: 'DIRETORIA', description: 'Gestão estratégica da empresa.' } }),
      prisma.position.create({ data: { departmentId: deptRH.id, title: 'Gerente de Recursos Humanos', level: 'GERENCIA', description: 'Gestão do departamento de RH e políticas de pessoas.' } }),
      prisma.position.create({ data: { departmentId: deptRH.id, title: 'Analista de RH', level: 'ANALISTA', description: 'Suporte operacional de RH, admissões e benefícios.' } }),
      prisma.position.create({ data: { departmentId: deptTI.id, title: 'Tech Lead', level: 'LIDERANCA', description: 'Liderança técnica do time de desenvolvimento.' } }),
      prisma.position.create({ data: { departmentId: deptTI.id, title: 'Desenvolvedor Senior', level: 'SENIOR', description: 'Desenvolvimento de sistemas e arquitetura.' } }),
      prisma.position.create({ data: { departmentId: deptTI.id, title: 'Desenvolvedor Pleno', level: 'PLENO', description: 'Desenvolvimento de features e manutenção.' } }),
      prisma.position.create({ data: { departmentId: deptTI.id, title: 'Analista de TI', level: 'ANALISTA', description: 'Suporte técnico e infraestrutura.' } }),
      prisma.position.create({ data: { departmentId: deptOps.id, title: 'Coordenador de Operações', level: 'COORDENACAO', description: 'Coordenação das operações internas.' } }),
      prisma.position.create({ data: { departmentId: deptAdm.id, title: 'Assistente Administrativo', level: 'ASSISTENTE', description: 'Suporte administrativo e financeiro.' } }),
      prisma.position.create({ data: { departmentId: deptTI.id, title: 'Estagiário de TI', level: 'ESTAGIO', description: 'Suporte em desenvolvimento e projetos internos.' } }),
    ]);

  // ══════════════════════════════════════════
  // 5. ESCALA DE TRABALHO
  // ══════════════════════════════════════════
  console.log('⏱️  [5/14] Criando escala de trabalho...');

  const workSchedule = await prisma.workSchedule.create({
    data: {
      name: 'Administrativo 44h — Seg a Sex',
      description: 'Jornada de segunda a sexta com redução às sextas-feiras.',
      weeklyHours: 44,
      toleranceMinutes: 10,
      lunchIntervalMinutes: 60,
      flexibleInterval: true,
      scheduleRules: [
        { dayOfWeek: 0, isWorkDay: false },
        { dayOfWeek: 1, isWorkDay: true, startTime: '08:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00', expectedMinutes: 480 },
        { dayOfWeek: 2, isWorkDay: true, startTime: '08:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00', expectedMinutes: 480 },
        { dayOfWeek: 3, isWorkDay: true, startTime: '08:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00', expectedMinutes: 480 },
        { dayOfWeek: 4, isWorkDay: true, startTime: '08:00', endTime: '17:00', lunchStart: '12:00', lunchEnd: '13:00', expectedMinutes: 480 },
        { dayOfWeek: 5, isWorkDay: true, startTime: '08:00', endTime: '16:00', lunchStart: '12:00', lunchEnd: '13:00', expectedMinutes: 420 },
        { dayOfWeek: 6, isWorkDay: false },
      ],
    },
  });

  // ══════════════════════════════════════════
  // 6. RBAC — ROLES + PERMISSÕES
  // ══════════════════════════════════════════
  console.log('🔐 [6/14] Criando roles e permissões...');

  const [roleAdmin, roleRH, roleGestor, roleColab] = await Promise.all([
    prisma.role.create({ data: { name: 'ADMIN', description: 'Administrador com acesso total ao sistema.', isSystemDefault: true } }),
    prisma.role.create({ data: { name: 'RH', description: 'Equipe de Recursos Humanos com acesso gerencial.', isSystemDefault: true } }),
    prisma.role.create({ data: { name: 'GESTOR', description: 'Gestor de equipe com acesso aos subordinados.', isSystemDefault: true } }),
    prisma.role.create({ data: { name: 'COLABORADOR', description: 'Colaborador padrão com acesso próprio.', isSystemDefault: true } }),
  ]);

  const permDefs = [
    { code: 'ponto.visualizar',       name: 'Visualizar Ponto',           module: 'ponto',        description: 'Visualizar espelho de ponto e banco de horas.' },
    { code: 'ponto.ajustar',          name: 'Solicitar Ajuste de Ponto',  module: 'ponto',        description: 'Solicitar ajuste/correção de marcações.' },
    { code: 'ponto.aprovar',          name: 'Aprovar Ajuste de Ponto',    module: 'ponto',        description: 'Aprovar ou rejeitar solicitações de ajuste.' },
    { code: 'colaborador.visualizar', name: 'Visualizar Colaboradores',   module: 'colaboradores',description: 'Listar e visualizar dados de colaboradores.' },
    { code: 'colaborador.gerenciar',  name: 'Gerenciar Colaboradores',    module: 'colaboradores',description: 'Criar, editar e desligar colaboradores.' },
    { code: 'ferias.solicitar',       name: 'Solicitar Férias',           module: 'ferias',       description: 'Criar solicitação de férias.' },
    { code: 'ferias.aprovar',         name: 'Aprovar Férias (Gestor)',     module: 'ferias',       description: 'Aprovar solicitações de férias da equipe.' },
    { code: 'ferias.gerenciar',       name: 'Gerenciar Férias (RH)',      module: 'ferias',       description: 'Homologar e gerenciar férias de todos.' },
    { code: 'solicitacoes.criar',     name: 'Criar Solicitações',         module: 'solicitacoes', description: 'Abrir novas solicitações na central.' },
    { code: 'solicitacoes.aprovar',   name: 'Aprovar Solicitações',       module: 'solicitacoes', description: 'Avaliar e aprovar/rejeitar solicitações.' },
    { code: 'org.gerenciar',          name: 'Gerenciar Estrutura Org.',   module: 'organizacao',  description: 'Criar e editar empresas, unidades e setores.' },
    { code: 'rbac.gerenciar',         name: 'Gerenciar RBAC',             module: 'rbac',         description: 'Criar e editar roles e permissões.' },
    { code: 'auditoria.visualizar',   name: 'Visualizar Auditoria',       module: 'auditoria',    description: 'Consultar trilha de auditoria e logs.' },
  ];

  const permissions = await Promise.all(permDefs.map((p) => prisma.permission.create({ data: p })));
  const perm = Object.fromEntries(permissions.map((p) => [p.code, p]));

  // ADMIN — todas as permissões (escopo ALL)
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.create({ data: { roleId: roleAdmin.id, permissionId: p.id, scope: 'ALL' } })
    )
  );
  // RH — acesso gerencial (ALL)
  for (const code of ['ponto.visualizar','ponto.aprovar','colaborador.visualizar','colaborador.gerenciar','ferias.gerenciar','ferias.aprovar','solicitacoes.aprovar','auditoria.visualizar']) {
    await prisma.rolePermission.create({ data: { roleId: roleRH.id, permissionId: perm[code].id, scope: 'ALL' } });
  }
  // GESTOR — acesso à equipe (TEAM)
  for (const code of ['ponto.visualizar','ponto.aprovar','colaborador.visualizar','ferias.aprovar','solicitacoes.aprovar']) {
    await prisma.rolePermission.create({ data: { roleId: roleGestor.id, permissionId: perm[code].id, scope: 'TEAM' } });
  }
  // COLABORADOR — acesso próprio (SELF)
  for (const code of ['ponto.visualizar','ponto.ajustar','ferias.solicitar','solicitacoes.criar']) {
    await prisma.rolePermission.create({ data: { roleId: roleColab.id, permissionId: perm[code].id, scope: 'SELF' } });
  }

  // ══════════════════════════════════════════
  // 7. COLABORADORES
  // ══════════════════════════════════════════
  console.log('👥 [7/14] Criando colaboradores...');

  const empBase = {
    companyId: company.id,
    unitId: unitMatriz.id,
    contractType: 'CLT' as const,
    workScheduleId: workSchedule.id,
    status: 'ATIVO' as const,
  };

  const empRodrigo = await prisma.employee.create({ data: { ...empBase, code: 'ATR-001', registrationNumber: '001', name: 'Rodrigo Almeida', cpf: '123.456.789-00', email: 'rodrigo.almeida@atrio.com.br', phone: '(11) 99901-0001', birthDate: new Date('1980-03-15'), salary: 25000, departmentId: deptDir.id, positionId: posDir.id, admissionDate: new Date('2020-01-02') } });
  const empCamila = await prisma.employee.create({ data: { ...empBase, code: 'ATR-002', registrationNumber: '002', name: 'Camila Ferreira', cpf: '234.567.890-11', email: 'camila.ferreira@atrio.com.br', phone: '(11) 99901-0002', birthDate: new Date('1987-07-22'), salary: 12000, departmentId: deptRH.id, positionId: posGerRH.id, managerId: empRodrigo.id, admissionDate: new Date('2021-03-01') } });
  const empFelipe = await prisma.employee.create({ data: { ...empBase, code: 'ATR-003', registrationNumber: '003', name: 'Felipe Souza', cpf: '345.678.901-22', email: 'felipe.souza@atrio.com.br', phone: '(11) 99901-0003', birthDate: new Date('1985-11-10'), salary: 15000, departmentId: deptTI.id, positionId: posTechLead.id, managerId: empRodrigo.id, admissionDate: new Date('2021-06-15') } });
  const empAna = await prisma.employee.create({ data: { ...empBase, code: 'ATR-004', registrationNumber: '004', name: 'Ana Paula Lima', cpf: '456.789.012-33', email: 'ana.lima@atrio.com.br', phone: '(11) 99901-0004', birthDate: new Date('1992-04-05'), salary: 6500, departmentId: deptRH.id, positionId: posAnalRH.id, managerId: empCamila.id, admissionDate: new Date('2022-02-07') } });
  const empBruno = await prisma.employee.create({ data: { ...empBase, code: 'ATR-005', registrationNumber: '005', name: 'Bruno Martins', cpf: '567.890.123-44', email: 'bruno.martins@atrio.com.br', phone: '(11) 99901-0005', birthDate: new Date('1990-08-19'), salary: 11000, departmentId: deptTI.id, positionId: posDevSr.id, managerId: empFelipe.id, admissionDate: new Date('2022-05-02') } });
  const empJuliana = await prisma.employee.create({ data: { ...empBase, code: 'ATR-006', registrationNumber: '006', name: 'Juliana Costa', cpf: '678.901.234-55', email: 'juliana.costa@atrio.com.br', phone: '(11) 99901-0006', birthDate: new Date('1994-01-28'), salary: 8500, departmentId: deptTI.id, positionId: posDevPl.id, managerId: empFelipe.id, admissionDate: new Date('2023-01-09') } });
  const empRafael = await prisma.employee.create({ data: { ...empBase, code: 'ATR-007', registrationNumber: '007', name: 'Rafael Gomes', cpf: '789.012.345-66', email: 'rafael.gomes@atrio.com.br', phone: '(41) 99901-0007', birthDate: new Date('1993-06-14'), salary: 7000, unitId: unitFilial.id, departmentId: deptTI.id, positionId: posAnalTI.id, managerId: empFelipe.id, admissionDate: new Date('2023-04-03') } });
  const empLeticia = await prisma.employee.create({ data: { ...empBase, code: 'ATR-008', registrationNumber: '008', name: 'Letícia Nunes', cpf: '890.123.456-77', email: 'leticia.nunes@atrio.com.br', phone: '(11) 99901-0008', birthDate: new Date('1988-09-30'), salary: 9000, departmentId: deptOps.id, positionId: posCoordOps.id, managerId: empRodrigo.id, admissionDate: new Date('2021-08-16') } });
  const empDiego = await prisma.employee.create({ data: { ...empBase, code: 'ATR-009', registrationNumber: '009', name: 'Diego Carvalho', cpf: '901.234.567-88', email: 'diego.carvalho@atrio.com.br', phone: '(11) 99901-0009', birthDate: new Date('1997-12-03'), salary: 3500, departmentId: deptAdm.id, positionId: posAssistAdm.id, managerId: empLeticia.id, admissionDate: new Date('2024-01-15') } });
  const empMarina = await prisma.employee.create({ data: { ...empBase, code: 'ATR-010', registrationNumber: '010', name: 'Marina Teixeira', cpf: '012.345.678-99', email: 'marina.teixeira@atrio.com.br', phone: '(11) 99901-0010', birthDate: new Date('2003-05-20'), salary: 1800, departmentId: deptTI.id, positionId: posEstagTI.id, managerId: empFelipe.id, contractType: 'ESTAGIO', admissionDate: new Date('2025-02-03') } });

  // ══════════════════════════════════════════
  // 8. USUÁRIOS
  // ══════════════════════════════════════════
  console.log('🔑 [8/14] Criando usuários...');

  const passwordHash = await bcrypt.hash('Atrio@2026', 10);

  const userDefs = [
    { email: 'admin@atrio.com.br',   employeeId: empRodrigo.id, roles: [roleAdmin, roleColab] },
    { email: 'camila@atrio.com.br',  employeeId: empCamila.id,  roles: [roleRH, roleGestor, roleColab] },
    { email: 'felipe@atrio.com.br',  employeeId: empFelipe.id,  roles: [roleGestor, roleColab] },
    { email: 'ana@atrio.com.br',     employeeId: empAna.id,     roles: [roleRH, roleColab] },
    { email: 'bruno@atrio.com.br',   employeeId: empBruno.id,   roles: [roleColab] },
    { email: 'juliana@atrio.com.br', employeeId: empJuliana.id, roles: [roleColab] },
    { email: 'rafael@atrio.com.br',  employeeId: empRafael.id,  roles: [roleColab] },
    { email: 'leticia@atrio.com.br', employeeId: empLeticia.id, roles: [roleGestor, roleColab] },
    { email: 'diego@atrio.com.br',   employeeId: empDiego.id,   roles: [roleColab] },
    { email: 'marina@atrio.com.br',  employeeId: empMarina.id,  roles: [roleColab] },
  ];

  const userMap: Record<string, { id: string }> = {};
  for (const def of userDefs) {
    const user = await prisma.user.create({
      data: {
        email: def.email,
        passwordHash,
        employeeId: def.employeeId,
        active: true,
        userRoles: { create: def.roles.map((r) => ({ roleId: r.id })) },
      },
    });
    userMap[def.email] = user;
  }

  // ══════════════════════════════════════════
  // 9. INTEGRAÇÃO CONTROL iD + DISPOSITIVO
  // ══════════════════════════════════════════
  console.log('📡 [9/14] Criando integração e dispositivo de ponto...');

  const integration = await prisma.integrationConfig.create({
    data: {
      key: 'control_id',
      name: 'Control iD (iDClass / iDFit / iDAccess)',
      category: 'TIME_CLOCK',
      description: 'Integração com relógios de ponto Control iD via API REST.',
      enabled: true,
      status: 'ACTIVE',
      settings: { baseUrl: 'http://192.168.1.100', apiToken: 'seed-token-atrio-2026', syncIntervalMinutes: 30, autoSync: true },
      lastSyncAt: new Date('2026-08-30T08:00:00Z'),
    },
  });

  const device = await prisma.timeClockDevice.create({
    data: {
      integrationId: integration.id,
      name: 'iDAccess — Entrada Matriz SP',
      ipAddress: '192.168.1.100',
      port: 80,
      serialNumber: 'CID-2024-SP-001',
      model: 'iDAccess',
      unitId: unitMatriz.id,
      active: true,
      lastSyncAt: new Date('2026-08-30T08:00:00Z'),
    },
  });

  // Log de sincronização demo
  await prisma.timeClockSyncLog.create({
    data: {
      integrationId: integration.id,
      deviceId: device.id,
      startedAt: new Date('2026-08-30T08:00:00Z'),
      finishedAt: new Date('2026-08-30T08:00:45Z'),
      totalRecords: 36,
      importedRecords: 36,
      ignoredRecords: 0,
      unmappedRecords: 0,
      errorCount: 0,
      status: 'SUCCESS',
      triggeredBy: 'CRON_SCHEDULE',
    },
  });

  // ══════════════════════════════════════════
  // 10. PONTO ELETRÔNICO — AGOSTO 2026
  // ══════════════════════════════════════════
  console.log('⏰ [10/14] Gerando batidas de ponto (Agosto/2026)...');

  // Colaboradores CLT com ponto no dispositivo (exclui Marina — estagiária)
  const timeClockEmps = [empRodrigo, empCamila, empFelipe, empAna, empBruno, empJuliana, empRafael, empLeticia, empDiego];
  const workingDays = getWorkingDaysAugust2026();
  let totalEntries = 0;

  for (const emp of timeClockEmps) {
    let monthCredits = 0;
    let monthDebits = 0;

    for (const day of workingDays) {
      const dayStr = day.toISOString().substring(0, 10);

      if (DAYS_OFF.has(dayStr)) {
        // Folga — só o resumo sem batidas
        await prisma.timeDailySummary.create({
          data: {
            employeeId: emp.id,
            date: day,
            expectedWorkMinutes: 0,
            actualWorkMinutes: 0,
            balanceMinutes: 0,
            extraHoursMinutes: 0,
            delayMinutes: 0,
            absenceMinutes: 0,
            entries: [],
            status: 'FOLGA',
          },
        });
        continue;
      }

      const cfg = getDayConfig(day);

      // Batidas do dia (4 marcações por colaborador)
      const entryRecords = cfg.timestamps.map((ts) => ({
        employeeId: emp.id,
        registrationNumber: emp.registrationNumber,
        timestamp: ts,
        deviceId: device.id,
        source: 'CONTROL_ID_API' as const,
        hash: sha256(`${emp.id}:${ts.toISOString()}`),
        rawPayload: { person: emp.registrationNumber, device: device.serialNumber },
      }));

      await prisma.timeClockEntry.createMany({ data: entryRecords });
      totalEntries += entryRecords.length;

      // Acumular saldo mensal
      const balance = cfg.actual - cfg.expected;
      if (balance > 0) monthCredits += balance;
      else if (balance < 0) monthDebits += Math.abs(balance);

      // Resumo diário calculado
      await prisma.timeDailySummary.create({
        data: {
          employeeId: emp.id,
          date: day,
          expectedWorkMinutes: cfg.expected,
          actualWorkMinutes: cfg.actual,
          balanceMinutes: balance,
          extraHoursMinutes: cfg.extra,
          delayMinutes: 0,
          absenceMinutes: 0,
          entries: entryRecords.map((e) => ({
            time: e.timestamp.toISOString(),
            source: e.source,
            hash: e.hash,
          })),
          status: 'OK',
        },
      });
    }

    // Saldo mensal consolidado
    await prisma.timeBalance.create({
      data: {
        employeeId: emp.id,
        yearMonth: '2026-08',
        startingBalanceMinutes: 0,
        totalCreditsMinutes: monthCredits,
        totalDebitsMinutes: monthDebits,
        manualAdjustmentsMinutes: 0,
        closingBalanceMinutes: monthCredits - monthDebits,
        isClosed: false,
      },
    });
  }

  console.log(`   ✅ ${totalEntries} batidas criadas para ${timeClockEmps.length} colaboradores.`);

  // ══════════════════════════════════════════
  // 11. AJUSTES DE PONTO
  // ══════════════════════════════════════════
  console.log('📝 [11/14] Criando ajustes de ponto...');

  // Pendente de aprovação do gestor
  await prisma.timeClockAdjustment.create({
    data: {
      employeeId: empBruno.id,
      date: new Date('2026-08-19'),
      adjustmentType: 'INCLUSAO',
      targetTime: '08:05',
      reason: 'Esquecimento de crachá na entrada.',
      notes: 'Colaborador esteve presente conforme confirmação do gestor.',
      status: 'PENDENTE_GESTOR',
      managerId: empFelipe.id,
    },
  });

  // Já aprovado pelo gestor
  await prisma.timeClockAdjustment.create({
    data: {
      employeeId: empJuliana.id,
      date: new Date('2026-08-14'),
      adjustmentType: 'INCLUSAO',
      targetTime: '18:30',
      reason: 'Atendimento externo ao cliente após encerramento do expediente.',
      status: 'APROVADO',
      managerId: empFelipe.id,
      managerActionAt: new Date('2026-08-15T10:00:00Z'),
      managerNotes: 'Confirmado com o cliente. Ajuste autorizado.',
    },
  });

  // ══════════════════════════════════════════
  // 12. TIPOS DE SOLICITAÇÃO + WORKFLOWS
  // ══════════════════════════════════════════
  console.log('📋 [12/14] Criando tipos de solicitação e workflows...');

  const [rtDeclIR, , rtEquipamento, rtHomeOffice] = await Promise.all([
    prisma.requestType.create({ data: { code: 'DECL_IR',    name: 'Declaração de Imposto de Renda',   description: 'Informe de rendimentos para declaração anual de IR.',                       category: 'DECLARACOES', icon: 'FileText', allowAttachments: false } }),
    prisma.requestType.create({ data: { code: 'ALT_DADOS',  name: 'Alteração de Dados Cadastrais',    description: 'Atualização de endereço, contato, banco e dados pessoais.',               category: 'CADASTRO',    icon: 'UserPen',  allowAttachments: true  } }),
    prisma.requestType.create({ data: { code: 'EQUIPAMENTO',name: 'Solicitação de Equipamento',       description: 'Pedido de equipamentos de trabalho (notebook, monitor, periféricos).',    category: 'GERAL',       icon: 'Laptop',   allowAttachments: false } }),
    prisma.requestType.create({ data: { code: 'HOME_OFFICE',name: 'Solicitação de Home Office',       description: 'Autorização para trabalho remoto em período determinado.',                 category: 'GERAL',       icon: 'Home',     allowAttachments: false } }),
  ]);

  const [wfDeclIR, , wfEquipamento, wfHomeOffice] = await Promise.all([
    prisma.requestWorkflow.create({
      data: {
        requestTypeId: rtDeclIR.id,
        name: 'Fluxo Declaração IR — Colaborador → RH',
        steps: { create: [{ stepOrder: 1, name: 'Homologação RH', approverType: 'SPECIFIC_ROLE', requiredRoleId: roleRH.id, timeoutDays: 5 }] },
      },
    }),
    prisma.requestWorkflow.create({
      data: {
        requestTypeId: (await prisma.requestType.findUnique({ where: { code: 'ALT_DADOS' } }))!.id,
        name: 'Fluxo Alteração de Dados — Colaborador → RH',
        steps: { create: [{ stepOrder: 1, name: 'Validação RH', approverType: 'SPECIFIC_ROLE', requiredRoleId: roleRH.id, timeoutDays: 3 }] },
      },
    }),
    prisma.requestWorkflow.create({
      data: {
        requestTypeId: rtEquipamento.id,
        name: 'Fluxo Equipamento — Colaborador → Gestor → RH',
        steps: {
          create: [
            { stepOrder: 1, name: 'Aprovação do Gestor',   approverType: 'DIRECT_MANAGER',  timeoutDays: 3 },
            { stepOrder: 2, name: 'Aquisição pelo RH/ADM', approverType: 'SPECIFIC_ROLE', requiredRoleId: roleRH.id, timeoutDays: 7 },
          ],
        },
      },
    }),
    prisma.requestWorkflow.create({
      data: {
        requestTypeId: rtHomeOffice.id,
        name: 'Fluxo Home Office — Colaborador → Gestor',
        steps: { create: [{ stepOrder: 1, name: 'Aprovação do Gestor', approverType: 'DIRECT_MANAGER', timeoutDays: 2 }] },
      },
    }),
  ]);

  // ══════════════════════════════════════════
  // 13. SOLICITAÇÕES
  // ══════════════════════════════════════════
  console.log('📨 [13/14] Criando solicitações...');

  // SOL-2026-00001 — Diego → Decl. IR → APROVADO
  const req1 = await prisma.request.create({
    data: {
      requestNumber: 'SOL-2026-00001',
      requestTypeId: rtDeclIR.id,
      workflowId: wfDeclIR.id,
      requesterId: empDiego.id,
      priority: 'MEDIA',
      status: 'APROVADO',
      title: 'Informe de Rendimentos 2025 — Diego Carvalho',
      description: 'Necessito do informe de rendimentos referente ao ano-base 2025 para declaração do IR.',
      currentStepOrder: 1,
      closedAt: new Date('2026-08-20T14:30:00Z'),
    },
  });
  await prisma.requestHistory.createMany({
    data: [
      { requestId: req1.id, actorId: userMap['diego@atrio.com.br'].id,  action: 'CRIADA',  toStatus: 'ABERTO',   stepName: 'Abertura',        comment: 'Solicitação criada pelo colaborador.' },
      { requestId: req1.id, actorId: userMap['camila@atrio.com.br'].id, action: 'APROVADA', fromStatus: 'ABERTO', toStatus: 'APROVADO', stepName: 'Homologação RH', comment: 'Informe gerado e enviado por e-mail ao colaborador.' },
    ],
  });

  // SOL-2026-00002 — Bruno → Equipamento → AGUARDANDO_GESTOR
  const req2 = await prisma.request.create({
    data: {
      requestNumber: 'SOL-2026-00002',
      requestTypeId: rtEquipamento.id,
      workflowId: wfEquipamento.id,
      requesterId: empBruno.id,
      currentAssigneeId: empFelipe.id,
      priority: 'ALTA',
      status: 'AGUARDANDO_GESTOR',
      title: 'Notebook Dell — Substituição por defeito técnico',
      description: 'Meu notebook atual apresenta defeito na placa de vídeo há 3 dias. Solicito substituição urgente.',
      currentStepOrder: 1,
      formData: { item: 'Notebook Dell XPS 15', justificativa: 'Defeito na placa de vídeo', urgencia: true },
    },
  });
  await prisma.requestHistory.create({
    data: { requestId: req2.id, actorId: userMap['bruno@atrio.com.br'].id, action: 'CRIADA', toStatus: 'AGUARDANDO_GESTOR', stepName: 'Aprovação do Gestor', comment: 'Aguardando aprovação do Tech Lead.' },
  });

  // SOL-2026-00003 — Juliana → Home Office → APROVADO
  const req3 = await prisma.request.create({
    data: {
      requestNumber: 'SOL-2026-00003',
      requestTypeId: rtHomeOffice.id,
      workflowId: wfHomeOffice.id,
      requesterId: empJuliana.id,
      priority: 'BAIXA',
      status: 'APROVADO',
      title: 'Home Office — Semana de 01/09 a 05/09/2026',
      description: 'Solicitação de trabalho remoto para a semana de 01 a 05 de setembro (reforma residencial).',
      currentStepOrder: 1,
      closedAt: new Date('2026-08-25T09:00:00Z'),
    },
  });
  await prisma.requestHistory.createMany({
    data: [
      { requestId: req3.id, actorId: userMap['juliana@atrio.com.br'].id, action: 'CRIADA',  toStatus: 'ABERTO',   stepName: 'Abertura' },
      { requestId: req3.id, actorId: userMap['felipe@atrio.com.br'].id,  action: 'APROVADA', fromStatus: 'ABERTO', toStatus: 'APROVADO', stepName: 'Aprovação do Gestor', comment: 'Aprovado. Bom trabalho remoto!' },
    ],
  });

  // SOL-2026-00004 — Rafael → Alt. Dados → ABERTO
  const req4 = await prisma.request.create({
    data: {
      requestNumber: 'SOL-2026-00004',
      requestTypeId: (await prisma.requestType.findUnique({ where: { code: 'ALT_DADOS' } }))!.id,
      requesterId: empRafael.id,
      priority: 'MEDIA',
      status: 'ABERTO',
      title: 'Atualização de endereço residencial',
      description: 'Me mudei recentemente e preciso atualizar meu endereço cadastrado no sistema.',
      currentStepOrder: 1,
      formData: { campo: 'Endereço', novoValor: 'R. das Flores, 123, Apto 42 — Água Verde, Curitiba/PR, 80.620-010' },
    },
  });
  await prisma.requestHistory.create({
    data: { requestId: req4.id, actorId: userMap['rafael@atrio.com.br'].id, action: 'CRIADA', toStatus: 'ABERTO', stepName: 'Abertura' },
  });

  // ══════════════════════════════════════════
  // 14. FÉRIAS
  // ══════════════════════════════════════════
  console.log('🏖️  [14/14] Criando períodos e solicitações de férias...');

  const vacDefs = [
    { emp: empRodrigo, adm: new Date('2020-01-02') },
    { emp: empCamila,  adm: new Date('2021-03-01') },
    { emp: empFelipe,  adm: new Date('2021-06-15') },
    { emp: empAna,     adm: new Date('2022-02-07') },
    { emp: empBruno,   adm: new Date('2022-05-02') },
    { emp: empJuliana, adm: new Date('2023-01-09') },
    { emp: empRafael,  adm: new Date('2023-04-03') },
    { emp: empLeticia, adm: new Date('2021-08-16') },
    { emp: empDiego,   adm: new Date('2024-01-15') },
  ];

  const vacPeriodMap: Record<string, { id: string }> = {};

  for (const { emp, adm } of vacDefs) {
    // Ciclo aquisitivo 2025 baseado no aniversário de admissão
    const vstStart = new Date(Date.UTC(2025, adm.getUTCMonth(), adm.getUTCDate()));
    const vstEnd   = new Date(Date.UTC(2026, adm.getUTCMonth(), adm.getUTCDate()));
    vstEnd.setUTCDate(vstEnd.getUTCDate() - 1);
    const deadline = new Date(Date.UTC(2027, adm.getUTCMonth(), adm.getUTCDate()));
    deadline.setUTCDate(deadline.getUTCDate() - 1);

    const period = await prisma.vacationPeriod.create({
      data: {
        employeeId: emp.id,
        vestingStartDate: vstStart,
        vestingEndDate: vstEnd,
        deadlineDate: deadline,
        daysEntitled: 30,
        daysTaken: 0,
        daysScheduled: 0,
        daysRemaining: 30,
        status: 'ADQUIRIDO',
      },
    });
    vacPeriodMap[emp.id] = period;
  }

  // Marina — período em aquisição / já adquirido (admissão Fev/2025)
  await prisma.vacationPeriod.create({
    data: {
      employeeId: empMarina.id,
      vestingStartDate: new Date('2025-02-03'),
      vestingEndDate:   new Date('2026-02-02'),
      deadlineDate:     new Date('2027-02-02'),
      daysEntitled: 30, daysTaken: 0, daysScheduled: 0, daysRemaining: 30,
      status: 'ADQUIRIDO',
    },
  });

  // Rodrigo — férias APROVADO (01/09–20/09, 20 dias)
  const vpRodrigo = vacPeriodMap[empRodrigo.id];
  await prisma.vacationPeriod.update({ where: { id: vpRodrigo.id }, data: { daysScheduled: 20, daysRemaining: 10 } });
  await prisma.vacationRequest.create({
    data: {
      employeeId: empRodrigo.id,
      vacationPeriodId: vpRodrigo.id,
      startDate: new Date('2026-09-01'),
      endDate:   new Date('2026-09-20'),
      daysCount: 20,
      sellDaysCount: 0,
      advanceThirteenth: false,
      notes: 'Férias de recarga após intenso primeiro semestre.',
      status: 'APROVADO',
      managerId: empRodrigo.id,
      managerActionAt: new Date('2026-08-15T11:00:00Z'),
      managerNotes: 'Aprovado pela diretoria.',
      rhUserId: userMap['camila@atrio.com.br'].id,
      rhActionAt: new Date('2026-08-16T09:30:00Z'),
      rhNotes: 'Homologado. Dentro do prazo concessivo.',
    },
  });

  // Ana Paula — férias PENDENTE_GESTOR (15/09–14/10, 30 dias)
  const vpAna = vacPeriodMap[empAna.id];
  await prisma.vacationPeriod.update({ where: { id: vpAna.id }, data: { daysScheduled: 30, daysRemaining: 0 } });
  await prisma.vacationRequest.create({
    data: {
      employeeId: empAna.id,
      vacationPeriodId: vpAna.id,
      startDate: new Date('2026-09-15'),
      endDate:   new Date('2026-10-14'),
      daysCount: 30,
      sellDaysCount: 0,
      advanceThirteenth: false,
      notes: 'Férias anuais completas.',
      status: 'PENDENTE_GESTOR',
      managerId: empCamila.id,
    },
  });

  // ══════════════════════════════════════════
  // BÔNUS: TIMELINE DE COLABORADORES
  // ══════════════════════════════════════════
  const rhUserId = userMap['camila@atrio.com.br'].id;
  await prisma.employeeHistory.createMany({
    data: [
      { employeeId: empRodrigo.id, eventType: 'ADMISSAO',           description: 'Admissão como Diretor Geral da Átrio.',                              eventDate: new Date('2020-01-02'), registeredBy: rhUserId, newData: { cargo: 'Diretor Geral', salario: 20000 } },
      { employeeId: empRodrigo.id, eventType: 'ALTERACAO_SALARIAL', description: 'Revisão salarial anual — reajuste de 25%.',                          eventDate: new Date('2025-01-15'), registeredBy: rhUserId, previousData: { salario: 20000 }, newData: { salario: 25000 } },
      { employeeId: empBruno.id,   eventType: 'ADMISSAO',           description: 'Admissão como Desenvolvedor Pleno.',                                  eventDate: new Date('2022-05-02'), registeredBy: rhUserId, newData: { cargo: 'Desenvolvedor Pleno', salario: 8000 } },
      { employeeId: empBruno.id,   eventType: 'MUDANCA_CARGO',      description: 'Promoção para Desenvolvedor Senior por desempenho excepcional.',       eventDate: new Date('2024-06-01'), registeredBy: rhUserId, previousData: { cargo: 'Desenvolvedor Pleno', salario: 9500 }, newData: { cargo: 'Desenvolvedor Senior', salario: 11000 } },
      { employeeId: empMarina.id,  eventType: 'ADMISSAO',           description: 'Início do estágio no departamento de Tecnologia da Informação.',       eventDate: new Date('2025-02-03'), registeredBy: rhUserId, newData: { cargo: 'Estagiária de TI', salario: 1800 } },
    ],
  });

  // ══════════════════════════════════════════
  // RELATÓRIO FINAL
  // ══════════════════════════════════════════
  const counts = await Promise.all([
    prisma.company.count(),
    prisma.unit.count(),
    prisma.department.count(),
    prisma.position.count(),
    prisma.employee.count(),
    prisma.user.count(),
    prisma.role.count(),
    prisma.permission.count(),
    prisma.timeClockEntry.count(),
    prisma.timeDailySummary.count(),
    prisma.timeBalance.count(),
    prisma.timeClockAdjustment.count(),
    prisma.requestType.count(),
    prisma.request.count(),
    prisma.vacationPeriod.count(),
    prisma.vacationRequest.count(),
    prisma.employeeHistory.count(),
  ]);

  console.log('\n══════════════════════════════════════════');
  console.log('✅ SEED CONCLUÍDO COM SUCESSO!');
  console.log('══════════════════════════════════════════\n');
  console.log('📊 Resumo do banco:');
  console.log(`   🏢 Empresas:              ${counts[0]}`);
  console.log(`   📍 Unidades:              ${counts[1]}`);
  console.log(`   🏗️  Departamentos:         ${counts[2]}`);
  console.log(`   💼 Cargos:                ${counts[3]}`);
  console.log(`   👥 Colaboradores:         ${counts[4]}`);
  console.log(`   🔑 Usuários:              ${counts[5]}`);
  console.log(`   🔒 Roles:                 ${counts[6]}`);
  console.log(`   🔐 Permissões:            ${counts[7]}`);
  console.log(`   ⏰ Batidas de Ponto:      ${counts[8]}`);
  console.log(`   📋 Apurações Diárias:     ${counts[9]}`);
  console.log(`   💰 Saldos Mensais:        ${counts[10]}`);
  console.log(`   📝 Ajustes de Ponto:      ${counts[11]}`);
  console.log(`   📋 Tipos de Solicitação:  ${counts[12]}`);
  console.log(`   📨 Solicitações:          ${counts[13]}`);
  console.log(`   🏖️  Períodos de Férias:    ${counts[14]}`);
  console.log(`   📅 Solicitações Férias:   ${counts[15]}`);
  console.log(`   📅 Eventos de Timeline:   ${counts[16]}`);
  console.log('\n🔑 Credenciais (senha: Atrio@2026):');
  console.log('   admin@atrio.com.br    → ADMIN          (Rodrigo Almeida)');
  console.log('   camila@atrio.com.br   → RH + GESTOR    (Camila Ferreira)');
  console.log('   felipe@atrio.com.br   → GESTOR         (Felipe Souza)');
  console.log('   ana@atrio.com.br      → RH             (Ana Paula Lima)');
  console.log('   bruno@atrio.com.br    → COLABORADOR    (Bruno Martins)');
  console.log('   juliana@atrio.com.br  → COLABORADOR    (Juliana Costa)');
  console.log('   rafael@atrio.com.br   → COLABORADOR    (Rafael Gomes)');
  console.log('   leticia@atrio.com.br  → GESTOR         (Letícia Nunes)');
  console.log('   diego@atrio.com.br    → COLABORADOR    (Diego Carvalho)');
  console.log('   marina@atrio.com.br   → COLABORADOR    (Marina Teixeira)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
