import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { AccidentsService } from '../services/accidents.service.js';
import {
  createWorkplaceAccidentSchema,
  updateWorkplaceAccidentSchema,
} from '../workplace-safety.dto.js';

export class AccidentsController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, type, departmentId } = req.query;
      const data = await AccidentsService.list({
        status: status ? String(status) : undefined,
        type: type ? String(type) : undefined,
        departmentId: departmentId ? String(departmentId) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await AccidentsService.getById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createWorkplaceAccidentSchema.parse(req.body);
      const data = await AccidentsService.create(payload);
      res.status(201).json({ success: true, message: 'Registro de acidente/incidente criado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updateWorkplaceAccidentSchema.parse(req.body);
      const data = await AccidentsService.update((req.params.id as string), payload);
      res.json({ success: true, message: 'Registro atualizado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await AccidentsService.remove((req.params.id as string));
      res.json({ success: true, message: 'Registro removido com sucesso', data });
    } catch (err) {
      next(err);
    }
  }
}
