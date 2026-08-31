import { Request, Response, NextFunction } from 'express';
import { createWorkScheduleSchema, updateWorkScheduleSchema } from '../time-clock.dto.js';
import { WorkScheduleService } from '../services/work-schedule.service.js';

export class WorkScheduleController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const schedules = await WorkScheduleService.list();
      return res.json({ success: true, data: schedules });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const schedule = await WorkScheduleService.getById(id);
      return res.json({ success: true, data: schedule });
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createWorkScheduleSchema.parse(req.body);
      const schedule = await WorkScheduleService.create(data);
      return res.status(201).json({
        success: true,
        message: 'Escala de trabalho cadastrada com sucesso',
        data: schedule,
      });
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateWorkScheduleSchema.parse(req.body);
      const schedule = await WorkScheduleService.update(id, data);
      return res.json({
        success: true,
        message: 'Escala de trabalho atualizada com sucesso',
        data: schedule,
      });
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await WorkScheduleService.delete(id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
