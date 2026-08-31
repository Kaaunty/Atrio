import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../shared/response.js';
import { TimeClockDeviceService } from '../services/time-clock-device.service.js';
import { CreateDeviceSchema, UpdateDeviceSchema } from '../integrations.dto.js';

export class DeviceController {
  /**
   * GET /api/v1/integrations/devices
   */
  static async list(req: Request, res: Response) {
    try {
      const { integrationId, unitId, active, search } = req.query;

      const devices = await TimeClockDeviceService.list({
        integrationId: integrationId ? String(integrationId) : undefined,
        unitId: unitId ? String(unitId) : undefined,
        active: active !== undefined ? active === 'true' : undefined,
        search: search ? String(search) : undefined,
      });

      return sendSuccess({
        res,
        data: devices,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao listar dispositivos',
      });
    }
  }

  /**
   * POST /api/v1/integrations/devices
   */
  static async create(req: Request, res: Response) {
    try {
      const parsed = CreateDeviceSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Dados de cadastro do dispositivo inválidos',
          errors: parsed.error.format(),
        });
      }

      const device = await TimeClockDeviceService.create(parsed.data, {
        userId: req.user?.id,
        employeeId: req.user?.employeeId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Relógio de ponto cadastrado com sucesso',
        data: device,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao cadastrar dispositivo',
      });
    }
  }

  /**
   * PUT /api/v1/integrations/devices/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const parsed = UpdateDeviceSchema.safeParse(req.body);

      if (!parsed.success) {
        return sendError({
          res,
          statusCode: 400,
          message: 'Dados de atualização inválidos',
          errors: parsed.error.format(),
        });
      }

      const id = req.params.id as string;
      const device = await TimeClockDeviceService.update(id, parsed.data, {
        userId: req.user?.id,
        employeeId: req.user?.employeeId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
      });

      return sendSuccess({
        res,
        message: 'Dispositivo atualizado com sucesso',
        data: device,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao atualizar dispositivo',
      });
    }
  }

  /**
   * DELETE /api/v1/integrations/devices/:id
   */
  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await TimeClockDeviceService.delete(id, {
        userId: req.user?.id,
        employeeId: req.user?.employeeId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string | undefined,
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
        message: err.message || 'Falha ao remover dispositivo',
      });
    }
  }

  /**
   * POST /api/v1/integrations/devices/:id/test-connection
   */
  static async testConnection(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await TimeClockDeviceService.testConnection(id);

      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha no teste de conexão com o relógio',
      });
    }
  }
}
