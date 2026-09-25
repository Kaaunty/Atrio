import { Request, Response, NextFunction } from 'express';
import {
  createWorkforceParameterSchema,
  createWorkforceRequestSchema,
  decideWorkforceRequestSchema,
  queryDashboardSchema,
  queryEmployeesSchema,
  queryParametersSchema,
  queryRequestsSchema,
  updateWorkforceParameterSchema,
} from '../qlp.dto.js';
import { QlpService } from '../services/qlp.service.js';

function isPrivilegedActor(req: Request): boolean {
  const roles = req.user?.roles || [];
  return roles.includes('ADMIN') || roles.includes('RH');
}

export class QlpController {
  // ==========================================
  // PAINEL / CONSULTAS
  // ==========================================

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = queryDashboardSchema.parse(req.query);
      const data = await QlpService.getDashboard(filters);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async listEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = queryEmployeesSchema.parse(req.query);
      const data = await QlpService.listEmployees(filters);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PARÂMETROS DE DIMENSIONAMENTO
  // ==========================================

  static async listParameters(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = queryParametersSchema.parse(req.query);
      const data = await QlpService.listParameters(filters);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createParameter(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createWorkforceParameterSchema.parse(req.body);
      const created = await QlpService.createParameter(data);
      return res.status(201).json({
        success: true,
        message: 'Parâmetro de dimensionamento criado com sucesso',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateParameter(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const data = updateWorkforceParameterSchema.parse(req.body);
      const updated = await QlpService.updateParameter(id, data);
      return res.json({
        success: true,
        message: 'Parâmetro de dimensionamento atualizado com sucesso',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteParameter(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await QlpService.deleteParameter(id);
      return res.json({
        success: true,
        message: 'Parâmetro de dimensionamento removido com sucesso',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SOLICITAÇÕES DE MOVIMENTAÇÃO DE QUADRO
  // ==========================================

  static async listRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const filters = queryRequestsSchema.parse(req.query);
      const data = await QlpService.listRequests(filters, {
        userId,
        employeeId: req.user?.employeeId,
        isPrivileged: isPrivilegedActor(req),
      });
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = createWorkforceRequestSchema.parse(req.body);
      const created = await QlpService.createRequest(userId, data);

      return res.status(201).json({
        success: true,
        message: 'Solicitação de movimentação de quadro enviada com sucesso',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const result = await QlpService.cancelRequest(id, userId, isPrivilegedActor(req));
      return res.json({
        success: true,
        message: 'Solicitação de quadro cancelada com sucesso',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async decideRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const approverUserId = req.user?.id;
      if (!approverUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = decideWorkforceRequestSchema.parse(req.body);
      const updated = await QlpService.decideRequest(id, approverUserId, data);

      return res.json({
        success: true,
        message: 'Decisão registrada com sucesso para a solicitação de quadro',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
