import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/company.service.js';
import {
  createCompanySchema,
  queryCompanySchema,
  updateCompanySchema,
} from '../organization.dto.js';
import { sendSuccess } from '../../../shared/response.js';

export class CompanyController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryCompanySchema.parse(req.query);
      const result = await CompanyService.list(query);

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
      const company = await CompanyService.getById(id);

      return sendSuccess({
        res,
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createCompanySchema.parse(req.body);
      const company = await CompanyService.create(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Empresa cadastrada com sucesso',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateCompanySchema.parse(req.body);
      const company = await CompanyService.update(id, body);

      return sendSuccess({
        res,
        message: 'Empresa atualizada com sucesso',
        data: company,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await CompanyService.delete(id);

      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
