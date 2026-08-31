import { Request, Response, NextFunction } from 'express';
import { PositionService } from '../services/position.service.js';
import {
  createPositionSchema,
  queryPositionSchema,
  updatePositionSchema,
} from '../organization.dto.js';
import { sendSuccess } from '../../../shared/response.js';

export class PositionController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryPositionSchema.parse(req.query);
      const result = await PositionService.list(query);

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
      const position = await PositionService.getById(id);

      return sendSuccess({
        res,
        data: position,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createPositionSchema.parse(req.body);
      const position = await PositionService.create(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Cargo cadastrado com sucesso',
        data: position,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updatePositionSchema.parse(req.body);
      const position = await PositionService.update(id, body);

      return sendSuccess({
        res,
        message: 'Cargo atualizado com sucesso',
        data: position,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await PositionService.delete(id);

      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
