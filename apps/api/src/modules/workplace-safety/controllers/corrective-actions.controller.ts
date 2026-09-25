import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { CorrectiveActionsService } from '../services/corrective-actions.service.js';
import {
  createCorrectiveActionSchema,
  updateCorrectiveActionSchema,
} from '../workplace-safety.dto.js';

export class CorrectiveActionsController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, sourceType, accidentId, inspectionId } = req.query;
      const data = await CorrectiveActionsService.list({
        status: status ? String(status) : undefined,
        sourceType: sourceType ? String(sourceType) : undefined,
        accidentId: accidentId ? String(accidentId) : undefined,
        inspectionId: inspectionId ? String(inspectionId) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CorrectiveActionsService.getById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createCorrectiveActionSchema.parse(req.body);
      const data = await CorrectiveActionsService.create(payload);
      res.status(201).json({ success: true, message: 'Ação corretiva criada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateCorrectiveActionSchema.parse(req.body);
      const data = await CorrectiveActionsService.update((req.params.id as string), payload);
      res.json({ success: true, message: 'Ação corretiva atualizada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await CorrectiveActionsService.remove((req.params.id as string));
      res.json({ success: true, message: 'Ação corretiva removida com sucesso', data });
    } catch (err) {
      next(err);
    }
  }
}
