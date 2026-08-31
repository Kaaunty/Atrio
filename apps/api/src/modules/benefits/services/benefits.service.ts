import { prisma } from '../../../database/prisma';
import { CreateBenefitDto, AssignEmployeeBenefitDto, UpdateEmployeeBenefitDto } from '../benefit.dto';

export class BenefitsService {
  /**
   * Obtém os benefícios do colaborador logado
   */
  static async getMyBenefits(employeeId: string) {
    const benefits = await prisma.employeeBenefit.findMany({
      where: {
        employeeId,
        status: 'ATIVO',
      },
      include: {
        benefit: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return benefits;
  }

  /**
   * Obtém o catálogo completo de benefícios (RH)
   */
  static async getAllBenefits() {
    const benefits = await prisma.benefit.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { employeeBenefits: true },
        },
      },
    });

    return benefits;
  }

  /**
   * Cadastra novo benefício no catálogo (RH)
   */
  static async createBenefit(dto: CreateBenefitDto) {
    const benefit = await prisma.benefit.create({
      data: {
        name: dto.name,
        provider: dto.provider,
        category: dto.category,
        description: dto.description,
        deductionRule: dto.deductionRule,
        active: dto.active,
      },
    });

    return benefit;
  }

  /**
   * Associa benefício a um colaborador com dependentes e vigência
   */
  static async assignBenefitToEmployee(employeeId: string, dto: AssignEmployeeBenefitDto) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new Error('Colaborador não encontrado.');
    }

    const benefit = await prisma.benefit.findUnique({ where: { id: dto.benefitId } });
    if (!benefit) {
      throw new Error('Benefício não encontrado.');
    }

    const employeeBenefit = await prisma.employeeBenefit.create({
      data: {
        employeeId,
        benefitId: dto.benefitId,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        cardNumberLast4: dto.cardNumberLast4,
        monthlyValue: dto.monthlyValue,
        employeeDeductionValue: dto.employeeDeductionValue,
        dependentsIncluded: dto.dependentsIncluded ? (dto.dependentsIncluded as any) : null,
        status: 'ATIVO',
      },
      include: {
        benefit: true,
      },
    });

    return employeeBenefit;
  }

  /**
   * Atualiza a situação/vigência do benefício de um colaborador
   */
  static async updateEmployeeBenefit(employeeBenefitId: string, dto: UpdateEmployeeBenefitDto) {
    const existing = await prisma.employeeBenefit.findUnique({ where: { id: employeeBenefitId } });
    if (!existing) {
      throw new Error('Vínculo de benefício não encontrado.');
    }

    const updated = await prisma.employeeBenefit.update({
      where: { id: employeeBenefitId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.endDate && { endDate: new Date(dto.endDate) }),
        ...(dto.cardNumberLast4 && { cardNumberLast4: dto.cardNumberLast4 }),
        ...(dto.monthlyValue !== undefined && { monthlyValue: dto.monthlyValue }),
        ...(dto.employeeDeductionValue !== undefined && { employeeDeductionValue: dto.employeeDeductionValue }),
        ...(dto.dependentsIncluded && { dependentsIncluded: dto.dependentsIncluded as any }),
      },
      include: {
        benefit: true,
      },
    });

    return updated;
  }
}
