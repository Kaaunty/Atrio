import { prisma } from '../../../database/prisma.js';
import { cleanCPF } from '../../../shared/utils/cpf.js';
import {
  CreateEmployeeInput,
  CreateTimelineEventInput,
  QueryEmployeeInput,
  UpdateEmployeeInput,
} from '../employee.dto.js';
import { HierarchyService } from './hierarchy.service.js';

export class EmployeeService {
  /**
   * Listagem paginada com múltiplos filtros e contagens
   */
  static async list(query: QueryEmployeeInput) {
    const {
      search,
      companyId,
      unitId,
      departmentId,
      positionId,
      managerId,
      status,
      contractType,
      page = 1,
      pageSize = 20,
    } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };

    if (companyId) where.companyId = companyId;
    if (unitId) where.unitId = unitId;
    if (departmentId) where.departmentId = departmentId;
    if (positionId) where.positionId = positionId;
    if (managerId) where.managerId = managerId;
    if (status) where.status = status;
    if (contractType) where.contractType = contractType;

    if (search) {
      const cleanSearch = search.trim();
      const cleanedCpfSearch = cleanCPF(cleanSearch);

      where.OR = [
        { name: { contains: cleanSearch, mode: 'insensitive' } },
        { email: { contains: cleanSearch, mode: 'insensitive' } },
        { registrationNumber: { contains: cleanSearch, mode: 'insensitive' } },
        { code: { contains: cleanSearch, mode: 'insensitive' } },
      ];

      if (cleanedCpfSearch.length >= 3) {
        where.OR.push({ cpf: { contains: cleanedCpfSearch } });
      }
    }

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          company: {
            select: { id: true, tradeName: true, legalName: true },
          },
          unit: {
            select: { id: true, name: true, city: true, state: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          position: {
            select: { id: true, title: true, level: true },
          },
          manager: {
            select: { id: true, name: true, registrationNumber: true },
          },
          _count: {
            select: {
              subordinates: { where: { deletedAt: null } },
            },
          },
        },
      }),
    ]);

    return {
      items: employees,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Estatísticas agregadas de colaboradores por status
   */
  static async getStats(companyId?: string, departmentId?: string) {
    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;
    if (departmentId) where.departmentId = departmentId;

    const [total, grouped] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.groupBy({
        by: ['status'],
        where,
        _count: { status: true },
      }),
    ]);

    const statusMap = grouped.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active: statusMap['ATIVO'] || 0,
      vacation: statusMap['FERIAS'] || 0,
      leave: statusMap['AFASTADO'] || 0,
      terminated: statusMap['DESLIGADO'] || 0,
    };
  }

  /**
   * Busca detalhes completos do colaborador
   */
  static async getById(id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        unit: true,
        department: true,
        position: true,
        manager: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            email: true,
            position: { select: { title: true, level: true } },
            department: { select: { name: true } },
          },
        },
        subordinates: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            email: true,
            status: true,
            position: { select: { title: true, level: true } },
            department: { select: { name: true } },
          },
        },
        history: {
          orderBy: { eventDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            subordinates: { where: { deletedAt: null } },
            history: true,
          },
        },
      },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return employee;
  }

  /**
   * Cadastro de novo colaborador com registro automático de Admissão na Timeline
   */
  static async create(data: CreateEmployeeInput) {
    const cleanedCpf = cleanCPF(data.cpf);

    // Validação de unicidade de CPF
    const existingCpf = await prisma.employee.findFirst({
      where: { cpf: cleanedCpf, deletedAt: null },
    });
    if (existingCpf) {
      const error: any = new Error('Já existe um colaborador cadastrado com este CPF');
      error.statusCode = 400;
      throw error;
    }

    // Validação de unicidade de E-mail
    const existingEmail = await prisma.employee.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingEmail) {
      const error: any = new Error('Já existe um colaborador cadastrado com este e-mail');
      error.statusCode = 400;
      throw error;
    }

    // Validação de unicidade de Matrícula por Empresa
    const existingReg = await prisma.employee.findFirst({
      where: {
        companyId: data.companyId,
        registrationNumber: data.registrationNumber,
        deletedAt: null,
      },
    });
    if (existingReg) {
      const error: any = new Error('Já existe um colaborador cadastrado com esta matrícula nesta empresa');
      error.statusCode = 400;
      throw error;
    }

    // Validação de Gestor
    if (data.managerId) {
      const manager = await prisma.employee.findFirst({
        where: { id: data.managerId, deletedAt: null },
      });
      if (!manager) {
        const error: any = new Error('Gestor informado não foi encontrado');
        error.statusCode = 400;
        throw error;
      }
    }

    // Criação atômica com Timeline de Admissão
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          code: data.code,
          registrationNumber: data.registrationNumber,
          name: data.name,
          cpf: cleanedCpf,
          email: data.email,
          phone: data.phone,
          birthDate: data.birthDate
            ? data.birthDate instanceof Date
              ? data.birthDate
              : new Date(data.birthDate)
            : null,
          address: data.address as any,
          emergencyContact: data.emergencyContact as any,
          avatarUrl: data.avatarUrl,
          salary: data.salary !== undefined && data.salary !== null ? data.salary : null,
          companyId: data.companyId,
          unitId: data.unitId,
          departmentId: data.departmentId,
          positionId: data.positionId,
          managerId: data.managerId,
          admissionDate:
            data.admissionDate instanceof Date
              ? data.admissionDate
              : new Date(data.admissionDate),
          contractType: data.contractType || 'CLT',
          workScheduleId: data.workScheduleId,
          status: data.status || 'ATIVO',
        },
        include: {
          company: true,
          unit: true,
          department: true,
          position: true,
          manager: true,
        },
      });

      // Criação do evento histórico inicial de Admissão
      await tx.employeeHistory.create({
        data: {
          employeeId: employee.id,
          eventType: 'ADMISSAO',
          description: `Admissão do colaborador ${employee.name} na empresa ${employee.company.tradeName}`,
          eventDate: data.admissionDate,
          newData: {
            registrationNumber: employee.registrationNumber,
            contractType: employee.contractType,
            company: employee.company.tradeName,
            department: employee.department?.name || null,
            position: employee.position?.title || null,
            manager: employee.manager?.name || null,
            salary: employee.salary ? Number(employee.salary) : null,
            admissionDate: employee.admissionDate,
          },
        },
      });

      return employee;
    });

    return result;
  }

  /**
   * Atualização cadastral/funcional com detecção automática de alterações e histórico imutável
   */
  static async update(id: string, data: UpdateEmployeeInput) {
    const current = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        unit: true,
        department: true,
        position: true,
        manager: true,
      },
    });

    if (!current) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const cleanedCpf = data.cpf ? cleanCPF(data.cpf) : undefined;

    // Validações de duplicidade
    if (cleanedCpf && cleanedCpf !== current.cpf) {
      const existing = await prisma.employee.findFirst({
        where: { cpf: cleanedCpf, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        const error: any = new Error('Já existe outro colaborador cadastrado com este CPF');
        error.statusCode = 400;
        throw error;
      }
    }

    if (data.email && data.email !== current.email) {
      const existing = await prisma.employee.findFirst({
        where: { email: data.email, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        const error: any = new Error('Já existe outro colaborador cadastrado com este e-mail');
        error.statusCode = 400;
        throw error;
      }
    }

    const targetCompanyId = data.companyId || current.companyId;
    const targetRegNumber = data.registrationNumber || current.registrationNumber;

    if (
      (data.registrationNumber && data.registrationNumber !== current.registrationNumber) ||
      (data.companyId && data.companyId !== current.companyId)
    ) {
      const existing = await prisma.employee.findFirst({
        where: {
          companyId: targetCompanyId,
          registrationNumber: targetRegNumber,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existing) {
        const error: any = new Error('Já existe outro colaborador com esta matrícula nesta empresa');
        error.statusCode = 400;
        throw error;
      }
    }

    // Prevenção de loops de gestão
    if (data.managerId !== undefined && data.managerId !== current.managerId) {
      if (data.managerId) {
        const wouldLoop = await HierarchyService.wouldCreateManagementCycle(id, data.managerId);
        if (wouldLoop) {
          const error: any = new Error(
            'Operação inválida: a escolha deste gestor geraria auto-gestão ou um ciclo hierárquico'
          );
          error.statusCode = 400;
          throw error;
        }
      }
    }

    // Busca dados complementares para descrição rica dos eventos de timeline
    const eventDate: Date = data.eventDate
      ? data.eventDate instanceof Date
        ? data.eventDate
        : new Date(data.eventDate)
      : new Date();
    const historyEventsToCreate: {
      eventType: any;
      description: string;
      eventDate: Date;
      previousData?: any;
      newData?: any;
    }[] = [];

    // 1. Mudança de Cargo
    if (data.positionId !== undefined && data.positionId !== current.positionId) {
      let newPositionTitle = 'Nenhum';
      if (data.positionId) {
        const newPos = await prisma.position.findUnique({ where: { id: data.positionId } });
        newPositionTitle = newPos ? `${newPos.title} (${newPos.level})` : 'Novo Cargo';
      }
      const oldTitle = current.position ? `${current.position.title} (${current.position.level})` : 'Nenhum';

      historyEventsToCreate.push({
        eventType: 'MUDANCA_CARGO',
        description:
          data.reason ||
          `Mudança de cargo de "${oldTitle}" para "${newPositionTitle}"`,
        eventDate,
        previousData: { positionId: current.positionId, title: oldTitle },
        newData: { positionId: data.positionId, title: newPositionTitle },
      });
    }

    // 2. Mudança de Setor
    if (data.departmentId !== undefined && data.departmentId !== current.departmentId) {
      let newDeptName = 'Nenhum';
      if (data.departmentId) {
        const newDept = await prisma.department.findUnique({ where: { id: data.departmentId } });
        newDeptName = newDept?.name || 'Novo Setor';
      }
      const oldName = current.department?.name || 'Nenhum';

      historyEventsToCreate.push({
        eventType: 'MUDANCA_SETOR',
        description:
          data.reason ||
          `Transferência de setor de "${oldName}" para "${newDeptName}"`,
        eventDate,
        previousData: { departmentId: current.departmentId, name: oldName },
        newData: { departmentId: data.departmentId, name: newDeptName },
      });
    }

    // 3. Mudança de Gestor
    if (data.managerId !== undefined && data.managerId !== current.managerId) {
      let newManagerName = 'Sem gestor direto';
      if (data.managerId) {
        const newMgr = await prisma.employee.findUnique({ where: { id: data.managerId } });
        newManagerName = newMgr?.name || 'Novo Gestor';
      }
      const oldManagerName = current.manager?.name || 'Sem gestor direto';

      historyEventsToCreate.push({
        eventType: 'MUDANCA_GESTOR',
        description:
          data.reason ||
          `Alteração de gestor imediato de "${oldManagerName}" para "${newManagerName}"`,
        eventDate,
        previousData: { managerId: current.managerId, name: oldManagerName },
        newData: { managerId: data.managerId, name: newManagerName },
      });
    }

    // 4. Alteração Salarial
    if (data.salary !== undefined && data.salary !== null) {
      const currentSalaryNum = current.salary ? Number(current.salary) : 0;
      const newSalaryNum = Number(data.salary);

      if (currentSalaryNum !== newSalaryNum) {
        historyEventsToCreate.push({
          eventType: 'ALTERACAO_SALARIAL',
          description:
            data.reason ||
            `Reajuste salarial de R$ ${currentSalaryNum.toFixed(2)} para R$ ${newSalaryNum.toFixed(2)}`,
          eventDate,
          previousData: { salary: currentSalaryNum },
          newData: { salary: newSalaryNum },
        });
      }
    }

    // 5. Alteração de Status
    if (data.status !== undefined && data.status !== current.status) {
      let eventType: any = 'OUTRO';
      let defaultDesc = `Status alterado de ${current.status} para ${data.status}`;

      if (data.status === 'FERIAS') {
        eventType = 'FERIAS';
        defaultDesc = 'Início de período de férias';
      } else if (data.status === 'AFASTADO') {
        eventType = 'AFASTAMENTO';
        defaultDesc = 'Afastamento temporário do colaborador';
      } else if (data.status === 'DESLIGADO') {
        eventType = 'DESLIGAMENTO';
        defaultDesc = 'Desligamento do colaborador da organização';
      }

      historyEventsToCreate.push({
        eventType,
        description: data.reason || defaultDesc,
        eventDate,
        previousData: { status: current.status },
        newData: { status: data.status, terminationDate: data.terminationDate },
      });
    }

    // Execução da atualização e inserção atômica na Timeline
    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(cleanedCpf ? { cpf: cleanedCpf } : {}),
          ...(data.email ? { email: data.email } : {}),
          ...(data.registrationNumber ? { registrationNumber: data.registrationNumber } : {}),
          ...(data.code !== undefined ? { code: data.code } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.birthDate !== undefined
            ? {
                birthDate: data.birthDate
                  ? data.birthDate instanceof Date
                    ? data.birthDate
                    : new Date(data.birthDate)
                  : null,
              }
            : {}),
          ...(data.address !== undefined ? { address: data.address as any } : {}),
          ...(data.emergencyContact !== undefined ? { emergencyContact: data.emergencyContact as any } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
          ...(data.salary !== undefined ? { salary: data.salary } : {}),
          ...(data.companyId ? { companyId: data.companyId } : {}),
          ...(data.unitId !== undefined ? { unitId: data.unitId } : {}),
          ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
          ...(data.positionId !== undefined ? { positionId: data.positionId } : {}),
          ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
          ...(data.admissionDate !== undefined
            ? {
                admissionDate:
                  data.admissionDate instanceof Date
                    ? data.admissionDate
                    : new Date(data.admissionDate),
              }
            : {}),
          ...(data.contractType !== undefined ? { contractType: data.contractType } : {}),
          ...(data.workScheduleId !== undefined ? { workScheduleId: data.workScheduleId } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.terminationDate !== undefined
            ? {
                terminationDate: data.terminationDate
                  ? data.terminationDate instanceof Date
                    ? data.terminationDate
                    : new Date(data.terminationDate)
                  : null,
              }
            : {}),
        },
        include: {
          company: true,
          unit: true,
          department: true,
          position: true,
          manager: true,
        },
      });

      for (const hist of historyEventsToCreate) {
        await tx.employeeHistory.create({
          data: {
            employeeId: id,
            eventType: hist.eventType,
            description: hist.description,
            eventDate: hist.eventDate,
            previousData: hist.previousData,
            newData: hist.newData,
          },
        });
      }

      return emp;
    });

    return updated;
  }

  /**
   * Soft delete / Desligamento de colaborador com registro na timeline
   */
  static async delete(id: string, reason?: string) {
    const current = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!current) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const now = new Date();

    await prisma.$transaction([
      prisma.employee.update({
        where: { id },
        data: {
          deletedAt: now,
          status: 'DESLIGADO',
          terminationDate: now,
        },
      }),
      prisma.employeeHistory.create({
        data: {
          employeeId: id,
          eventType: 'DESLIGAMENTO',
          description: reason || 'Desligamento e arquivamento do colaborador',
          eventDate: now,
          previousData: { status: current.status },
          newData: { status: 'DESLIGADO', terminationDate: now },
        },
      }),
    ]);

    return { success: true, message: 'Colaborador desligado com sucesso' };
  }

  /**
   * Lista colaboradores liderados diretamente por este gestor
   */
  static async getSubordinates(id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador gestor não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const subordinates = await prisma.employee.findMany({
      where: { managerId: id, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        position: { select: { id: true, title: true, level: true } },
        department: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        _count: {
          select: {
            subordinates: { where: { deletedAt: null } },
          },
        },
      },
    });

    return subordinates;
  }

  /**
   * Lista eventos cronológicos da Timeline do colaborador
   */
  static async getTimeline(id: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const timeline = await prisma.employeeHistory.findMany({
      where: { employeeId: id },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: {
          select: { id: true, email: true },
        },
      },
    });

    return timeline;
  }

  /**
   * Adiciona um evento avulso/manual na timeline
   */
  static async createTimelineEvent(id: string, data: CreateTimelineEventInput, registeredBy?: string) {
    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
    });

    if (!employee) {
      const error: any = new Error('Colaborador não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const event = await prisma.employeeHistory.create({
      data: {
        employeeId: id,
        eventType: data.eventType,
        description: data.description,
        eventDate:
          data.eventDate instanceof Date
            ? data.eventDate
            : new Date(data.eventDate),
        previousData: data.previousData ? (data.previousData as any) : undefined,
        newData: data.newData ? (data.newData as any) : undefined,
        registeredBy,
      },
      include: {
        author: { select: { id: true, email: true } },
      },
    });

    return event;
  }
}
