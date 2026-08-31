import { prisma } from '../../../database/prisma.js';
import { CreateMedicalCertificateDTO } from '../medical-certificate.dto.js';
import { MedicalCertificateStatus, MedicalCertificateReasonCategory } from '@prisma/client';

export class MedicalCertificatesService {
  /**
   * Envia um novo atestado médico (Visão do Colaborador)
   */
  static async submitCertificate(employeeId: string, data: CreateMedicalCertificateDTO) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new Error('Colaborador não encontrado');
    }

    const start = new Date(data.startDate + 'T00:00:00Z');
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + data.daysCount - 1);

    const issue = new Date(data.issueDate + 'T00:00:00Z');

    const certificate = await prisma.medicalCertificate.create({
      data: {
        employeeId,
        startDate: start,
        daysCount: data.daysCount,
        endDate: end,
        issueDate: issue,
        doctorName: data.doctorName,
        crmNumber: data.crmNumber,
        cidCode: data.cidCode || null,
        reasonCategory: data.reasonCategory as MedicalCertificateReasonCategory,
        notes: data.notes || null,
        documentUrl: data.documentUrl,
        status: 'ENVIADO',
      },
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
    });

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        employeeId,
        action: 'MEDICAL_CERTIFICATE_SUBMITTED',
        entity: 'MedicalCertificate',
        recordId: certificate.id,
        newValue: {
          startDate: data.startDate,
          daysCount: data.daysCount,
          reasonCategory: data.reasonCategory,
        },
      },
    });

    return certificate;
  }

  /**
   * Retorna os atestados do próprio colaborador
   */
  static async getEmployeeCertificates(employeeId: string) {
    return prisma.medicalCertificate.findMany({
      where: { employeeId },
      include: {
        rhReviewer: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Lista atestados para a fila do RH com opção de filtro por status e busca por nome/matrícula
   */
  static async getRhCertificates(
    filters: { status?: MedicalCertificateStatus; search?: string },
    hasSensitivePermission: boolean = true
  ) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.search) {
      where.employee = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }

    const certificates = await prisma.medicalCertificate.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, title: true } },
          },
        },
        rhReviewer: {
          select: { id: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Se o usuário não possuir permissão LGPD de dados sensíveis, remove anexo e CID
    if (!hasSensitivePermission) {
      return certificates.map((cert) => ({
        ...cert,
        documentUrl: '[ACESSO RESTRITO LGPD]',
        cidCode: cert.cidCode ? '[RESTITO]' : null,
        crmNumber: '[RESTRITO]',
      }));
    }

    return certificates;
  }

  /**
   * Obtém os detalhes completos de um atestado médico pelo RH
   */
  static async getCertificateDetailForRh(certificateId: string, hasSensitivePermission: boolean = true) {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            cpf: true,
            email: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, title: true } },
          },
        },
        rhReviewer: {
          select: { id: true, email: true },
        },
        leaves: true,
      },
    });

    if (!certificate) {
      throw new Error('Atestado médico não encontrado');
    }

    // Calcula total de dias acumulados em atestados nos últimos 60 dias para alerta INSS
    const sixtyDaysAgo = new Date(certificate.startDate);
    sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);

    const previousCertificates = await prisma.medicalCertificate.findMany({
      where: {
        employeeId: certificate.employeeId,
        id: { not: certificateId },
        status: 'APROVADO',
        startDate: { gte: sixtyDaysAgo },
      },
    });

    const accumulatedDays = previousCertificates.reduce((sum, c) => sum + c.daysCount, 0) + certificate.daysCount;
    const isInssAlert = accumulatedDays > 15;

    let responseData: any = {
      ...certificate,
      accumulatedDays,
      isInssAlert,
    };

    if (!hasSensitivePermission) {
      responseData = {
        ...responseData,
        documentUrl: '[ACESSO RESTRITO LGPD]',
        cidCode: certificate.cidCode ? '[RESTRITO]' : null,
        crmNumber: '[RESTRITO]',
      };
    }

    return responseData;
  }

  /**
   * Homologa / Aprova atestado pelo RH
   */
  static async approveCertificate(certificateId: string, rhUserId: string, rhReviewNotes?: string) {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
      include: { employee: true },
    });

    if (!certificate) {
      throw new Error('Atestado médico não encontrado');
    }

    if (certificate.status === 'APROVADO') {
      throw new Error('Atestado já foi aprovado anteriormente');
    }

    // Calcula total de dias acumulados nos últimos 60 dias
    const sixtyDaysAgo = new Date(certificate.startDate);
    sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);

    const previousCertificates = await prisma.medicalCertificate.findMany({
      where: {
        employeeId: certificate.employeeId,
        id: { not: certificateId },
        status: 'APROVADO',
        startDate: { gte: sixtyDaysAgo },
      },
    });

    const accumulatedDays = previousCertificates.reduce((sum, c) => sum + c.daysCount, 0) + certificate.daysCount;
    const inssReferral = accumulatedDays > 15;

    const now = new Date();

    // 1. Atualizar status do atestado
    const updatedCert = await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'APROVADO',
        rhReviewerId: rhUserId,
        rhReviewNotes: rhReviewNotes || 'Atestado médico aprovado e homologado pelo RH.',
        reviewedAt: now,
      },
    });

    // 2. Criar registro de Afastamento (LeaveOfAbsence)
    const leave = await prisma.leaveOfAbsence.create({
      data: {
        employeeId: certificate.employeeId,
        medicalCertificateId: certificateId,
        leaveType: inssReferral ? 'AUXILIO_DOENCA_INSS' : 'ATESTADO_MEDICO',
        startDate: certificate.startDate,
        endDate: certificate.endDate,
        inssReferral,
        active: true,
      },
    });

    // 3. Abono automático no espelho de ponto (TimeDailySummary) para todos os dias do atestado
    const currDate = new Date(certificate.startDate);
    const endLimit = new Date(certificate.endDate);

    while (currDate <= endLimit) {
      const dateCopy = new Date(currDate);

      const existingSummary = await prisma.timeDailySummary.findUnique({
        where: {
          employeeId_date: {
            employeeId: certificate.employeeId,
            date: dateCopy,
          },
        },
      });

      if (existingSummary) {
        await prisma.timeDailySummary.update({
          where: { id: existingSummary.id },
          data: {
            status: 'AFASTAMENTO',
            absenceMinutes: 0,
            divergenceReasons: [],
            recalculatedAt: now,
          },
        });
      } else {
        await prisma.timeDailySummary.create({
          data: {
            employeeId: certificate.employeeId,
            date: dateCopy,
            expectedWorkMinutes: 480,
            actualWorkMinutes: 0,
            balanceMinutes: 0,
            extraHoursMinutes: 0,
            delayMinutes: 0,
            absenceMinutes: 0,
            entries: [],
            status: 'AFASTAMENTO',
          },
        });
      }

      currDate.setUTCDate(currDate.getUTCDate() + 1);
    }

    // 4. Se a data atual estiver dentro do período do atestado, atualiza o status do colaborador para AFASTADO
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (today >= certificate.startDate && today <= certificate.endDate) {
      await prisma.employee.update({
        where: { id: certificate.employeeId },
        data: { status: 'AFASTADO' },
      });
    }

    // Registrar log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: certificate.employeeId,
        action: 'MEDICAL_CERTIFICATE_APPROVED',
        entity: 'MedicalCertificate',
        recordId: certificateId,
        newValue: {
          inssReferral,
          accumulatedDays,
          leaveId: leave.id,
        },
      },
    });

    return {
      certificate: updatedCert,
      leave,
      inssReferral,
      accumulatedDays,
    };
  }

  /**
   * Rejeita atestado médico
   */
  static async rejectCertificate(certificateId: string, rhUserId: string, rhReviewNotes: string) {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new Error('Atestado médico não encontrado');
    }

    const updatedCert = await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'REJEITADO',
        rhReviewerId: rhUserId,
        rhReviewNotes,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: certificate.employeeId,
        action: 'MEDICAL_CERTIFICATE_REJECTED',
        entity: 'MedicalCertificate',
        recordId: certificateId,
        newValue: { rhReviewNotes },
      },
    });

    return updatedCert;
  }

  /**
   * Solicita correção / envio de novo documento
   */
  static async requestCorrection(certificateId: string, rhUserId: string, rhReviewNotes: string) {
    const certificate = await prisma.medicalCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new Error('Atestado médico não encontrado');
    }

    const updatedCert = await prisma.medicalCertificate.update({
      where: { id: certificateId },
      data: {
        status: 'SOLICITADO_CORRECAO',
        rhReviewerId: rhUserId,
        rhReviewNotes,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: rhUserId,
        employeeId: certificate.employeeId,
        action: 'MEDICAL_CERTIFICATE_CORRECTION_REQUESTED',
        entity: 'MedicalCertificate',
        recordId: certificateId,
        newValue: { rhReviewNotes },
      },
    });

    return updatedCert;
  }
}
