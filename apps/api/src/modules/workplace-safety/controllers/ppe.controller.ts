import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware.js';
import { PpeService } from '../services/ppe.service.js';
import { createPpeSchema, updatePpeSchema, createPpeDeliverySchema } from '../workplace-safety.dto.js';

export class PpeController {
  static async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.active === 'true';
      const data = await PpeService.list(activeOnly);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PpeService.getById((req.params.id as string));
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createPpeSchema.parse(req.body);
      const data = await PpeService.create(payload);
      res.status(201).json({ success: true, message: 'EPI cadastrado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = updatePpeSchema.parse(req.body);
      const data = await PpeService.update((req.params.id as string), payload);
      res.json({ success: true, message: 'EPI atualizado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await PpeService.remove((req.params.id as string));
      res.json({ success: true, message: 'EPI inativado com sucesso', data });
    } catch (err) {
      next(err);
    }
  }

  static async listDeliveries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { ppeId, employeeId } = req.query;
      const data = await PpeService.listDeliveries({
        ppeId: ppeId ? String(ppeId) : undefined,
        employeeId: employeeId ? String(employeeId) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createDelivery(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = createPpeDeliverySchema.parse(req.body);
      const data = await PpeService.createDelivery(payload);
      res.status(201).json({ success: true, message: 'Movimentação de EPI registrada com sucesso', data });
    } catch (err) {
      next(err);
    }
  }
}
