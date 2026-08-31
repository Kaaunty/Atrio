import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service.js';

export class DashboardController {
  /**
   * Resumo do Colaborador (Meu Espaço)
   */
  static async getEmployeeSummary(req: Request, res: Response) {
    try {
      const employeeId = req.user?.employeeId;
      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não possui um perfil de colaborador associado',
        });
      }

      const data = await DashboardService.getEmployeeDashboardSummary(employeeId);
      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao carregar dashboard do colaborador',
      });
    }
  }

  /**
   * Resumo da Equipe para o Gestor
   */
  static async getManagerSummary(req: Request, res: Response) {
    try {
      const managerEmployeeId = req.user?.employeeId;
      if (!managerEmployeeId) {
        return res.status(400).json({
          success: false,
          message: 'Usuário não possui um perfil de colaborador associado',
        });
      }

      const data = await DashboardService.getManagerDashboardSummary(managerEmployeeId);
      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao carregar dashboard da equipe',
      });
    }
  }

  /**
   * Resumo Corporativo para RH / Diretoria
   */
  static async getRhSummary(req: Request, res: Response) {
    try {
      const { companyId, departmentId, period } = req.query;

      const data = await DashboardService.getRhDashboardSummary({
        companyId: companyId as string,
        departmentId: departmentId as string,
        period: period as string,
      });

      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro ao carregar dashboard do RH',
      });
    }
  }

  /**
   * Busca Universal Global (RH & Gestores)
   */
  static async globalSearch(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const data = await DashboardService.globalSearch(q as string);

      return res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || 'Erro na busca global',
      });
    }
  }
}
