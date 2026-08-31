import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../database/prisma.js';
import {
  manualAdjustmentSchema,
  queryMonthlySummarySchema,
  recalculateTimeSchema,
} from '../time-clock.dto.js';
import { TimeBalanceService } from '../services/time-balance.service.js';
import { TimeSummaryService } from '../services/time-summary.service.js';

export class TimeClockController {
  /**
   * GET /api/v1/time-clock/me/today
   */
  static async getMeToday(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui vínculo com cadastro de colaborador',
        });
      }

      const data = await TimeSummaryService.getToday(employeeId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/time-clock/me/monthly?year=2026&month=8
   */
  static async getMeMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui vínculo com cadastro de colaborador',
        });
      }

      const query = queryMonthlySummarySchema.parse(req.query);
      const data = await TimeSummaryService.getMonthlySummary(employeeId, query.year, query.month);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/time-clock/me/balance
   */
  static async getMeBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário autenticado não possui vínculo com cadastro de colaborador',
        });
      }

      const data = await TimeBalanceService.getBalance(employeeId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/time-clock/employees/:employeeId/monthly?year=2026&month=8
   */
  static async getEmployeeMonthly(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const currentEmployeeId = req.user?.employeeId;
      const isPrivileged = req.user?.roles.some((r) => ['ADMIN', 'RH'].includes(r));

      // Se for gestor comum, valida se o colaborador requisitado é seu liderado direto
      if (!isPrivileged) {
        if (!currentEmployeeId) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado: permissão insuficiente',
          });
        }

        const subordinate = await prisma.employee.findFirst({
          where: {
            id: employeeId,
            managerId: currentEmployeeId,
            deletedAt: null,
          },
        });

        if (!subordinate && currentEmployeeId !== employeeId) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado: você só pode visualizar o espelho de colaboradores da sua equipe',
          });
        }
      }

      const query = queryMonthlySummarySchema.parse(req.query);
      const data = await TimeSummaryService.getMonthlySummary(employeeId, query.year, query.month);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/time-clock/employees/:employeeId/balance
   */
  static async getEmployeeBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.params;
      const currentEmployeeId = req.user?.employeeId;
      const isPrivileged = req.user?.roles.some((r) => ['ADMIN', 'RH'].includes(r));

      if (!isPrivileged) {
        if (!currentEmployeeId) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado: permissão insuficiente',
          });
        }

        const subordinate = await prisma.employee.findFirst({
          where: {
            id: employeeId,
            managerId: currentEmployeeId,
            deletedAt: null,
          },
        });

        if (!subordinate && currentEmployeeId !== employeeId) {
          return res.status(403).json({
            success: false,
            message: 'Acesso negado: você só pode consultar o banco de horas de colaboradores da sua equipe',
          });
        }
      }

      const data = await TimeBalanceService.getBalance(employeeId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/time-clock/team/summary?year=2026&month=8
   */
  static async getTeamSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const currentEmployeeId = req.user?.employeeId;
      const isPrivileged = req.user?.roles.some((r) => ['ADMIN', 'RH'].includes(r));

      const query = queryMonthlySummarySchema.parse(req.query);
      const todayStr = TimeSummaryService.getTodayDateStr();
      const [todayY, todayM] = todayStr.split('-').map((v) => parseInt(v, 10));
      const year = query.year || todayY;
      const month = query.month || todayM;

      let subordinates: any[] = [];

      if (isPrivileged) {
        subordinates = await prisma.employee.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
            manager: { select: { name: true } },
          },
        });
      } else {
        if (!currentEmployeeId) {
          return res.status(400).json({
            success: false,
            message: 'Usuário não possui cadastro de colaborador gestor',
          });
        }

        subordinates = await prisma.employee.findMany({
          where: { managerId: currentEmployeeId, deletedAt: null },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
          },
        });
      }

      // Constrói resumo para cada liderado
      const teamList = await Promise.all(
        subordinates.map(async (emp) => {
          const monthly = await TimeSummaryService.getMonthlySummary(emp.id, year, month);
          return {
            employee: emp,
            totalExpectedFormatted: monthly.summary.totalExpectedFormatted,
            totalActualFormatted: monthly.summary.totalActualFormatted,
            monthBalanceMinutes: monthly.summary.totalBalanceMinutes,
            monthBalanceFormatted: monthly.summary.totalBalanceFormatted,
            accumulatedClosingFormatted: monthly.bankBalance.accumulatedClosingFormatted,
            divergencesCount: monthly.summary.divergencesCount,
          };
        })
      );

      return res.json({
        success: true,
        data: {
          period: { year, month },
          teamSize: teamList.length,
          members: teamList,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/time-clock/recalculate
   */
  static async recalculate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = recalculateTimeSchema.parse(req.body);
      const result = await TimeSummaryService.recalculatePeriod(data);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/time-clock/adjustments
   */
  static async addManualAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const data = manualAdjustmentSchema.parse(req.body);
      const result = await TimeBalanceService.addManualAdjustment(
        data.employeeId,
        data.yearMonth,
        data.minutes,
        data.reason,
        req.user?.id
      );

      return res.json({
        success: true,
        message: 'Ajuste manual de banco de horas registrado com sucesso',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
