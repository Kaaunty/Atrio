import { Request, Response, NextFunction } from 'express';
import {
  createAdjustmentSchema,
  queryAdjustmentsSchema,
  reviewAdjustmentSchema,
} from '../adjustment.dto.js';
import { TimeAdjustmentService } from '../services/time-adjustment.service.js';

export class TimeAdjustmentController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui vínculo com colaborador',
        });
      }

      const data = createAdjustmentSchema.parse(req.body);
      const adjustment = await TimeAdjustmentService.create(employeeId, data);
      return res.status(201).json({
        success: true,
        message: 'Solicitação de ajuste de ponto criada com sucesso',
        data: adjustment,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listMe(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui vínculo com colaborador',
        });
      }

      const query = queryAdjustmentsSchema.parse(req.query);
      const result = await TimeAdjustmentService.listMe(employeeId, query);
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async listTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não possui perfil de colaborador gestor',
        });
      }

      const query = queryAdjustmentsSchema.parse(req.query);
      const result = await TimeAdjustmentService.listTeam(employeeId, query);
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async listRh(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryAdjustmentsSchema.parse(req.query);
      const result = await TimeAdjustmentService.listRh(query);
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async managerApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const managerEmployeeId = req.user?.employeeId;
      if (!managerEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não possui vínculo de colaborador gestor',
        });
      }

      const data = reviewAdjustmentSchema.parse(req.body);
      const updated = await TimeAdjustmentService.managerApprove(id, managerEmployeeId, data);
      return res.json({
        success: true,
        message: 'Solicitação aprovada pelo gestor e encaminhada para homologação do RH',
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
      if (!managerEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não possui vínculo de colaborador gestor',
        });
      }

      const data = reviewAdjustmentSchema.parse(req.body);
      const updated = await TimeAdjustmentService.managerReject(id, managerEmployeeId, data);
      return res.json({
        success: true,
        message: 'Solicitação de ajuste rejeitada pelo gestor',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async rhApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const data = reviewAdjustmentSchema.parse(req.body);
      const updated = await TimeAdjustmentService.rhApprove(id, rhUserId, data);
      return res.json({
        success: true,
        message: 'Solicitação homologada com sucesso e espelho de ponto recalculado',
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
        return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
      }

      const data = reviewAdjustmentSchema.parse(req.body);
      const updated = await TimeAdjustmentService.rhReject(id, rhUserId, data);
      return res.json({
        success: true,
        message: 'Solicitação de ajuste rejeitada pelo RH',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({ success: false, message: 'Colaborador não identificado' });
      }

      const updated = await TimeAdjustmentService.cancel(id, employeeId);
      return res.json({
        success: true,
        message: 'Solicitação de ajuste cancelada com sucesso',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
