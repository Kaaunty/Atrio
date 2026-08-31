import { prisma } from '../../../database/prisma.js';

export interface CreateAuditLogParams {
  userId?: string | null;
  employeeId?: string | null;
  action: string;
  entity: string;
  recordId: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface QueryAuditLogParams {
  userId?: string;
  employeeId?: string;
  entity?: string;
  action?: string;
  search?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  pageSize?: number;
}

export class AuditService {
  /**
   * Grava um registro imutável de auditoria
   */
  static async log(params: CreateAuditLogParams) {
    try {
      return await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          employeeId: params.employeeId || null,
          action: params.action,
          entity: params.entity,
          recordId: params.recordId,
          previousValue: params.previousValue ? (params.previousValue as any) : undefined,
          newValue: params.newValue ? (params.newValue as any) : undefined,
          ipAddress: params.ipAddress || null,
          userAgent: params.userAgent || null,
        },
      });
    } catch (err) {
      console.error('⚠️ Falha ao registrar log de auditoria:', err);
      // Não interrompe o fluxo principal caso falhe o log assíncrono
      return null;
    }
  }

  /**
   * Consulta paginada de logs de auditoria com múltiplos filtros
   */
  static async list(query: QueryAuditLogParams) {
    const {
      userId,
      employeeId,
      entity,
      action,
      search,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;

    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (userId) where.userId = userId;
    if (employeeId) where.employeeId = employeeId;
    if (entity) where.entity = { equals: entity, mode: 'insensitive' };
    if (action) where.action = { equals: action, mode: 'insensitive' };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate instanceof Date ? startDate : new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = endDate instanceof Date ? endDate : new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { recordId: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              employee: { select: { id: true, name: true, registrationNumber: true } },
            },
          },
          employee: {
            select: { id: true, name: true, registrationNumber: true },
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
}
