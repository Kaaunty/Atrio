import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../shared/response.js';
import { IntegrationService } from '../services/integration.service.js';
import { TimeClockSyncService } from '../services/time-clock-sync.service.js';
import { IntegrationRegistry } from '../registry/integration.registry.js';
import {
  ToggleIntegrationSchema,
  UpdateIntegrationSettingsSchema,
  TriggerManualSyncSchema,
  TestConnectionSchema,
  UploadAfdSchema,
} from '../integrations.dto.js';
import { SyncTrigger } from '@prisma/client';

export class IntegrationController {
  /**
   * GET /api/v1/integrations
   */
  static async list(req: Request, res: Response) {
    try {
      const integrations = await IntegrationService.list();
      return sendSuccess({
        res,
        data: integrations,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao listar integrações',
      });
    }
  }

  /**
   * GET /api/v1/integrations/:key
   */
  static async getByKey(req: Request, res: Response) {
    try {
      const key = req.params.key as string;
      const integration = await IntegrationService.getByKey(key);
      return sendSuccess({
        res,
        data: integration,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao obter detalhes da integração',
      });
    }
  }

  /**
   * PATCH /api/v1/integrations/:key/toggle
   */
  static async toggle(req: Request, res: Response) {
    try {
      const key = req.params.key as string;
      const parsed = ToggleIntegrationSchema.safeParse(req.body);

      if (!parsed.success) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Parâmetro `enabled` é obrigatório',
          errors: parsed.error.format(),
        });
      }

      const result = await IntegrationService.toggle(key, parsed.data.enabled, {
        userId: req.user?.id,
        employeeId: req.user?.employeeId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      });

      return sendSuccess({
        res,
        message: `Integração '${result.name}' ${result.enabled ? 'ativada' : 'desativada'} com sucesso`,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao alterar status da integração',
      });
    }
  }

  /**
   * PUT /api/v1/integrations/:key/settings
   */
  static async updateSettings(req: Request, res: Response) {
    try {
      const key = req.params.key as string;
      const parsed = UpdateIntegrationSettingsSchema.safeParse(req.body);

      if (!parsed.success) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Dados de configuração inválidos',
          errors: parsed.error.format(),
        });
      }

      const result = await IntegrationService.updateSettings(key, parsed.data, {
        userId: req.user?.id,
        employeeId: req.user?.employeeId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      });

      return sendSuccess({
        res,
        message: 'Configurações da integração atualizadas com sucesso',
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao salvar configurações',
      });
    }
  }

  /**
   * POST /api/v1/integrations/:key/sync
   * Dispara sincronização manual
   */
  static async triggerSync(req: Request, res: Response) {
    try {
      const key = req.params.key as string;
      const parsed = TriggerManualSyncSchema.safeParse(req.body);

      if (!parsed.success) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Parâmetros de sincronização inválidos',
          errors: parsed.error.format(),
        });
      }

      const result = await TimeClockSyncService.executeSync({
        integrationKey: key,
        deviceId: parsed.data.deviceId || null,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
        triggeredBy: SyncTrigger.MANUAL_TRIGGER,
        auditContext: {
          userId: req.user?.id,
          employeeId: req.user?.employeeId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
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
        message: err.message || 'Falha ao executar sincronização',
      });
    }
  }

  /**
   * POST /api/v1/integrations/:key/test-connection
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const key = req.params.key as string;
      const parsed = TestConnectionSchema.safeParse(req.body);

      if (!parsed.success) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Parâmetros de teste de conexão inválidos',
          errors: parsed.error.format(),
        });
      }

      const provider = IntegrationRegistry.get(key);
      if (!provider) {
        return sendError({
          res,
          statusCode: 400,
          message: `Provedor de integração '${key}' não encontrado`,
        });
      }

      const result = await provider.testConnection(parsed.data);
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Erro ao testar comunicação',
      });
    }
  }

  /**
   * POST /api/v1/integrations/:key/upload-afd
   */
  static async uploadAfd(req: Request, res: Response) {
    try {
      const key = req.params.key as string;

      // Suporta body JSON direto { content, deviceId } ou upload de arquivo texto
      let fileContent = '';
      let deviceId: string | null = null;

      if (req.body && req.body.content) {
        fileContent = req.body.content;
        deviceId = req.body.deviceId || null;
      }

      if (!fileContent) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Nenhum conteúdo de arquivo AFD recebido',
        });
      }

      const result = await TimeClockSyncService.executeSync({
        integrationKey: key,
        deviceId,
        afdContent: fileContent,
        triggeredBy: SyncTrigger.AFD_UPLOAD,
        auditContext: {
          userId: req.user?.id,
          employeeId: req.user?.employeeId,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
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
        message: err.message || 'Falha ao processar arquivo AFD',
      });
    }
  }

  /**
   * POST /api/v1/integrations/control-id/webhook ou POST /api/v1/integrations/:key/webhook
   * Endpoint aberto para recebimento de push em tempo real dos coletores
   */
  static async handleWebhook(req: Request, res: Response) {
    try {
      const key = (req.params.key as string) || 'control_id';

      const result = await TimeClockSyncService.executeSync({
        integrationKey: key,
        webhookPayload: req.body,
        triggeredBy: SyncTrigger.WEBHOOK,
        auditContext: {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] as string | undefined,
        },
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        recordsProcessed: result.importedRecords,
      });
    } catch (err: any) {
      console.error('⚠️ Erro ao processar webhook:', err.message);
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Erro ao processar evento webhook',
      });
    }
  }
}
