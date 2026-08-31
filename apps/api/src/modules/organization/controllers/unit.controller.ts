import { Request, Response, NextFunction } from 'express';
import { UnitService } from '../services/unit.service.js';
import {
  createUnitSchema,
  queryUnitSchema,
  updateUnitSchema,
} from '../organization.dto.js';
import { sendSuccess } from '../../../shared/response.js';

export class UnitController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryUnitSchema.parse(req.query);
      const units = await UnitService.list(query);

      return sendSuccess({
        res,
        data: units,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const unit = await UnitService.getById(id);

      return sendSuccess({
        res,
        data: unit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const units = await UnitService.list({ companyId: id });

      return sendSuccess({
        res,
        data: units,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createUnitSchema.parse(req.body);
      const unit = await UnitService.create(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Unidade cadastrada com sucesso',
        data: unit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateUnitSchema.parse(req.body);
      const unit = await UnitService.update(id, body);

      return sendSuccess({
        res,
        message: 'Unidade atualizada com sucesso',
        data: unit,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await UnitService.delete(id);

      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
