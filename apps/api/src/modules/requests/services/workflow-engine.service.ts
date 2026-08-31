import { prisma } from '../../../database/prisma.js';
import { CreateRequestInput } from '../requests.dto.js';

export class WorkflowEngineService {
  /**
   * Gera um número sequencial único anual no formato SOL-YYYY-00001
   */
  static async generateRequestNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SOL-${year}`;

    const lastRequest = await prisma.request.findFirst({
      where: {
        requestNumber: { startsWith: prefix },
      },
      orderBy: { requestNumber: 'desc' },
      select: { requestNumber: true },
    });

    let nextSeq = 1;
    if (lastRequest && lastRequest.requestNumber) {
      const parts = lastRequest.requestNumber.split('-');
      if (parts.length === 3) {
        const currentSeq = parseInt(parts[2], 10);
        if (!isNaN(currentSeq)) nextSeq = currentSeq + 1;
      }
    }

    return `${prefix}-${String(nextSeq).padStart(5, '0')}`;
  }

  /**
   * Inicia uma nova solicitação e posiciona na primeira etapa do workflow
   */
  static async startWorkflow(requesterId: string, actorUserId: string, data: CreateRequestInput) {
    const employee = await prisma.employee.findFirst({
      where: { id: requesterId, deletedAt: null },
      include: {
        company: true,
        department: true,
        manager: true,
      },
    });

    if (!employee) {
      const error: any = new Error('Colaborador solicitante não encontrado');
      error.statusCode = 404;
      throw error;
    }

    // Localiza o tipo de solicitação
    const requestType = await prisma.requestType.findUnique({
      where: { code: data.requestTypeCode },
      include: {
        workflows: {
          where: { active: true },
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              include: { requiredRole: true },
            },
          },
        },
      },
    });

    if (!requestType || !requestType.active) {
      const error: any = new Error(`Tipo de solicitação "${data.requestTypeCode}" não está ativo ou não foi encontrado`);
      error.statusCode = 404;
      throw error;
    }

    const workflow = requestType.workflows[0] || null;
    const steps = workflow?.steps || [];
    const step1 = steps[0] || null;

    let initialStatus: any = 'ABERTO';
    let currentAssigneeId: string | null = null;
    let stepName = 'Abertura da Solicitação';

    if (step1) {
      stepName = step1.name;
      if (step1.approverType === 'DIRECT_MANAGER') {
        initialStatus = employee.managerId ? 'AGUARDANDO_GESTOR' : 'AGUARDANDO_RH';
        currentAssigneeId = employee.managerId || null;
      } else if (step1.approverType === 'SPECIFIC_ROLE') {
        const roleName = step1.requiredRole?.name?.toUpperCase() || '';
        initialStatus = roleName.includes('GESTOR') ? 'AGUARDANDO_GESTOR' : 'AGUARDANDO_RH';
      } else {
        initialStatus = 'EM_ANDAMENTO';
      }
    }

    const requestNumber = await this.generateRequestNumber();

    const request = await prisma.request.create({
      data: {
        requestNumber,
        requestTypeId: requestType.id,
        workflowId: workflow?.id || null,
        requesterId: employee.id,
        currentStepOrder: 1,
        currentAssigneeId,
        priority: data.priority || 'MEDIA',
        status: initialStatus,
        title: data.title,
        description: data.description || null,
        formData: data.formData || {},
      },
      include: {
        requestType: true,
        requester: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    // Registra histórico inicial de abertura
    await prisma.requestHistory.create({
      data: {
        requestId: request.id,
        actorId: actorUserId,
        action: 'CRIADA',
        toStatus: initialStatus,
        stepName,
        comment: 'Solicitação criada no portal Átrio',
      },
    });

    // Registra anexos se fornecidos
    if (data.attachments && data.attachments.length > 0) {
      await prisma.requestAttachment.createMany({
        data: data.attachments.map((att) => ({
          requestId: request.id,
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          fileSize: att.fileSize || 0,
          mimeType: att.mimeType || 'application/octet-stream',
          uploadedBy: actorUserId,
        })),
      });
    }

    // Registra trilha de auditoria
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId: employee.id,
        action: 'SOLICITACAO_WORKFLOW_CRIADA',
        entity: 'Request',
        recordId: request.id,
        newValue: {
          requestNumber,
          type: requestType.name,
          title: data.title,
          status: initialStatus,
        },
      },
    });

    return request;
  }

  /**
   * Valida se o usuário tem permissão para deliberar a etapa atual da solicitação
   */
  static async checkCanReview(
    request: any,
    actorUserId: string,
    actorEmployeeId?: string | null,
    userRoles: string[] = []
  ): Promise<boolean> {
    if (userRoles.includes('ADMIN') || userRoles.includes('RH')) {
      return true;
    }

    const steps = request.workflow?.steps || [];
    const currentStep = steps.find((s: any) => s.stepOrder === request.currentStepOrder);

    if (!currentStep) {
      return userRoles.includes('ADMIN') || userRoles.includes('RH');
    }

    if (currentStep.approverType === 'DIRECT_MANAGER') {
      return (
        actorEmployeeId !== null &&
        actorEmployeeId !== undefined &&
        actorEmployeeId === request.requester?.managerId
      );
    }

    if (currentStep.approverType === 'SPECIFIC_ROLE' && currentStep.requiredRole) {
      return userRoles.includes(currentStep.requiredRole.name);
    }

    return false;
  }

  /**
   * Avança a etapa atual do workflow (ou conclui a solicitação se for a última etapa)
   */
  static async advanceStep(
    requestId: string,
    actorUserId: string,
    actorEmployeeId: string | null | undefined,
    userRoles: string[],
    comment: string
  ) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        workflow: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              include: { requiredRole: true },
            },
          },
        },
      },
    });

    if (!request) {
      const error: any = new Error('Solicitação não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(request.status)) {
      const error: any = new Error(`A solicitação já está finalizada com status "${request.status}"`);
      error.statusCode = 400;
      throw error;
    }

    const canReview = await this.checkCanReview(request, actorUserId, actorEmployeeId, userRoles);
    if (!canReview) {
      const error: any = new Error('Você não possui autorização para avaliar a etapa atual desta solicitação');
      error.statusCode = 403;
      throw error;
    }

    const steps = request.workflow?.steps || [];
    const currentStep = steps.find((s) => s.stepOrder === request.currentStepOrder);
    const nextStep = steps.find((s) => s.stepOrder === request.currentStepOrder + 1);

    const fromStatus = request.status;
    let toStatus: any = 'CONCLUIDO';
    let nextAssigneeId: string | null = null;
    let nextStepOrder = request.currentStepOrder;
    let closedAt: Date | null = null;

    if (nextStep) {
      nextStepOrder = nextStep.stepOrder;
      if (nextStep.approverType === 'DIRECT_MANAGER') {
        toStatus = 'AGUARDANDO_GESTOR';
        nextAssigneeId = request.requester.managerId || null;
      } else if (nextStep.approverType === 'SPECIFIC_ROLE') {
        const roleName = nextStep.requiredRole?.name?.toUpperCase() || '';
        toStatus = roleName.includes('GESTOR') ? 'AGUARDANDO_GESTOR' : 'AGUARDANDO_RH';
      } else {
        toStatus = 'EM_ANDAMENTO';
      }
    } else {
      toStatus = 'CONCLUIDO';
      closedAt = new Date();
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: toStatus,
        currentStepOrder: nextStepOrder,
        currentAssigneeId: nextAssigneeId,
        closedAt,
      },
      include: {
        requestType: true,
        requester: {
          select: { id: true, name: true, registrationNumber: true },
        },
      },
    });

    // Registra histórico
    await prisma.requestHistory.create({
      data: {
        requestId,
        actorId: actorUserId,
        action: nextStep ? 'AVANCADA' : 'CONCLUIDA',
        fromStatus,
        toStatus,
        stepName: currentStep?.name || 'Etapa Concluída',
        comment,
      },
    });

    // Auditoria
    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId: actorEmployeeId || null,
        action: nextStep ? 'SOLICITACAO_ETAPA_AVANCADA' : 'SOLICITACAO_CONCLUIDA',
        entity: 'Request',
        recordId: requestId,
        previousValue: { status: fromStatus, stepOrder: request.currentStepOrder },
        newValue: { status: toStatus, stepOrder: nextStepOrder, comment },
      },
    });

    return updated;
  }

  /**
   * Rejeita a solicitação
   */
  static async reject(
    requestId: string,
    actorUserId: string,
    actorEmployeeId: string | null | undefined,
    userRoles: string[],
    comment: string
  ) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: true,
        workflow: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              include: { requiredRole: true },
            },
          },
        },
      },
    });

    if (!request) {
      const error: any = new Error('Solicitação não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(request.status)) {
      const error: any = new Error(`A solicitação já se encontra finalizada com status "${request.status}"`);
      error.statusCode = 400;
      throw error;
    }

    const canReview = await this.checkCanReview(request, actorUserId, actorEmployeeId, userRoles);
    if (!canReview) {
      const error: any = new Error('Você não possui autorização para deliberar esta solicitação');
      error.statusCode = 403;
      throw error;
    }

    const steps = request.workflow?.steps || [];
    const currentStep = steps.find((s) => s.stepOrder === request.currentStepOrder);

    const fromStatus = request.status;
    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'REJEITADO',
        closedAt: new Date(),
      },
    });

    await prisma.requestHistory.create({
      data: {
        requestId,
        actorId: actorUserId,
        action: 'REJEITADA',
        fromStatus,
        toStatus: 'REJEITADO',
        stepName: currentStep?.name || 'Avaliação',
        comment,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        employeeId: actorEmployeeId || null,
        action: 'SOLICITACAO_REJEITADA',
        entity: 'Request',
        recordId: requestId,
        previousValue: { status: fromStatus },
        newValue: { status: 'REJEITADO', comment },
      },
    });

    return updated;
  }

  /**
   * Adiciona um comentário/despacho no histórico da solicitação sem alterar seu status
   */
  static async addComment(requestId: string, actorUserId: string, comment: string) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      const error: any = new Error('Solicitação não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const history = await prisma.requestHistory.create({
      data: {
        requestId,
        actorId: actorUserId,
        action: 'COMENTADA',
        fromStatus: request.status,
        toStatus: request.status,
        comment,
      },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            employee: { select: { name: true } },
          },
        },
      },
    });

    return history;
  }

  /**
   * Solicitante cancela a solicitação enquanto não estiver finalizada
   */
  static async cancel(requestId: string, requesterEmployeeId: string, actorUserId: string) {
    const request = await prisma.request.findFirst({
      where: { id: requestId, requesterId: requesterEmployeeId },
    });

    if (!request) {
      const error: any = new Error('Solicitação não encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (['CONCLUIDO', 'REJEITADO', 'CANCELADO'].includes(request.status)) {
      const error: any = new Error('Não é possível cancelar uma solicitação que já foi finalizada');
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: 'CANCELADO',
        closedAt: new Date(),
      },
    });

    await prisma.requestHistory.create({
      data: {
        requestId,
        actorId: actorUserId,
        action: 'CANCELADA',
        fromStatus: request.status,
        toStatus: 'CANCELADO',
        comment: 'Solicitação cancelada pelo colaborador solicitante',
      },
    });

    return updated;
  }
}
