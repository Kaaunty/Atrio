import { prisma } from '../../../database/prisma.js';
import {
  CreateSingleDocumentDTO,
  UploadBatchDTO,
  PublishInstitutionalDocumentDTO,
} from '../document.dto.js';
import { DocumentVisibility } from '@prisma/client';

export class DocumentsService {
  /**
   * Lista documentos acessíveis pelo colaborador logado (Privados + Institucionais da Empresa/Setor)
   */
  static async getEmployeeDocuments(
    employeeId: string,
    filters: { typeCode?: string; year?: number; unreadOnly?: boolean }
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true, departmentId: true },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado');
    }

    const where: any = {
      deletedAt: null,
      OR: [
        { employeeId: employee.id },
        { visibility: 'COMPANY_WIDE' },
        ...(employee.departmentId
          ? [{ visibility: 'DEPARTMENT' as DocumentVisibility, departmentId: employee.departmentId }]
          : []),
      ],
    };

    if (filters.typeCode) {
      where.documentType = { code: filters.typeCode };
    }

    if (filters.year) {
      where.referenceYear = filters.year;
    }

    const documents = await prisma.employeeDocument.findMany({
      where,
      include: {
        documentType: true,
        readReceipts: {
          where: { employeeId: employee.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = documents.map((doc) => {
      const receipt = doc.readReceipts[0];
      return {
        id: doc.id,
        documentType: doc.documentType,
        title: doc.title,
        description: doc.description,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        referenceMonth: doc.referenceMonth,
        referenceYear: doc.referenceYear,
        expirationDate: doc.expirationDate,
        visibility: doc.visibility,
        createdAt: doc.createdAt,
        requiresReadAcknowledgement: doc.documentType.requiresReadAcknowledgement,
        isAcknowledged: Boolean(receipt),
        acknowledgedAt: receipt?.acknowledgedAt || null,
      };
    });

    if (filters.unreadOnly) {
      return mapped.filter((d) => d.requiresReadAcknowledgement && !d.isAcknowledged);
    }

    return mapped;
  }

  /**
   * Realiza download seguro de documento com checagem de permissão e log de auditoria
   */
  static async downloadDocument(
    documentId: string,
    requestingUser: { id: string; employeeId?: string | null; roles: string[] }
  ) {
    const document = await prisma.employeeDocument.findUnique({
      where: { id: documentId },
      include: {
        documentType: true,
        employee: { select: { id: true, departmentId: true } },
      },
    });

    if (!document || document.deletedAt) {
      throw new Error('Documento não encontrado ou foi removido');
    }

    const isRhOrAdmin = requestingUser.roles.includes('ADMIN') || requestingUser.roles.includes('RH');

    // Validação estrita de permissão
    if (!isRhOrAdmin) {
      if (document.visibility === 'PRIVATE_EMPLOYEE_RH') {
        if (!requestingUser.employeeId || requestingUser.employeeId !== document.employeeId) {
          throw new Error('Acesso negado: este documento é privado e confidencial');
        }
      } else if (document.visibility === 'DEPARTMENT') {
        const userEmployee = requestingUser.employeeId
          ? await prisma.employee.findUnique({ where: { id: requestingUser.employeeId } })
          : null;

        if (!userEmployee || userEmployee.departmentId !== document.departmentId) {
          throw new Error('Acesso negado: este documento é restrito ao departamento');
        }
      }
    }

    // Registrar log de auditoria de download
    await prisma.auditLog.create({
      data: {
        userId: requestingUser.id,
        employeeId: requestingUser.employeeId || null,
        action: 'DOCUMENT_DOWNLOADED',
        entity: 'EmployeeDocument',
        recordId: document.id,
        newValue: {
          title: document.title,
          fileName: document.fileName,
          visibility: document.visibility,
        },
      },
    });

    return document;
  }

  /**
   * Confirma leitura / Aceita política interna
   */
  static async acknowledgeDocument(
    documentId: string,
    employeeId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    const document = await prisma.employeeDocument.findUnique({
      where: { id: documentId },
      include: { documentType: true },
    });

    if (!document || document.deletedAt) {
      throw new Error('Documento não encontrado');
    }

    const receipt = await prisma.documentReadReceipt.upsert({
      where: {
        documentId_employeeId: {
          documentId,
          employeeId,
        },
      },
      create: {
        documentId,
        employeeId,
        acknowledgedAt: new Date(),
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Navegador Web API',
      },
      update: {
        acknowledgedAt: new Date(),
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'Navegador Web API',
      },
    });

    // Registrar auditoria
    await prisma.auditLog.create({
      data: {
        employeeId,
        action: 'DOCUMENT_ACKNOWLEDGED',
        entity: 'EmployeeDocument',
        recordId: documentId,
        newValue: {
          title: document.title,
          acknowledgedAt: receipt.acknowledgedAt,
          ipAddress: receipt.ipAddress,
        },
      },
    });

    return receipt;
  }

  /**
   * Upload individual pelo RH
   */
  static async uploadSingleDocument(data: CreateSingleDocumentDTO, uploaderUserId: string) {
    const documentType = await prisma.documentType.findUnique({
      where: { id: data.documentTypeId },
    });

    if (!documentType) {
      throw new Error('Tipo de documento inválido');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado');
    }

    const doc = await prisma.employeeDocument.create({
      data: {
        documentTypeId: data.documentTypeId,
        employeeId: data.employeeId,
        title: data.title,
        description: data.description || null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        referenceMonth: data.referenceMonth || null,
        referenceYear: data.referenceYear || null,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        visibility: 'PRIVATE_EMPLOYEE_RH',
        uploadedBy: uploaderUserId,
      },
      include: {
        documentType: true,
        employee: { select: { id: true, name: true, registrationNumber: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: uploaderUserId,
        employeeId: data.employeeId,
        action: 'SINGLE_DOCUMENT_UPLOADED',
        entity: 'EmployeeDocument',
        recordId: doc.id,
        newValue: { title: doc.title, fileName: doc.fileName },
      },
    });

    return doc;
  }

  /**
   * Upload em Lote de Holerites/Informes pelo RH com associação automática por Matrícula/CPF
   */
  static async uploadBatchDocuments(data: UploadBatchDTO, uploaderUserId: string) {
    const documentType = await prisma.documentType.findFirst({
      where: { code: data.documentTypeCode },
    });

    if (!documentType) {
      throw new Error(`Tipo de documento '${data.documentTypeCode}' não encontrado no sistema`);
    }

    let matched = 0;
    let unmatched = 0;
    const errors: Array<{ fileName: string; reason: string }> = [];
    const createdDocs = [];

    for (const item of data.items) {
      const cleanKey = item.registrationOrCpf.replace(/\D/g, '');

      // Tenta encontrar por matrícula exata ou CPF limpo/formatado
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { registrationNumber: item.registrationOrCpf },
            { registrationNumber: cleanKey },
            { cpf: item.registrationOrCpf },
            { cpf: cleanKey },
          ],
        },
      });

      if (!employee) {
        unmatched++;
        errors.push({
          fileName: item.fileName,
          reason: `Nenhum colaborador encontrado para o código/CPF '${item.registrationOrCpf}'`,
        });
        continue;
      }

      const doc = await prisma.employeeDocument.create({
        data: {
          documentTypeId: documentType.id,
          employeeId: employee.id,
          title: item.title,
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          fileSize: item.fileSize,
          mimeType: item.mimeType,
          referenceMonth: data.referenceMonth,
          referenceYear: data.referenceYear,
          visibility: 'PRIVATE_EMPLOYEE_RH',
          uploadedBy: uploaderUserId,
        },
      });

      matched++;
      createdDocs.push(doc);
    }

    await prisma.auditLog.create({
      data: {
        userId: uploaderUserId,
        action: 'BATCH_DOCUMENTS_UPLOADED',
        entity: 'EmployeeDocument',
        recordId: documentType.id,
        newValue: {
          totalFiles: data.items.length,
          matched,
          unmatched,
          referenceMonth: data.referenceMonth,
          referenceYear: data.referenceYear,
        },
      },
    });

    return {
      total: data.items.length,
      matched,
      unmatched,
      errors,
      createdDocs,
    };
  }

  /**
   * Publica documento institucional / política corporativa para a empresa ou departamento
   */
  static async publishInstitutionalDocument(
    data: PublishInstitutionalDocumentDTO,
    uploaderUserId: string
  ) {
    const documentType = await prisma.documentType.findUnique({
      where: { id: data.documentTypeId },
    });

    if (!documentType) {
      throw new Error('Tipo de documento não encontrado');
    }

    // Se requer confirmação de leitura, atualiza a flag no tipo de documento se necessário
    if (data.requiresReadAcknowledgement && !documentType.requiresReadAcknowledgement) {
      await prisma.documentType.update({
        where: { id: documentType.id },
        data: { requiresReadAcknowledgement: true },
      });
    }

    const doc = await prisma.employeeDocument.create({
      data: {
        documentTypeId: data.documentTypeId,
        employeeId: null,
        title: data.title,
        description: data.description || null,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        visibility: data.visibility as DocumentVisibility,
        departmentId: data.visibility === 'DEPARTMENT' ? data.departmentId || null : null,
        uploadedBy: uploaderUserId,
      },
      include: {
        documentType: true,
        department: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: uploaderUserId,
        action: 'INSTITUTIONAL_DOCUMENT_PUBLISHED',
        entity: 'EmployeeDocument',
        recordId: doc.id,
        newValue: {
          title: doc.title,
          visibility: doc.visibility,
          requiresReadAcknowledgement: data.requiresReadAcknowledgement,
        },
      },
    });

    return doc;
  }

  /**
   * Obtém relatório de engajamento e lista de aceite de política para o RH
   */
  static async getReceiptsReport(documentId: string) {
    const document = await prisma.employeeDocument.findUnique({
      where: { id: documentId },
      include: {
        documentType: true,
        department: { select: { id: true, name: true } },
        readReceipts: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new Error('Documento não encontrado');
    }

    // Determina o público-alvo do documento
    let targetEmployeesWhere: any = { status: 'ATIVO' };
    if (document.visibility === 'DEPARTMENT' && document.departmentId) {
      targetEmployeesWhere.departmentId = document.departmentId;
    } else if (document.visibility === 'PRIVATE_EMPLOYEE_RH' && document.employeeId) {
      targetEmployeesWhere.id = document.employeeId;
    }

    const targetEmployees = await prisma.employee.findMany({
      where: targetEmployeesWhere,
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const receiptsMap = new Map(
      document.readReceipts.map((r) => [r.employeeId, r])
    );

    const reportItems = targetEmployees.map((emp) => {
      const receipt = receiptsMap.get(emp.id);
      return {
        employee: emp,
        isAcknowledged: Boolean(receipt),
        acknowledgedAt: receipt?.acknowledgedAt || null,
        ipAddress: receipt?.ipAddress || null,
      };
    });

    const totalTarget = targetEmployees.length;
    const totalAcknowledged = document.readReceipts.length;
    const pendingCount = totalTarget - totalAcknowledged;
    const percentage = totalTarget > 0 ? Math.round((totalAcknowledged / totalTarget) * 100) : 0;

    return {
      document: {
        id: document.id,
        title: document.title,
        documentType: document.documentType,
        visibility: document.visibility,
        createdAt: document.createdAt,
      },
      summary: {
        totalTarget,
        totalAcknowledged,
        pendingCount,
        percentageFormatted: `${percentage}%`,
      },
      reportItems,
    };
  }

  /**
   * Retorna os tipos de documento disponíveis
   */
  static async getDocumentTypes() {
    return prisma.documentType.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
