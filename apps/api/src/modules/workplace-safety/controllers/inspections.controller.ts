import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { InspectionsService } from '../services/inspections.service.js';
import {
  createSafetyInspectionSchema,
  updateSafetyInspectionSchema,
} from '../workplace-safety.dto.js';

export class InspectionsController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, departmentId } = req.query;
      const data = await InspectionsService.list({
        status: status ? String(status) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await InspectionsService.getById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createSafetyInspectionSchema.parse(req.body);
      const data = await InspectionsService.create(payload);
      res.status(201).json({ success: true, message: 'Inspeção de segurança criada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateSafetyInspectionSchema.parse(req.body);
      const data = await InspectionsService.update((req.params.id as string), payload);
      res.json({ success: true, message: 'Inspeção atualizada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await InspectionsService.remove((req.params.id as string));
      res.json({ success: true, message: 'Inspeção removida com sucesso', data });
    } catch (err) {
      next(err);
    }
  }
}
