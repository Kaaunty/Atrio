import { prisma } from '../../../database/prisma';
import {
  CreateChecklistTemplateDto,
  CreateLifecycleProcessDto,
  QueryLifecycleProcessesDto,
  CompleteTaskDto,
} from '../lifecycle.dto';
import { NotificationsService } from '../../notifications/services/notifications.service';

export class LifecycleService {
  /**
   * Garante a existência de templates padrão de Onboarding e Offboarding
   */
  static async ensureDefaultTemplates() {
    const onboardingCount = await prisma.checklistTemplate.count({
      where: { processType: 'ONBOARDING' },
    });

    if (onboardingCount === 0) {
      await prisma.checklistTemplate.create({
        data: {
          name: 'Onboarding Padrão - Admissão',
          processType: 'ONBOARDING',
          active: true,
          defaultTasks: [
            {
              title: 'Kit de Documentos e Assinaturas (RH)',
              description: 'Enviar kit de boas-vindas, coletar documentos admissionais e contrato assinado.',
              category: 'RH',
              dueDaysOffset: 0,
            },
            {
              title: 'Criar E-mail Corporativo e Acessos de Rede (TI)',
              description: 'Criar conta no Google Workspace/Active Directory e liberar acessos iniciais.',
              category: 'TI',
              dueDaysOffset: 0,
            },
            {
              title: 'Providenciar Crachá e Acesso Físico (Facilities)',
              description: 'Confeccionar crachá de identificação e autorizar catracas de acesso ao prédio.',
              category: 'FACILITIES',
              dueDaysOffset: 0,
            },
            {
              title: 'Preparar e Entregar Computador/Periféricos (TI)',
              description: 'Configurar notebook com imagem padrão da empresa e entregar termo de responsabilidade.',
              category: 'TI',
              dueDaysOffset: 0,
            },
            {
              title: 'Cadastrar no Ponto Eletrônico Control iD (RH)',
              description: 'Cadastrar matrícula e foto/biometria no REP para registro de jornada.',
              category: 'RH',
              dueDaysOffset: 1,
            },
            {
              title: 'Reunião de Alinhamento de 1º dia (Gestor)',
              description: 'Apresentar equipe, alinhar expectativas, mentor e plano de trabalho inicial.',
              category: 'GESTOR',
              dueDaysOffset: 0,
            },
            {
              title: 'Agendar Treinamento Institucional (RH)',
              description: 'Apresentação de cultura corporativa, políticas internas e código de conduta.',
              category: 'RH',
              dueDaysOffset: 2,
            },
          ],
        },
      });
    }

    const offboardingCount = await prisma.checklistTemplate.count({
      where: { processType: 'OFFBOARDING' },
    });

    if (offboardingCount === 0) {
      await prisma.checklistTemplate.create({
        data: {
          name: 'Offboarding Padrão - Desligamento',
          processType: 'OFFBOARDING',
          active: true,
          defaultTasks: [
            {
              title: 'Entrevista de Desligamento e Termos (RH)',
              description: 'Realizar entrevista de saída (Exit Interview) e assinar rescisão contratual.',
              category: 'RH',
              dueDaysOffset: 0,
            },
            {
              title: 'Bloquear Acessos a Sistemas e E-mail (TI)',
              description: 'Revogar permissões de sistemas, VPN, e-mail e chave de acesso no horário programado.',
              category: 'TI',
              dueDaysOffset: 0,
            },
            {
              title: 'Cancelar Liberação de Crachá Físico (Facilities)',
              description: 'Desativar permissão de entrada em catracas e áreas restritas.',
              category: 'FACILITIES',
              dueDaysOffset: 0,
            },
            {
              title: 'Recolher Equipamentos e Registrar Termo (TI)',
              description: 'Receber notebook, celular corporativo e periféricos verificando estado físico.',
              category: 'TI',
              dueDaysOffset: 0,
            },
            {
              title: 'Inativar no Ponto Eletrônico e Arquivar (RH)',
              description: 'Inativar cadastro no REP Control iD e arquivar prontuário do colaborador.',
              category: 'RH',
              dueDaysOffset: 1,
            },
          ],
        },
      });
    }
  }

  /**
   * Obtém lista de templates cadastrados
   */
  static async getAllTemplates() {
    await this.ensureDefaultTemplates();
    return prisma.checklistTemplate.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cria novo template de checklist
   */
  static async createTemplate(dto: CreateChecklistTemplateDto) {
    return prisma.checklistTemplate.create({
      data: {
        name: dto.name,
        processType: dto.processType,
        departmentId: dto.departmentId,
        defaultTasks: dto.defaultTasks as any,
        active: dto.active,
      },
    });
  }

  /**
   * Lista os processos de Onboarding/Offboarding com estatísticas de progresso
   */
  static async getProcesses(options: QueryLifecycleProcessesDto) {
    await this.ensureDefaultTemplates();
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (options.processType) where.processType = options.processType;
    if (options.status) where.status = options.status;
    if (options.search) {
      where.employee = {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { registrationNumber: { contains: options.search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      prisma.lifecycleProcess.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              department: { select: { name: true } },
              position: { select: { title: true } },
            },
          },
          template: { select: { name: true } },
          tasks: { select: { id: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.lifecycleProcess.count({ where }),
    ]);

    const mapped = items.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === 'CONCLUIDA').length;
      const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: p.id,
        processType: p.processType,
        status: p.status,
        targetDate: p.targetDate,
        completedAt: p.completedAt,
        createdAt: p.createdAt,
        employee: p.employee,
        templateName: p.template?.name || 'Checklist Personalizado',
        totalTasks,
        completedTasks,
        progressPercentage,
      };
    });

    return {
      data: mapped,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Inicia um novo processo de Onboarding/Offboarding para um colaborador
   */
  static async createProcess(initiatedById: string, dto: CreateLifecycleProcessDto) {
    await this.ensureDefaultTemplates();

    const employee = await prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) {
      throw new Error('Colaborador não encontrado.');
    }

    // Buscar template padrão se não informado
    let template = null;
    if (dto.templateId) {
      template = await prisma.checklistTemplate.findUnique({ where: { id: dto.templateId } });
    } else {
      template = await prisma.checklistTemplate.findFirst({
        where: { processType: dto.processType, active: true },
      });
    }

    const targetDate = new Date(dto.targetDate);

    // Criar o processo
    const process = await prisma.lifecycleProcess.create({
      data: {
        employeeId: dto.employeeId,
        processType: dto.processType,
        templateId: template?.id || null,
        status: 'EM_ANDAMENTO',
        targetDate,
        initiatedById,
      },
    });

    // Tarefas a serem geradas
    let defaultTasks: any[] = [];
    if (template && Array.isArray(template.defaultTasks)) {
      defaultTasks = template.defaultTasks as any[];
    }

    // Gerar tarefas baseadas no template
    const tasksToCreate = defaultTasks.map((t) => {
      const dueDate = new Date(targetDate);
      dueDate.setDate(dueDate.getDate() + (t.dueDaysOffset || 0));

      return {
        processId: process.id,
        title: t.title,
        description: t.description || null,
        category: t.category || 'RH',
        dueDate,
        status: 'PENDENTE' as const,
      };
    });

    // Adicionar tarefas customizadas se informadas
    if (dto.customTasks && dto.customTasks.length > 0) {
      dto.customTasks.forEach((ct) => {
        tasksToCreate.push({
          processId: process.id,
          title: ct.title,
          description: ct.description || null,
          category: ct.category || 'RH',
          dueDate: ct.dueDate ? new Date(ct.dueDate) : targetDate,
          status: 'PENDENTE' as const,
        });
      });
    }

    if (tasksToCreate.length > 0) {
      await prisma.lifecycleTask.createMany({
        data: tasksToCreate,
      });
    }

    // Se o colaborador possuir conta de usuário no sistema, notificar in-app
    const user = await prisma.user.findFirst({ where: { employeeId: dto.employeeId } });
    if (user) {
      const processLabel = dto.processType === 'ONBOARDING' ? 'Onboarding (Integração)' : 'Offboarding (Desligamento)';
      setImmediate(async () => {
        await NotificationsService.notifyUser({
          userId: user.id,
          title: `Novo Processo de ${processLabel} Iniciado`,
          message: `Seu processo de ${processLabel} foi iniciado. Acompanhe os itens do checklist junto ao seu gestor e RH.`,
          type: 'INFO',
          category: 'SISTEMA',
          actionUrl: `/rh/processos/${process.id}`,
        });
      });
    }

    return this.getProcessById(process.id);
  }

  /**
   * Obtém detalhes de um processo com tarefas agrupadas por categoria
   */
  static async getProcessById(processId: string) {
    const process = await prisma.lifecycleProcess.findUnique({
      where: { id: processId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            company: { select: { tradeName: true } },
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        },
        template: { select: { name: true } },
        initiatedBy: { select: { id: true, email: true } },
        tasks: {
          include: {
            assignedUser: { select: { id: true, email: true } },
            completedBy: { select: { id: true, email: true } },
          },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!process) {
      throw new Error('Processo de Onboarding/Offboarding não encontrado.');
    }

    const totalTasks = process.tasks.length;
    const completedTasks = process.tasks.filter((t) => t.status === 'CONCLUIDA').length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Agrupamento por categoria (RH, TI, GESTOR, FACILITIES, COLABORADOR)
    const groupedTasks = {
      RH: process.tasks.filter((t) => t.category === 'RH'),
      TI: process.tasks.filter((t) => t.category === 'TI'),
      GESTOR: process.tasks.filter((t) => t.category === 'GESTOR'),
      FACILITIES: process.tasks.filter((t) => t.category === 'FACILITIES'),
      COLABORADOR: process.tasks.filter((t) => t.category === 'COLABORADOR'),
    };

    return {
      ...process,
      totalTasks,
      completedTasks,
      progressPercentage,
      groupedTasks,
    };
  }

  /**
   * Conclui uma tarefa do checklist e verifica se todo o processo foi finalizado
   */
  static async completeTask(taskId: string, completedById: string, notes?: string) {
    const task = await prisma.lifecycleTask.findUnique({
      where: { id: taskId },
      include: { process: true },
    });

    if (!task) {
      throw new Error('Tarefa não encontrada.');
    }

    const updatedTask = await prisma.lifecycleTask.update({
      where: { id: taskId },
      data: {
        status: 'CONCLUIDA',
        completedAt: new Date(),
        completedById,
        ...(notes && { notes }),
      },
    });

    // Verificar se restam tarefas pendentes no processo
    const pendingTasks = await prisma.lifecycleTask.count({
      where: {
        processId: task.processId,
        status: { notIn: ['CONCLUIDA', 'CANCELADA'] },
      },
    });

    // Se todas as tarefas foram concluídas, finalizar o processo
    if (pendingTasks === 0) {
      await prisma.lifecycleProcess.update({
        where: { id: task.processId },
        data: {
          status: 'CONCLUIDO',
          completedAt: new Date(),
        },
      });
    }

    return updatedTask;
  }

  /**
   * Obtém as tarefas pendentes de Onboarding/Offboarding atribuídas ao usuário logado
   */
  static async getMyPendingTasks(userId: string) {
    const tasks = await prisma.lifecycleTask.findMany({
      where: {
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
        OR: [{ assignedUserId: userId }, { assignedUserId: null }],
      },
      include: {
        process: {
          include: {
            employee: {
              select: {
                name: true,
                registrationNumber: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks;
  }
}
