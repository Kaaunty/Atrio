import { prisma } from '../../../database/prisma';
import {
  CreateTrainingDto,
  AssignTrainingDto,
  UploadCertificateDto,
  CreateFeedbackDto,
  CreateDevelopmentPlanDto,
  CreateGoalDto,
  UpdateGoalDto,
} from '../development.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

export class DevelopmentService {
  // ===========================================================================
  // 1. TREINAMENTOS CORPORATIVOS
  // ===========================================================================

  static async getMyTrainings(employeeId: string) {
    const list = await prisma.employeeTraining.findMany({
      where: { employeeId },
      include: { training: true },
      orderBy: { createdAt: 'desc' },
    });

    return list;
  }

  static async getAllTrainings() {
    const trainings = await prisma.training.findMany({
      orderBy: { title: 'asc' },
      include: {
        _count: { select: { employeeTrainings: true } },
      },
    });

    return trainings;
  }

  static async createTraining(dto: CreateTrainingDto) {
    return prisma.training.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        validityMonths: dto.validityMonths,
        workloadHours: dto.workloadHours,
        provider: dto.provider,
        active: dto.active,
      },
    });
  }

  static async assignTrainingToEmployees(dto: AssignTrainingDto) {
    const training = await prisma.training.findUnique({ where: { id: dto.trainingId } });
    if (!training) {
      throw new Error('Treinamento não encontrado.');
    }

    const createdList = [];
    for (const empId of dto.employeeIds) {
      const empTrain = await prisma.employeeTraining.create({
        data: {
          employeeId: empId,
          trainingId: dto.trainingId,
          status: 'PENDENTE',
          startedAt: new Date(),
        },
      });
      createdList.push(empTrain);

      // Notificar colaborador se possuir usuário
      const user = await prisma.user.findFirst({ where: { employeeId: empId } });
      if (user) {
        setImmediate(async () => {
          await NotificationsService.notifyUser({
            userId: user.id,
            title: `Novo Treinamento Atribuído: ${training.title}`,
            message: `Você foi matriculado no treinamento "${training.title}". Acesse sua trilha de aprendizado para concluir.`,
            type: 'INFO',
            category: 'SISTEMA',
            actionUrl: '/desenvolvimento/treinamentos',
          });
        });
      }
    }

    return { count: createdList.length };
  }

  static async uploadCertificate(employeeTrainingId: string, dto: UploadCertificateDto) {
    const empTraining = await prisma.employeeTraining.findUnique({
      where: { id: employeeTrainingId },
      include: { training: true },
    });

    if (!empTraining) {
      throw new Error('Matrícula de treinamento não encontrada.');
    }

    const completedAt = new Date();
    let expiresAt: Date | null = null;

    if (empTraining.training.validityMonths) {
      expiresAt = new Date(completedAt);
      expiresAt.setMonth(expiresAt.getMonth() + empTraining.training.validityMonths);
    }

    const updated = await prisma.employeeTraining.update({
      where: { id: employeeTrainingId },
      data: {
        status: 'CONCLUIDO',
        completedAt,
        expiresAt,
        certificateUrl: dto.certificateUrl,
      },
      include: { training: true },
    });

    return updated;
  }

  static async getComplianceReport() {
    const totalAssigned = await prisma.employeeTraining.count();
    const completed = await prisma.employeeTraining.count({ where: { status: 'CONCLUIDO' } });
    const pending = await prisma.employeeTraining.count({ where: { status: 'PENDENTE' } });
    const expired = await prisma.employeeTraining.count({ where: { status: 'VENCIDO' } });

    const complianceRate = totalAssigned > 0 ? Number(((completed / totalAssigned) * 100).toFixed(1)) : 100;

    return {
      totalAssigned,
      completed,
      pending,
      expired,
      complianceRate,
    };
  }

  // ===========================================================================
  // 2. FEEDBACKS & REUNIÕES 1:1
  // ===========================================================================

  static async getMyFeedbacks(userId: string, employeeId: string) {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        employeeId,
        visibility: { in: ['PRIVATE_MANAGER_EMPLOYEE', 'RH_ACCESSIBLE'] },
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        },
      },
      orderBy: { feedbackDate: 'desc' },
    });

    return feedbacks;
  }

  static async getTeamFeedbacks(managerUserId: string, targetEmployeeId: string) {
    const feedbacks = await prisma.feedback.findMany({
      where: {
        employeeId: targetEmployeeId,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        },
      },
      orderBy: { feedbackDate: 'desc' },
    });

    return feedbacks;
  }

  static async createFeedback(authorId: string, dto: CreateFeedbackDto) {
    const targetEmployee = await prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!targetEmployee) {
      throw new Error('Colaborador de destino não encontrado.');
    }

    const feedbackDate = dto.feedbackDate ? new Date(dto.feedbackDate) : new Date();

    const feedback = await prisma.feedback.create({
      data: {
        employeeId: dto.employeeId,
        authorId,
        feedbackType: dto.feedbackType,
        subject: dto.subject,
        content: dto.content,
        actionItems: dto.actionItems ? (dto.actionItems as any) : null,
        visibility: dto.visibility,
        feedbackDate,
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        },
      },
    });

    // Notificar o colaborador destinatário se possuir conta de usuário
    const targetUser = await prisma.user.findFirst({ where: { employeeId: dto.employeeId } });
    if (targetUser && dto.visibility !== 'MANAGER_ONLY') {
      setImmediate(async () => {
        await NotificationsService.notifyUser({
          userId: targetUser.id,
          title: `Novo Feedback Registrado: ${dto.subject}`,
          message: `Seu gestor registrou uma nova sessão de feedback/1:1 com você.`,
          type: 'INFO',
          category: 'SISTEMA',
          actionUrl: '/desenvolvimento/feedbacks',
        });
      });
    }

    return feedback;
  }

  // ===========================================================================
  // 3. PDI - PLANO DE DESENVOLVIMENTO INDIVIDUAL
  // ===========================================================================

  static async getMyDevelopmentPlans(employeeId: string) {
    const plans = await prisma.developmentPlan.findMany({
      where: { employeeId },
      include: {
        mentor: { select: { name: true, registrationNumber: true } },
        goals: { orderBy: { targetDate: 'asc' } },
      },
      orderBy: { periodYear: 'desc' },
    });

    return plans;
  }

  static async createDevelopmentPlan(dto: CreateDevelopmentPlanDto) {
    return prisma.developmentPlan.create({
      data: {
        employeeId: dto.employeeId,
        mentorId: dto.mentorId,
        title: dto.title,
        periodYear: dto.periodYear,
        status: 'EM_ANDAMENTO',
      },
      include: {
        goals: true,
      },
    });
  }

  static async addGoalToPlan(planId: string, dto: CreateGoalDto) {
    const plan = await prisma.developmentPlan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new Error('Plano de Desenvolvimento Individual (PDI) não encontrado.');
    }

    const goal = await prisma.developmentPlanGoal.create({
      data: {
        developmentPlanId: planId,
        title: dto.title,
        competency: dto.competency,
        targetDate: new Date(dto.targetDate),
        actionSteps: dto.actionSteps,
        status: 'EM_ANDAMENTO',
      },
    });

    return goal;
  }

  static async updateGoal(goalId: string, dto: UpdateGoalDto) {
    const goal = await prisma.developmentPlanGoal.findUnique({ where: { id: goalId } });
    if (!goal) {
      throw new Error('Meta do PDI não encontrada.');
    }

    const updated = await prisma.developmentPlanGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.actionSteps !== undefined && { actionSteps: dto.actionSteps }),
        ...(dto.evidenceNotes !== undefined && { evidenceNotes: dto.evidenceNotes }),
      },
    });

    return updated;
  }
}
