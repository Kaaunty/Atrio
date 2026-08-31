import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service.js';
import { sendSuccess } from '../../../shared/response.js';

export class AuditController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = {
        userId: req.query.userId as string | undefined,
        employeeId: req.query.employeeId as string | undefined,
        entity: req.query.entity as string | undefined,
        action: req.query.action as string | undefined,
        search: req.query.search as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20,
      };

      const result = await AuditService.list(query);

      return sendSuccess({
        res,
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}
