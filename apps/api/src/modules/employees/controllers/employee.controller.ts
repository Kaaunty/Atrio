import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service.js';
import {
  createEmployeeSchema,
  createTimelineEventSchema,
  queryEmployeeSchema,
  updateEmployeeSchema,
} from '../employee.dto.js';
import { sendSuccess } from '../../../shared/response.js';

export class EmployeeController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryEmployeeSchema.parse(req.query);
      const result = await EmployeeService.list(query);

      return sendSuccess({
        res,
        data: result.items,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const employee = await EmployeeService.getById(id);

      return sendSuccess({
        res,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createEmployeeSchema.parse(req.body);
      const employee = await EmployeeService.create(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Colaborador cadastrado com sucesso',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateEmployeeSchema.parse(req.body);
      const employee = await EmployeeService.update(id, body);

      return sendSuccess({
        res,
        message: 'Dados do colaborador atualizados com sucesso',
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const reason = req.body?.reason as string | undefined;
      const result = await EmployeeService.delete(id, reason);

      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubordinates(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const subordinates = await EmployeeService.getSubordinates(id);

      return sendSuccess({
        res,
        data: subordinates,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTimeline(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const timeline = await EmployeeService.getTimeline(id);

      return sendSuccess({
        res,
        data: timeline,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTimelineEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = createTimelineEventSchema.parse(req.body);
      const event = await EmployeeService.createTimelineEvent(id, body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Evento adicionado à timeline com sucesso',
        data: event,
      });
    } catch (error) {
      next(error);
    }
  }
}
