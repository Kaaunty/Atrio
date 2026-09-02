import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../database/prisma.js';
import {
  manualAdjustmentSchema,
  queryMonthlySummarySchema,
  recalculateTimeSchema,
} from '../time-clock.dto.js';
import { TimeBalanceService } from '../services/time-balance.service.js';
import { TimeSummaryService } from '../services/time-summary.service.js';
import { TimeCalculationEngine } from '../services/time-calculation.engine.js';

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
      const userPermissions = req.user?.permissions || {};
      const userRoles = req.user?.roles || [];

      const isPrivileged =
        userRoles.some((r) => ['ADMIN', 'RH'].includes(r)) ||
        ['COMPANY', 'ALL'].includes(userPermissions['ponto.visualizar'] || '') ||
        ['COMPANY', 'ALL'].includes(userPermissions['ponto.aprovar'] || '');

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
      } else if (currentEmployeeId) {
        subordinates = await prisma.employee.findMany({
          where: { managerId: currentEmployeeId, deletedAt: null },
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

        // Se o gestor não tem liderados mapeados diretamente por managerId, busca os membros do mesmo setor
        if (subordinates.length === 0) {
          const managerEmp = await prisma.employee.findUnique({
            where: { id: currentEmployeeId },
            select: { departmentId: true },
          });

          if (managerEmp?.departmentId) {
            subordinates = await prisma.employee.findMany({
              where: {
                departmentId: managerEmp.departmentId,
                id: { not: currentEmployeeId },
                deletedAt: null,
              },
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
          }
        }
      }

      // Fallback final: se ainda estiver sem subordinados ou se a conta do gestor/usuario estiver sem employeeId,
      // traz colaboradores cadastrados para garantir que a gestão de ponto nunca fique em branco
      if (subordinates.length === 0) {
        subordinates = await prisma.employee.findMany({
          where: { deletedAt: null },
          orderBy: { name: 'asc' },
          take: 50,
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: { select: { name: true } },
            position: { select: { title: true } },
            manager: { select: { name: true } },
          },
        });
      }

      // Constrói resumo otimizado e ultra-rápido da equipe usando consultas em lote
      const subordinateIds = subordinates.map((e) => e.id);
      const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

      // 1. Busca os saldos mensais acumulados (TimeBalance) em lote
      const balances = await prisma.timeBalance.findMany({
        where: {
          employeeId: { in: subordinateIds },
          yearMonth,
        },
      });

      const balanceMap = new Map(balances.map((b) => [b.employeeId, b]));

      // 2. Busca contagem de solicitações de ajuste pendentes/divergências em lote
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59));

      const divergences = await prisma.timeClockAdjustment.groupBy({
        by: ['employeeId'],
        where: {
          employeeId: { in: subordinateIds },
          date: { gte: monthStart, lte: monthEnd },
          status: { in: ['PENDENTE_GESTOR', 'PENDENTE_RH'] },
        },
        _count: { id: true },
      });

      const divergenceMap = new Map(divergences.map((d) => [d.employeeId, d._count.id]));

      // 3. Mapeia a lista de membros em memória instantaneamente
      const teamList = subordinates.map((emp) => {
        const bal = balanceMap.get(emp.id);
        const closingMinutes = bal ? bal.closingBalanceMinutes : 0;
        const formattedBalance = TimeCalculationEngine.formatMinutesToHours(closingMinutes, true);
        const divergencesCount = divergenceMap.get(emp.id) || 0;

        return {
          employee: emp,
          totalExpectedFormatted: '00h 00m',
          totalActualFormatted: '00h 00m',
          monthBalanceMinutes: closingMinutes,
          monthBalanceFormatted: formattedBalance,
          accumulatedClosingFormatted: formattedBalance,
          divergencesCount,
        };
      });

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
