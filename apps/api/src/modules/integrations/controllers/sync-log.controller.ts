import { Request, Response } from 'express';
import { prisma } from '../../../database/prisma.js';
import { sendSuccess, sendError } from '../../../shared/response.js';

export class SyncLogController {
  /**
   * GET /api/v1/integrations/logs
   */
  static async list(req: Request, res: Response) {
    try {
      const {
        integrationId,
        deviceId,
        status,
        startDate,
        endDate,
        page = '1',
        pageSize = '20',
      } = req.query;

      const pageNum = parseInt(String(page), 10) || 1;
      const sizeNum = parseInt(String(pageSize), 10) || 20;
      const skip = (pageNum - 1) * sizeNum;

      const where: any = {};
      if (integrationId) where.integrationId = String(integrationId);
      if (deviceId) where.deviceId = String(deviceId);
      if (status) where.status = String(status);

      if (startDate || endDate) {
        where.startedAt = {};
        if (startDate) where.startedAt.gte = new Date(String(startDate));
        if (endDate) where.startedAt.lte = new Date(String(endDate));
      }

      const [total, items] = await Promise.all([
        prisma.timeClockSyncLog.count({ where }),
        prisma.timeClockSyncLog.findMany({
          where,
          skip,
          take: sizeNum,
          orderBy: { startedAt: 'desc' },
          include: {
            integration: { select: { id: true, key: true, name: true } },
            device: {
              select: {
                id: true,
                name: true,
                model: true,
                serialNumber: true,
                unit: { select: { name: true } },
              },
            },
          },
        }),
      ]);

      return sendSuccess({
        res,
        data: items,
        meta: {
          page: pageNum,
          pageSize: sizeNum,
          total,
          totalPages: Math.ceil(total / sizeNum),
        },
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao consultar logs de sincronização',
      });
    }
  }

  /**
   * GET /api/v1/integrations/logs/:id
   */
  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const log = await prisma.timeClockSyncLog.findUnique({
        where: { id },
        include: {
          integration: true,
          device: {
            include: { unit: true },
          },
        },
      });

      if (!log) {
        return sendError({
          res,
          statusCode: 404,
          message: 'Log de sincronização não encontrado',
        });
      }

      return sendSuccess({
        res,
        data: log,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao obter detalhes do log',
      });
    }
  }
}
