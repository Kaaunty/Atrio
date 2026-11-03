import { Request, Response, NextFunction } from 'express';
import { EmployeeService } from '../services/employee.service.js';
import { EmployeeImportService } from '../services/employee-import.service.js';
import {
  createEmployeeSchema,
  createTimelineEventSchema,
  queryEmployeeSchema,
  updateEmployeeSchema,
} from '../employee.dto.js';
import {
  confirmImportBodySchema,
  previewImportQuerySchema,
} from '../employee-import.dto.js';
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

  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.query.companyId as string | undefined;
      const departmentId = req.query.departmentId as string | undefined;
      const stats = await EmployeeService.getStats(companyId, departmentId);

      return sendSuccess({
        res,
        data: stats,
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

  /**
   * Download da planilha modelo (.xlsx) de importação de colaboradores
   */
  static async downloadImportTemplate(_req: Request, res: Response, next: NextFunction) {
    try {
      const { buffer, filename, contentType } = await EmployeeImportService.generateTemplateBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Preview (Dry-Run) da importação da planilha Excel
   */
  static async importPreview(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        const error: any = new Error('Nenhum arquivo enviado. Envie uma planilha Excel no campo "file".');
        error.statusCode = 400;
        throw error;
      }

      // Valida companyId, emailDomain e updateExisting via body ou query
      const params = previewImportQuerySchema.parse({
        companyId: req.body.companyId || req.query.companyId,
        emailDomain: req.body.emailDomain || req.query.emailDomain,
        updateExisting: req.body.updateExisting ?? req.query.updateExisting,
      });

      const previewData = await EmployeeImportService.preview(
        req.file.buffer,
        params.companyId,
        params.emailDomain,
        params.updateExisting
      );

      return sendSuccess({
        res,
        message: 'Prévia de importação processada com sucesso',
        data: previewData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirmação da importação em 2 etapas
   */
  static async importConfirm(req: Request, res: Response, next: NextFunction) {
    try {
      const body = confirmImportBodySchema.parse(req.body);
      const result = await EmployeeImportService.confirm(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: `${result.totalCreated} colaboradores criados e ${result.totalUpdated} atualizados com sucesso!`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
