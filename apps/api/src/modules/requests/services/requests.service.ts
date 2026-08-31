import { prisma } from '../../../database/prisma.js';
import { CreateRequestInput, CreateRequestTypeInput, QueryRequestsInput } from '../requests.dto.js';
import { WorkflowEngineService } from './workflow-engine.service.js';

export class RequestsService {
  /**
   * Inicializa tipos padrão de solicitação e esteiras caso o banco esteja vazio
   */
  static async seedDefaultTypes() {
    const count = await prisma.requestType.count();
    if (count > 0) return;

    // Busca role de RH para vincular etapas
    const rhRole = await prisma.role.findFirst({
      where: { name: 'RH' },
    });

    // 1. Declaração de Vínculo
    const decVinculo = await prisma.requestType.create({
      data: {
        code: 'DECLARACAO_VINCULO',
        name: 'Declaração de Vínculo Empregatício',
        description: 'Solicitação de declaração oficial de trabalho e vínculo com a empresa.',
        category: 'DECLARACOES',
        icon: 'FileText',
        formSchema: [
          {
            id: 'finalidade',
            label: 'Finalidade da Declaração',
            type: 'select',
            options: [
              'Abertura de Conta Bancária',
              'Comprovação de Renda / Aluguel',
              'Faculdade / Instituição de Ensino',
              'Visto Consular / Viagem',
              'Outra Finalidade',
            ],
            required: true,
          },
          {
            id: 'incluirSalario',
            label: 'Discriminar Valor de Salário no Documento?',
            type: 'select',
            options: ['Sim', 'Não'],
            required: true,
          },
        ],
        workflows: {
          create: {
            name: 'Fluxo Direto RH',
            steps: {
              create: [
                {
                  stepOrder: 1,
                  name: 'Validação e Emissão pelo RH',
                  approverType: 'SPECIFIC_ROLE',
                  requiredRoleId: rhRole?.id || null,
                  timeoutDays: 3,
                },
              ],
            },
          },
        },
      },
    });

    // 2. Alteração Cadastral
    await prisma.requestType.create({
      data: {
        code: 'ALTERACAO_CADASTRAL',
        name: 'Alteração de Dados Cadastrais',
        description: 'Atualização de endereço residencial, dados bancários, estado civil ou contato.',
        category: 'CADASTRO',
        icon: 'UserCheck',
        formSchema: [
          {
            id: 'tipoDado',
            label: 'Dado Cadastral a ser Alterado',
            type: 'select',
            options: [
              'Endereço Residencial',
              'Conta Bancária / Chave PIX',
              'Estado Civil / Nome',
              'Telefone / Contato de Emergência',
            ],
            required: true,
          },
          {
            id: 'novoValor',
            label: 'Novas Informações Completas',
            type: 'textarea',
            placeholder: 'Informe o novo endereço, agência/conta ou número atualizado...',
            required: true,
          },
        ],
        workflows: {
          create: {
            name: 'Homologação Cadastral RH',
            steps: {
              create: [
                {
                  stepOrder: 1,
                  name: 'Conferência e Atualização no Sistema (RH)',
                  approverType: 'SPECIFIC_ROLE',
                  requiredRoleId: rhRole?.id || null,
                  timeoutDays: 2,
                },
              ],
            },
          },
        },
      },
    });

    // 3. Solicitação Geral (2 Etapas: Gestor -> RH)
    await prisma.requestType.create({
      data: {
        code: 'SOLICITACAO_GERAL',
        name: 'Solicitação / Atendimento Geral',
        description: 'Solicitações diversas, dúvidas ou demandas operacionais com aprovação da chefia.',
        category: 'GERAL',
        icon: 'MessageSquare',
        formSchema: [
          {
            id: 'setorDestino',
            label: 'Setor de Destino',
            type: 'select',
            options: ['Recursos Humanos / DP', 'Benefícios', 'Saúde e Segurança (SST)', 'TI / Suporte'],
            required: true,
          },
          {
            id: 'detalhamento',
            label: 'Detalhamento do Pedido',
            type: 'textarea',
            placeholder: 'Descreva detalhadamente o que você precisa...',
            required: true,
          },
        ],
        workflows: {
          create: {
            name: 'Esteira Padrão: Gestor + RH',
            steps: {
              create: [
                {
                  stepOrder: 1,
                  name: 'Parecer da Chefia Imediata',
                  approverType: 'DIRECT_MANAGER',
                  timeoutDays: 2,
                },
                {
                  stepOrder: 2,
                  name: 'Atendimento e Conclusão pelo RH',
                  approverType: 'SPECIFIC_ROLE',
                  requiredRoleId: rhRole?.id || null,
                  timeoutDays: 3,
                },
              ],
            },
          },
        },
      },
    });
  }

  /**
   * Lista o catálogo de tipos de solicitação disponíveis
   */
  static async listTypes() {
    await this.seedDefaultTypes();

    const types = await prisma.requestType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        workflows: {
          where: { active: true },
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
            },
          },
        },
      },
    });

    return types;
  }

  /**
   * Cadastra novo tipo de solicitação e workflow customizado (Admin)
   */
  static async createType(data: CreateRequestTypeInput) {
    const existing = await prisma.requestType.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      const error: any = new Error(`Já existe um tipo de solicitação com o código "${data.code}"`);
      error.statusCode = 400;
      throw error;
    }

    const requestType = await prisma.requestType.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description || null,
        category: data.category || 'GERAL',
        icon: data.icon || 'FileText',
        formSchema: data.formSchema || [],
        allowAttachments: data.allowAttachments,
        workflows: {
          create: {
            name: `Workflow - ${data.name}`,
            steps: {
              create: (data.steps || []).map((s, idx) => ({
                stepOrder: idx + 1,
                name: s.name,
                approverType: s.approverType,
                requiredRoleId: s.requiredRoleId || null,
                timeoutDays: s.timeoutDays || null,
              })),
            },
          },
        },
      },
      include: {
        workflows: {
          include: { steps: true },
        },
      },
    });

    return requestType;
  }

  /**
   * Abre nova solicitação através da engine
   */
  static async createRequest(requesterId: string, actorUserId: string, data: CreateRequestInput) {
    return WorkflowEngineService.startWorkflow(requesterId, actorUserId, data);
  }

  /**
   * Lista solicitações do próprio colaborador logado
   */
  static async listMyRequests(employeeId: string, query: QueryRequestsInput) {
    const { status, category, search, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      requesterId: employeeId,
    };

    if (status) where.status = status;
    if (category) where.requestType = { category };
    if (search) {
      where.OR = [
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          requestType: true,
          workflow: {
            include: {
              steps: { orderBy: { stepOrder: 'asc' } },
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Caixa de Entrada de solicitações aguardando deliberação do usuário (Gestor / RH / Admin)
   */
  static async listInbox(
    actorUserId: string,
    actorEmployeeId: string | null | undefined,
    userRoles: string[],
    query: QueryRequestsInput
  ) {
    const { status, category, search, page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const isAdmOrRh = userRoles.includes('ADMIN') || userRoles.includes('RH');

    // Monta cláusula OR de visibilidade da caixa de entrada
    const orConditions: any[] = [];

    // 1. Se for Gestor direto de liderados
    if (actorEmployeeId) {
      orConditions.push({
        status: 'AGUARDANDO_GESTOR',
        requester: { managerId: actorEmployeeId },
      });
      orConditions.push({
        currentAssigneeId: actorEmployeeId,
      });
    }

    // 2. Se for RH ou Admin, enxerga solicitações na fila do RH ou gerais em andamento
    if (isAdmOrRh) {
      orConditions.push({
        status: { in: ['AGUARDANDO_RH', 'EM_ANDAMENTO', 'ABERTO'] },
      });
    }

    if (orConditions.length === 0) {
      return {
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      };
    }

    const where: any = {
      OR: orConditions,
    };

    if (status) where.status = status;
    if (category) where.requestType = { category };
    if (search) {
      where.AND = [
        {
          OR: [
            { requestNumber: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } },
            { requester: { name: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.request.count({ where }),
      prisma.request.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          requestType: true,
          requester: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              department: { select: { name: true } },
              position: { select: { title: true } },
            },
          },
          workflow: {
            include: {
              steps: { orderBy: { stepOrder: 'asc' } },
            },
          },
        },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Consulta os detalhes de uma solicitação específica com esteira, respostas e histórico
   */
  static async getById(
    requestId: string,
    actorUserId: string,
    actorEmployeeId?: string | null,
    userRoles: string[] = []
  ) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requestType: true,
        requester: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            cpf: true,
            email: true,
            department: { select: { id: true, name: true } },
            position: { select: { id: true, title: true } },
            manager: { select: { id: true, name: true } },
          },
        },
        workflow: {
          include: {
            steps: {
              orderBy: { stepOrder: 'asc' },
              include: { requiredRole: true },
            },
          },
        },
        attachments: {
          include: {
            uploader: { select: { id: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        history: {
          orderBy: { createdAt: 'asc' },
          include: {
            actor: {
              select: {
                id: true,
                email: true,
                employee: { select: { name: true } },
              },
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

    const canReview = await WorkflowEngineService.checkCanReview(
      request,
      actorUserId,
      actorEmployeeId,
      userRoles
    );

    return {
      request,
      canReview,
    };
  }
}
