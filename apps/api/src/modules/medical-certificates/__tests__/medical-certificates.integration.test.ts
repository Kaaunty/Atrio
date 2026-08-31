import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { MedicalCertificatesService } from '../services/medical-certificates.service.js';
import { LeavesOfAbsenceService } from '../services/leaves-of-absence.service.js';

describe('Gestão de Atestados Médicos & Afastamentos Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let gestorEmployeeId: string;
  let gestorUserId: string;
  let colabEmployeeId: string;
  let colabUserId: string;
  let rhUserId: string;

  before(async () => {
    // 1. Empresa e Departamento
    const company = await prisma.company.create({
      data: {
        legalName: 'Empresa Atestados Teste S/A',
        tradeName: 'Atestados Teste',
        cnpj: '88.999.000/0001-44',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Desenvolvimento de Software',
        code: 'DEV-01',
      },
    });
    testDeptId = dept.id;

    // 2. Gestor
    const gestorEmp = await prisma.employee.create({
      data: {
        name: 'Gestor Fernando Silva',
        cpf: '88811122233',
        email: 'fernando.gestor@atestadosteste.com',
        registrationNumber: 'MAT-CERT-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2023-01-10'),
      },
    });
    gestorEmployeeId = gestorEmp.id;

    const gestorUser = await prisma.user.create({
      data: {
        email: 'fernando.gestor@atestadosteste.com',
        passwordHash: 'hash-teste',
        employeeId: gestorEmployeeId,
      },
    });
    gestorUserId = gestorUser.id;

    // 3. Colaborador
    const colabEmp = await prisma.employee.create({
      data: {
        name: 'Lucas Colaborador',
        cpf: '99922233344',
        email: 'lucas.colab@atestadosteste.com',
        registrationNumber: 'MAT-CERT-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        managerId: gestorEmployeeId,
        admissionDate: new Date('2024-02-01'),
      },
    });
    colabEmployeeId = colabEmp.id;

    const colabUser = await prisma.user.create({
      data: {
        email: 'lucas.colab@atestadosteste.com',
        passwordHash: 'hash-teste',
        employeeId: colabEmployeeId,
      },
    });
    colabUserId = colabUser.id;

    // 4. RH
    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.atestados@atestadosteste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.leaveOfAbsence.deleteMany({
        where: { employeeId: { in: [gestorEmployeeId, colabEmployeeId] } },
      });
      await prisma.medicalCertificate.deleteMany({
        where: { employeeId: { in: [gestorEmployeeId, colabEmployeeId] } },
      });
      await prisma.timeDailySummary.deleteMany({
        where: { employeeId: { in: [gestorEmployeeId, colabEmployeeId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [gestorUserId, colabUserId, rhUserId] } },
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

  it('deve permitir ao colaborador enviar atestado e ao RH homologar criando afastamento e abonando o ponto', async () => {
    // 1. Colaborador envia atestado médico de 3 dias
    const cert = await MedicalCertificatesService.submitCertificate(colabEmployeeId, {
      startDate: '2026-09-01',
      daysCount: 3,
      issueDate: '2026-09-01',
      doctorName: 'Dr. Roberto Santos',
      crmNumber: 'CRM/SP 123456',
      cidCode: 'J06',
      reasonCategory: 'DOENCA_ATE_15D',
      notes: 'Sintomas gripais com febre',
      documentUrl: 'https://storage.atrio.com/atestados/cert-lucas-01.pdf',
    });

    assert.ok(cert.id);
    assert.equal(cert.status, 'ENVIADO');
    assert.equal(cert.daysCount, 3);

    // 2. RH visualiza atestado com proteção sensível (sem permissão -> dados restritos)
    const certRestricted = await MedicalCertificatesService.getCertificateDetailForRh(cert.id, false);
    assert.equal(certRestricted.documentUrl, '[ACESSO RESTRITO LGPD]');
    assert.equal(certRestricted.cidCode, '[RESTRITO]');
    assert.equal(certRestricted.crmNumber, '[RESTRITO]');

    // RH visualiza com permissão sensível
    const certFull = await MedicalCertificatesService.getCertificateDetailForRh(cert.id, true);
    assert.equal(certFull.documentUrl, 'https://storage.atrio.com/atestados/cert-lucas-01.pdf');
    assert.equal(certFull.cidCode, 'J06');
    assert.equal(certFull.crmNumber, 'CRM/SP 123456');

    // 3. RH aprova o atestado
    const approval = await MedicalCertificatesService.approveCertificate(
      cert.id,
      rhUserId,
      'Atestado válido homologado pela medicina do trabalho.'
    );

    assert.equal(approval.certificate.status, 'APROVADO');
    assert.equal(approval.inssReferral, false);
    assert.ok(approval.leave.id);

    // 4. Verifica se os dias foram abonados no espelho de ponto (TimeDailySummary -> AFASTAMENTO)
    const summaryDay1 = await prisma.timeDailySummary.findUnique({
      where: {
        employeeId_date: {
          employeeId: colabEmployeeId,
          date: new Date('2026-09-01T00:00:00Z'),
        },
      },
    });
    assert.ok(summaryDay1);
    assert.equal(summaryDay1.status, 'AFASTAMENTO');
    assert.equal(summaryDay1.absenceMinutes, 0);

    const summaryDay3 = await prisma.timeDailySummary.findUnique({
      where: {
        employeeId_date: {
          employeeId: colabEmployeeId,
          date: new Date('2026-09-03T00:00:00Z'),
        },
      },
    });
    assert.ok(summaryDay3);
    assert.equal(summaryDay3.status, 'AFASTAMENTO');
  });

  it('deve gerar alerta de encaminhamento ao INSS para atestado com mais de 15 dias', async () => {
    // Colaborador envia atestado de 16 dias
    const cert16 = await MedicalCertificatesService.submitCertificate(colabEmployeeId, {
      startDate: '2026-10-01',
      daysCount: 16,
      issueDate: '2026-10-01',
      doctorName: 'Dra. Patricia Lima',
      crmNumber: 'CRM/SP 987654',
      cidCode: 'M54.5',
      reasonCategory: 'DOENCA_SUPERIOR_15D',
      notes: 'Lumbago grave necessitando repouso prolongado',
      documentUrl: 'https://storage.atrio.com/atestados/cert-lucas-16d.pdf',
    });

    const approval = await MedicalCertificatesService.approveCertificate(
      cert16.id,
      rhUserId,
      'Encaminhado ao INSS devido a afastamento superior a 15 dias.'
    );

    assert.equal(approval.inssReferral, true);
    assert.equal(approval.leave.leaveType, 'AUXILIO_DOENCA_INSS');
  });

  it('deve garantir restrição LGPD na visão de equipe do gestor (apenas impacto operacional)', async () => {
    const leavesManagerView = await LeavesOfAbsenceService.getLeavesOfAbsence({
      isManagerView: true,
      managerEmployeeId: gestorEmployeeId,
    });

    assert.ok(leavesManagerView.length >= 1);
    const item = leavesManagerView[0];
    assert.equal(item.displayReason, 'Ausência por Saúde Justificada (Homologada RH)');
    // Garante que o gestor NÃO possui acesso a anexo, CRM ou CID
    assert.equal((item as any).documentUrl, undefined);
    assert.equal((item as any).cidCode, undefined);
    assert.equal((item as any).crmNumber, undefined);
  });
});
