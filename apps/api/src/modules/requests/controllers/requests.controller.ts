import { Request, Response, NextFunction } from 'express';
import {
  addCommentSchema,
  createRequestSchema,
  createRequestTypeSchema,
  queryRequestsSchema,
  reviewStepSchema,
} from '../requests.dto.js';
import { RequestsService } from '../services/requests.service.js';
import { WorkflowEngineService } from '../services/workflow-engine.service.js';

export class RequestsController {
  static async listTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const types = await RequestsService.listTypes();
      return res.json({ success: true, data: types });
    } catch (err) {
      next(err);
    }
  }

  static async createType(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createRequestTypeSchema.parse(req.body);
      const requestType = await RequestsService.createType(data);
      return res.status(201).json({
        success: true,
        message: 'Tipo de solicitação criado com sucesso',
        data: requestType,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const requesterId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!requesterId || !actorUserId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui vínculo com colaborador',
        });
      }

      const data = createRequestSchema.parse(req.body);
      const created = await RequestsService.createRequest(requesterId, actorUserId, data);
      return res.status(201).json({
        success: true,
        message: 'Solicitação aberta com sucesso!',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listMyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Colaborador não identificado',
        });
      }

      const query = queryRequestsSchema.parse(req.query);
      const result = await RequestsService.listMyRequests(employeeId, query);
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async listInbox(req: Request, res: Response, next: NextFunction) {
    try {
      const actorUserId = req.user?.id;
      const actorEmployeeId = req.user?.employeeId;
      const userRoles = req.user?.roles || [];

      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const query = queryRequestsSchema.parse(req.query);
      const result = await RequestsService.listInbox(
        actorUserId,
        actorEmployeeId,
        userRoles,
        query
      );
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.id || '';
      const actorEmployeeId = req.user?.employeeId;
      const userRoles = req.user?.roles || [];

      const result = await RequestsService.getById(
        id,
        actorUserId,
        actorEmployeeId,
        userRoles
      );
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async approveStep(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.id;
      const actorEmployeeId = req.user?.employeeId;
      const userRoles = req.user?.roles || [];

      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = reviewStepSchema.parse(req.body);
      const updated = await WorkflowEngineService.advanceStep(
        id,
        actorUserId,
        actorEmployeeId,
        userRoles,
        data.comment
      );

      return res.json({
        success: true,
        message: 'Etapa aprovada com sucesso!',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.id;
      const actorEmployeeId = req.user?.employeeId;
      const userRoles = req.user?.roles || [];

      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = reviewStepSchema.parse(req.body);
      const updated = await WorkflowEngineService.reject(
        id,
        actorUserId,
        actorEmployeeId,
        userRoles,
        data.comment
      );

      return res.json({
        success: true,
        message: 'Solicitação rejeitada com parecer registrado',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const actorUserId = req.user?.id;
      if (!actorUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = addCommentSchema.parse(req.body);
      const history = await WorkflowEngineService.addComment(id, actorUserId, data.comment);
      return res.json({
        success: true,
        message: 'Comentário adicionado ao histórico',
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const requesterEmployeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!requesterEmployeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Colaborador não identificado' });
      }

      const updated = await WorkflowEngineService.cancel(id, requesterEmployeeId, actorUserId);
      return res.json({
        success: true,
        message: 'Solicitação cancelada com sucesso',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}
