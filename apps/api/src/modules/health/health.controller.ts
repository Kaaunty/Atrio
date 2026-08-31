import { Request, Response } from 'express';
import { prisma } from '../../database/prisma.js';
import { sendSuccess } from '../../shared/response.js';

export class HealthController {
  static async check(req: Request, res: Response) {
    let databaseStatus = 'disconnected';
    let dbError = null;

    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error: any) {
      dbError = error.message;
    }

    return sendSuccess({
      res,
      message: 'API RH Digital operacional',
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: {
          status: databaseStatus,
          error: dbError,
        },
      },
    });
  }
}
