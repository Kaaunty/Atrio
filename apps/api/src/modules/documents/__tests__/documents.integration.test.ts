import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { DocumentsService } from '../services/documents.service.js';

describe('Central de Documentos do Colaborador Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId: string;
  let emp1Id: string;
  let user1Id: string;
  let emp2Id: string;
  let user2Id: string;
  let rhUserId: string;

  let docTypeHoleriteId: string;
  let docTypePoliticaId: string;
  let privateDocId: string;
  let institutionalDocId: string;

  before(async () => {
    // 1. Empresa e Departamento
    const company = await prisma.company.create({
      data: {
        legalName: 'Empresa Documentos Teste S/A',
        tradeName: 'Docs Teste',
        cnpj: '99.000.111/0001-55',
      },
    });
    testCompanyId = company.id;

    const dept = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Tecnologia & Inovação',
        code: 'TEC-01',
      },
    });
    testDeptId = dept.id;

    // 2. Colaborador 1 (Matrícula MAT-DOC-001)
    const emp1 = await prisma.employee.create({
      data: {
        name: 'Guilherme Mendes',
        cpf: '11122233344',
        email: 'guilherme.mendes@docsteste.com',
        registrationNumber: 'MAT-DOC-001',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2024-01-10'),
      },
    });
    emp1Id = emp1.id;

    const user1 = await prisma.user.create({
      data: {
        email: 'guilherme.mendes@docsteste.com',
        passwordHash: 'hash-teste',
        employeeId: emp1Id,
      },
    });
    user1Id = user1.id;

    // 3. Colaborador 2 (Matrícula MAT-DOC-002)
    const emp2 = await prisma.employee.create({
      data: {
        name: 'Beatriz Lima',
        cpf: '22233344455',
        email: 'beatriz.lima@docsteste.com',
        registrationNumber: 'MAT-DOC-002',
        companyId: testCompanyId,
        departmentId: testDeptId,
        admissionDate: new Date('2024-02-15'),
      },
    });
    emp2Id = emp2.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'beatriz.lima@docsteste.com',
        passwordHash: 'hash-teste',
        employeeId: emp2Id,
      },
    });
    user2Id = user2.id;

    // 4. RH
    const rhUser = await prisma.user.create({
      data: {
        email: 'rh.docs@docsteste.com',
        passwordHash: 'hash-teste',
      },
    });
    rhUserId = rhUser.id;

    // 5. Tipos de Documento
    const dtHolerite = await prisma.documentType.create({
      data: {
        name: 'Holerite / Contracheque Teste',
        code: 'TEST_HOLERITE',
        isInstitutional: false,
        requiresReadAcknowledgement: false,
      },
    });
    docTypeHoleriteId = dtHolerite.id;

    const dtPolitica = await prisma.documentType.create({
      data: {
        name: 'Política Interna Teste',
        code: 'TEST_POLITICA',
        isInstitutional: true,
        requiresReadAcknowledgement: true,
      },
    });
    docTypePoliticaId = dtPolitica.id;
  });

  after(async () => {
    if (testCompanyId) {
      await prisma.documentReadReceipt.deleteMany({
        where: { employeeId: { in: [emp1Id, emp2Id] } },
      });
      await prisma.employeeDocument.deleteMany({
        where: { documentTypeId: { in: [docTypeHoleriteId, docTypePoliticaId] } },
      });
      await prisma.documentType.deleteMany({
        where: { id: { in: [docTypeHoleriteId, docTypePoliticaId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [user1Id, user2Id, rhUserId] } },
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

  it('deve permitir upload individual, listar documentos do colaborador e baixar com log de auditoria', async () => {
    // 1. RH faz upload individual de holerite privado para Guilherme (emp1)
    const doc = await DocumentsService.uploadSingleDocument(
      {
        documentTypeId: docTypeHoleriteId,
        employeeId: emp1Id,
        title: 'Holerite - Agosto/2026',
        fileUrl: 'https://storage.atrio.com/docs/holerite_guilherme_aug2026.pdf',
        fileName: 'holerite_guilherme_aug2026.pdf',
        fileSize: 154000,
        mimeType: 'application/pdf',
        referenceMonth: 8,
        referenceYear: 2026,
      },
      rhUserId
    );

    assert.ok(doc.id);
    privateDocId = doc.id;
    assert.equal(doc.visibility, 'PRIVATE_EMPLOYEE_RH');

    // 2. Guilherme consulta seus documentos e encontra o holerite
    const docsColab1 = await DocumentsService.getEmployeeDocuments(emp1Id, {});
    assert.ok(docsColab1.some((d) => d.id === privateDocId));

    // 3. Beatriz (emp2) não deve ver o holerite de Guilherme na sua lista
    const docsColab2 = await DocumentsService.getEmployeeDocuments(emp2Id, {});
    assert.equal(docsColab2.some((d) => d.id === privateDocId), false);

    // 4. Guilherme faz o download do próprio documento
    const downloaded = await DocumentsService.downloadDocument(privateDocId, {
      id: user1Id,
      employeeId: emp1Id,
      roles: ['COLABORADOR'],
    });

    assert.equal(downloaded.fileName, 'holerite_guilherme_aug2026.pdf');

    // Verifica auditoria de download
    const audit = await prisma.auditLog.findFirst({
      where: {
        recordId: privateDocId,
        action: 'DOCUMENT_DOWNLOADED',
      },
    });
    assert.ok(audit);

    // 5. Beatriz tenta baixar o documento privado de Guilherme (deve ser bloqueada 403)
    await assert.rejects(async () => {
      await DocumentsService.downloadDocument(privateDocId, {
        id: user2Id,
        employeeId: emp2Id,
        roles: ['COLABORADOR'],
      });
    }, /Acesso negado: este documento é privado/);
  });

  it('deve publicar política institucional, permitir aceite de leitura e gerar relatório de engajamento', async () => {
    // 1. RH publica Política de Segurança da Informação para a empresa toda
    const institutionalDoc = await DocumentsService.publishInstitutionalDocument(
      {
        documentTypeId: docTypePoliticaId,
        title: 'Política de Segurança da Informação v2026',
        description: 'Diretrizes obrigatórias sobre uso de senhas e dados LGPD.',
        fileUrl: 'https://storage.atrio.com/docs/politica_seguranca_2026.pdf',
        fileName: 'politica_seguranca_2026.pdf',
        fileSize: 420000,
        mimeType: 'application/pdf',
        visibility: 'COMPANY_WIDE',
        requiresReadAcknowledgement: true,
      },
      rhUserId
    );

    assert.ok(institutionalDoc.id);
    institutionalDocId = institutionalDoc.id;

    // 2. Guilherme consulta documentos e vê a política como NÃO lida
    const docsColab1 = await DocumentsService.getEmployeeDocuments(emp1Id, {});
    const itemColab1 = docsColab1.find((d) => d.id === institutionalDocId);
    assert.ok(itemColab1);
    assert.equal(itemColab1.requiresReadAcknowledgement, true);
    assert.equal(itemColab1.isAcknowledged, false);

    // 3. Guilherme confirma a leitura e aceite
    const receipt = await DocumentsService.acknowledgeDocument(
      institutionalDocId,
      emp1Id,
      '192.168.1.50',
      'Mozilla/5.0 Chrome Test'
    );

    assert.ok(receipt.id);
    assert.equal(receipt.ipAddress, '192.168.1.50');

    // 4. Reconsultar: documento agora deve figurar como LIDO
    const docsColab1After = await DocumentsService.getEmployeeDocuments(emp1Id, {});
    const itemColab1After = docsColab1After.find((d) => d.id === institutionalDocId);
    assert.equal(itemColab1After?.isAcknowledged, true);
    assert.ok(itemColab1After?.acknowledgedAt);

    // 5. RH gera relatório de leitura e verifica o percentual
    const report = await DocumentsService.getReceiptsReport(institutionalDocId);
    assert.ok(report.summary.totalTarget >= 2);
    assert.ok(report.summary.totalAcknowledged >= 1);
  });

  it('deve realizar upload em lote associando arquivos aos colaboradores por matrícula', async () => {
    const batchResult = await DocumentsService.uploadBatchDocuments(
      {
        documentTypeCode: 'TEST_HOLERITE',
        referenceMonth: 8,
        referenceYear: 2026,
        items: [
          {
            registrationOrCpf: 'MAT-DOC-001',
            title: 'Holerite Agosto 2026 - Guilherme',
            fileUrl: 'https://storage.atrio.com/batch/001.pdf',
            fileName: 'holerite_MAT-DOC-001.pdf',
            fileSize: 120000,
            mimeType: 'application/pdf',
          },
          {
            registrationOrCpf: 'MAT-DOC-002',
            title: 'Holerite Agosto 2026 - Beatriz',
            fileUrl: 'https://storage.atrio.com/batch/002.pdf',
            fileName: 'holerite_MAT-DOC-002.pdf',
            fileSize: 125000,
            mimeType: 'application/pdf',
          },
          {
            registrationOrCpf: 'MAT-INVALIDA-999',
            title: 'Holerite Invalido',
            fileUrl: 'https://storage.atrio.com/batch/999.pdf',
            fileName: 'holerite_999.pdf',
            fileSize: 100000,
            mimeType: 'application/pdf',
          },
        ],
      },
      rhUserId
    );

    assert.equal(batchResult.total, 3);
    assert.equal(batchResult.matched, 2);
    assert.equal(batchResult.unmatched, 1);
    assert.equal(batchResult.errors.length, 1);
  });
});
