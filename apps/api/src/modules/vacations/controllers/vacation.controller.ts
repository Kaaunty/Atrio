import { Request, Response, NextFunction } from 'express';
import {
  createVacationRequestSchema,
  queryRhPeriodsSchema,
  queryTeamCalendarSchema,
  reviewVacationSchema,
  scheduleVacationRhSchema,
  updateVacationPeriodRhSchema,
} from '../vacations.dto.js';
import { VacationService } from '../services/vacation.service.js';
import { VacationImportService } from '../services/vacation-import.service.js';
import { prisma } from '../../../database/prisma.js';

export class VacationController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não vinculado a colaborador',
        });
      }

      const summary = await VacationService.getEmployeeSummary(employeeId);
      return res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  static async createRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!employeeId || !actorUserId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não vinculado a colaborador',
        });
      }

      const data = createVacationRequestSchema.parse(req.body);
      const created = await VacationService.createRequest(employeeId, actorUserId, data);

      return res.status(201).json({
        success: true,
        message: 'Solicitação de férias enviada com sucesso para a chefia imediata!',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const employeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!employeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Não autorizado' });
      }

      const updated = await VacationService.cancel(String(id), employeeId, actorUserId);
      return res.json({
        success: true,
        message: 'Solicitação de férias cancelada com sucesso',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTeamCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const isAdmOrRh = req.user?.roles?.some((r: string) => ['ADMIN', 'RH'].includes(r));
      const managerEmployeeId = isAdmOrRh ? null : req.user?.employeeId || null;

      const query = queryTeamCalendarSchema.parse(req.query);
      const result = await VacationService.getTeamCalendar(
        managerEmployeeId,
        query.startDate,
        query.endDate
      );

      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async getTeamPending(req: Request, res: Response, next: NextFunction) {
    try {
      const managerEmployeeId = req.user?.employeeId;
      if (!managerEmployeeId) {
        return res.json({ success: true, data: [] });
      }

      const items = await VacationService.listTeamPending(managerEmployeeId);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async managerApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const managerEmployeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!managerEmployeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Não autorizado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.managerApprove(
        String(id),
        managerEmployeeId,
        actorUserId,
        data.notes
      );

      return res.json({
        success: true,
        message: 'Férias aprovadas pelo gestor e encaminhadas para homologação do RH!',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async managerReject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const managerEmployeeId = req.user?.employeeId;
      const actorUserId = req.user?.id;

      if (!managerEmployeeId || !actorUserId) {
        return res.status(400).json({ success: false, message: 'Não autorizado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.managerReject(
        String(id),
        managerEmployeeId,
        actorUserId,
        data.notes
      );

      return res.json({
        success: true,
        message: 'Solicitação de férias rejeitada com saldo estornado',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getRhPending(req: Request, res: Response, next: NextFunction) {
    try {
      const items = await VacationService.listRhPending();
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  static async rhApprove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rhUserId = req.user?.id;

      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.rhApprove(String(id), rhUserId, data.notes);

      return res.json({
        success: true,
        message: 'Férias homologadas e agendadas com sucesso!',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async rhReject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rhUserId = req.user?.id;

      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = reviewVacationSchema.parse(req.body);
      const updated = await VacationService.rhReject(String(id), rhUserId, data.notes);

      return res.json({
        success: true,
        message: 'Solicitação de férias rejeitada pelo RH com saldo estornado',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getExpiringAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = typeof req.query.companyId === 'string' ? req.query.companyId : undefined;
      const alerts = await VacationService.getExpiringAlerts(companyId);
      return res.json({ success: true, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  static async getRhPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const query = queryRhPeriodsSchema.parse(req.query);
      const result = await VacationService.listRhPeriods(query);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async syncRhPeriods(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = typeof req.body?.companyId === 'string' ? req.body.companyId : undefined;
      const syncedCount = await VacationService.syncCompanyPeriods(companyId, true);
      return res.json({
        success: true,
        message: `Períodos aquisitivos e concessivos sincronizados para ${syncedCount} colaborador(es).`,
        data: { syncedCount },
      });
    } catch (err) {
      next(err);
    }
  }

  static async scheduleRh(req: Request, res: Response, next: NextFunction) {
    try {
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = scheduleVacationRhSchema.parse(req.body);
      const created = await VacationService.scheduleByRh(rhUserId, data);

      return res.status(201).json({
        success: true,
        message: 'Férias programadas e registradas com sucesso!',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updatePeriodRh(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const rhUserId = req.user?.id;
      if (!rhUserId) {
        return res.status(401).json({ success: false, message: 'Não autenticado' });
      }

      const data = updateVacationPeriodRhSchema.parse(req.body);
      const updated = await VacationService.updatePeriodByRh(String(id), rhUserId, data);

      return res.json({
        success: true,
        message: 'Período aquisitivo e saldo atualizados com sucesso!',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async importRhExcel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo Excel (.xlsx) é obrigatório para importação',
        });
      }

      let companyId = req.body?.companyId || req.query?.companyId;
      if (!companyId) {
        const defaultCompany = await prisma.company.findFirst({
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
        });
        companyId = defaultCompany?.id;
      }

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Nenhuma empresa encontrada para vincular a importação',
        });
      }

      const result = await VacationImportService.importFromExcel(
        req.file.buffer,
        String(companyId),
        req.user?.id
      );

      return res.json({
        success: true,
        message: `Importação concluída: ${result.totalRowsProcessed} períodos processados (${result.periodsCreated} criados, ${result.periodsUpdated} atualizados).`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
