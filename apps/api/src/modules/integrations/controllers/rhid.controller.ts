import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../shared/response.js';
import { RhidService } from '../services/rhid.service.js';

export class RhidController {
  /**
   * Obtém as configurações salvas do RHiD (com senha mascarada)
   */
  static async getSettings(req: Request, res: Response) {
    try {
      const creds = await RhidService.getStoredCredentials();
      return sendSuccess({
        res,
        data: {
          email: creds.email,
          domain: creds.domain,
          enabled: creds.enabled,
          autoSync: creds.autoSync,
          hasPassword: Boolean(creds.password),
        },
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao buscar configurações do RHiD',
      });
    }
  }

  /**
   * Atualiza as credenciais e flags do RHiD
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const { email, password, domain, enabled, autoSync } = req.body;
      if (!email) {
        return sendError({
          res,
          statusCode: 400,
          message: 'O e-mail da conta RHiD é obrigatório.',
        });
      }

      await RhidService.updateSettings({
        email,
        password: password || undefined,
        domain,
        enabled,
        autoSync,
      });

      return sendSuccess({
        res,
        message: 'Configurações do RHiD salvas com sucesso.',
        data: { success: true },
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao salvar configurações do RHiD',
      });
    }
  }

  /**
   * Testa a conexão com a API do RHiD
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const { email, password, domain } = req.body;
      const result = await RhidService.testConnection(
        email && password ? { email, password, domain } : undefined
      );

      return sendSuccess({
        res,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao testar conexão com RHiD',
      });
    }
  }

  /**
   * Retorna visão comparativa de colaboradores entre Átrio e RHiD
   */
  static async getOverview(req: Request, res: Response) {
    try {
      const overview = await RhidService.getSyncOverview();
      return sendSuccess({
        res,
        data: overview,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao carregar visão de colaboradores do RHiD',
      });
    }
  }

  /**
   * Importa colaboradores do RHiD para o Átrio
   */
  static async importEmployees(req: Request, res: Response) {
    try {
      const { rhidPersonIds } = req.body;
      const result = await RhidService.importFromRhid({
        rhidPersonIds,
        auditContext: {
          userId: (req as any).user?.id,
          ipAddress: req.ip,
        },
      });

      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao importar colaboradores do RHiD',
      });
    }
  }

  /**
   * Envia colaboradores do Átrio para o RHiD
   */
  static async pushEmployees(req: Request, res: Response) {
    try {
      const { employeeIds } = req.body;
      const result = await RhidService.pushToRhid({
        employeeIds,
        auditContext: {
          userId: (req as any).user?.id,
          ipAddress: req.ip,
        },
      });

      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao enviar colaboradores para o RHiD',
      });
    }
  }

  /**
   * Exporta os colaboradores do Átrio em formato CSV para o RHiD
   */
  static async exportCsv(req: Request, res: Response) {
    try {
      const csvContent = await RhidService.exportCsv();
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="colaboradores-rhid.csv"');
      res.send(csvContent);
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao gerar arquivo de exportação',
      });
    }
  }

  /**
   * Importa e sincroniza os relógios físicos cadastrados na conta RHiD
   */
  static async syncDevices(req: Request, res: Response) {
    try {
      const result = await RhidService.syncDevicesFromRhid();
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao sincronizar relógios do RHiD',
      });
    }
  }

  /**
   * Sincroniza Departamentos, Cargos e Escalas do RHiD
   */
  static async syncOrganization(req: Request, res: Response) {
    try {
      const result = await RhidService.syncOrganizationalStructure();
      return sendSuccess({
        res,
        message: 'Estrutura organizacional (Departamentos, Cargos e Escalas) sincronizada com sucesso!',
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao sincronizar estrutura organizacional do RHiD',
      });
    }
  }

  /**
   * Obtém visão comparativa de Departamentos entre Átrio e RHiD
   */
  static async getDepartmentsOverview(req: Request, res: Response) {
    try {
      const result = await RhidService.getDepartmentsOverview();
      return sendSuccess({
        res,
        message: 'Visão de departamentos carregada com sucesso',
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao carregar visão de departamentos do RHiD',
      });
    }
  }

  /**
   * Importa Departamentos do RHiD para o Átrio
   */
  static async importDepartments(req: Request, res: Response) {
    try {
      const { rhidDepartmentIds } = req.body;
      const result = await RhidService.importDepartments(rhidDepartmentIds);
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao importar departamentos do RHiD',
      });
    }
  }

  /**
   * Obtém visão comparativa de Cargos & Níveis entre Átrio e RHiD
   */
  static async getPositionsOverview(req: Request, res: Response) {
    try {
      const result = await RhidService.getPositionsOverview();
      return sendSuccess({
        res,
        message: 'Visão de cargos carregada com sucesso',
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao carregar visão de cargos do RHiD',
      });
    }
  }

  /**
   * Importa Cargos do RHiD para o Átrio
   */
  static async importPositions(req: Request, res: Response) {
    try {
      const { rhidPositionIds } = req.body;
      const result = await RhidService.importPositions(rhidPositionIds);
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao importar cargos do RHiD',
      });
    }
  }
}
