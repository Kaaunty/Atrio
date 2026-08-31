import { Request, Response, NextFunction } from 'express';
import {
  createVacationRequestSchema,
  queryTeamCalendarSchema,
  reviewVacationSchema,
} from '../vacations.dto.js';
import { VacationService } from '../services/vacation.service.js';

export class VacationController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não vinculado a colaborador',
        });
      }

      const summary = await VacationService.getEmployeeSummary(employeeId);
      return res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  static async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!employeeId || !actorUserId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não vinculado a colaborador',
        });
      }

      const data = createVacationRequestSchema.parse(req.body);
      const created = await VacationService.createRequest(employeeId, actorUserId, data);

      return res.status(201).json({
        success: true,
        message: 'Solicitação de férias enviada com sucesso para a chefia imediata!',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!employeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Não autorizado' });
      }

      const updated = await VacationService.cancel(id, employeeId, actorUserId);
      return res.json({
        success: true,
        message: 'Solicitação de férias cancelada com sucesso',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTeamCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const isAdmOrRh = req.user?.roles?.some((r: string) => ['ADMIN', 'RH'].includes(r));
      const managerEmployeeId = isAdmOrRh ? null : req.user?.employeeId || null;

      const query = queryTeamCalendarSchema.parse(req.query);
      const result = await VacationService.getTeamCalendar(
        managerEmployeeId,
        query.startDate,
        query.endDate
      );

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getTeamPending(req: Request, res: Response, next: NextFunction) {
    try {
      const managerEmployeeId = req.user?.employeeId;
      if (!managerEmployeeId) {
        return res.json({ success: true, data: [] });
      }

      const items = await VacationService.listTeamPending(managerEmployeeId);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async managerApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const managerEmployeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!managerEmployeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Não autorizado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.managerApprove(
        id,
        managerEmployeeId,
        actorUserId,
        data.notes
      );

      return res.json({
        success: true,
        message: 'Férias aprovadas pelo gestor e encaminhadas para homologação do RH!',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async managerReject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const managerEmployeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!managerEmployeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Não autorizado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.managerReject(
        id,
        managerEmployeeId,
        actorUserId,
        data.notes
      );

      return res.json({
        success: true,
        message: 'Solicitação de férias rejeitada com saldo estornado',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRhPending(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await VacationService.listRhPending();
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async rhApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rhUserId = req.user?.id;

      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.rhApprove(id, rhUserId, data.notes);

      return res.json({
        success: true,
        message: 'Férias homologadas e agendadas com sucesso!',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async rhReject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rhUserId = req.user?.id;

      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.rhReject(id, rhUserId, data.notes);

      return res.json({
        success: true,
        message: 'Solicitação de férias rejeitada pelo RH com saldo estornado',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getExpiringAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await VacationService.getExpiringAlerts();
      return res.json({ success: true, data: alerts });
    } catch (err) {
      next(err);
    }
  }
}
