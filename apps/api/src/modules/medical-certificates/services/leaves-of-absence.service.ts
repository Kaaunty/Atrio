import { prisma } from '../../../database/prisma.js';

export class LeavesOfAbsenceService {
  /**
   * Consulta os afastamentos cadastrados com suporte a visões RH (completa) e Gestor (LGPD - apenas impacto operacional)
   */
  static async getLeavesOfAbsence(
    filters: {
      departmentId?: string;
      activeOnly?: boolean;
      managerEmployeeId?: string;
      isManagerView?: boolean;
    }
  ) {
    const where: any = {};

    if (filters.activeOnly) {
      where.active = true;
    }

    if (filters.departmentId) {
      where.employee = {
        departmentId: filters.departmentId,
      };
    }

    if (filters.isManagerView && filters.managerEmployeeId) {
      where.employee = {
        ...where.employee,
        managerId: filters.managerEmployeeId,
      };
    }

    const leaves = await prisma.leaveOfAbsence.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            avatarUrl: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, title: true } },
          },
        },
        medicalCertificate: filters.isManagerView
          ? false
          : {
              select: {
                id: true,
                reasonCategory: true,
                daysCount: true,
                status: true,
              },
            },
      },
      orderBy: { startDate: 'desc' },
    });

    if (filters.isManagerView) {
      // Visão de Gestor: Omite qualquer vínculo clínico e transforma tipo em descrição operacional
      return leaves.map((leave) => ({
        id: leave.id,
        employee: leave.employee,
        leaveType: leave.leaveType,
        displayReason: 'Ausência por Saúde Justificada (Homologada RH)',
        startDate: leave.startDate,
        endDate: leave.endDate,
        returnDate: leave.returnDate,
        inssReferral: leave.inssReferral,
        active: leave.active,
      }));
    }

    return leaves;
  }
}
