import { Request, Response, NextFunction } from 'express';
import { DepartmentService } from '../services/department.service.js';
import {
  createDepartmentSchema,
  queryDepartmentSchema,
  updateDepartmentSchema,
} from '../organization.dto.js';
import { sendSuccess } from '../../../shared/response.js';

export class DepartmentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryDepartmentSchema.parse(req.query);
      const departments = await DepartmentService.list(query);

      return sendSuccess({
        res,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTree(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryDepartmentSchema.parse(req.query);
      const tree = await DepartmentService.getTree(query);

      return sendSuccess({
        res,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const department = await DepartmentService.getById(id);

      return sendSuccess({
        res,
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createDepartmentSchema.parse(req.body);
      const department = await DepartmentService.create(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Setor cadastrado com sucesso',
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateDepartmentSchema.parse(req.body);
      const department = await DepartmentService.update(id, body);

      return sendSuccess({
        res,
        message: 'Setor atualizado com sucesso',
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await DepartmentService.delete(id);

      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
