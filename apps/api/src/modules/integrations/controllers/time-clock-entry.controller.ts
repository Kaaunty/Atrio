import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../../shared/response.js';
import { TimeClockEntryService } from '../services/time-clock-entry.service.js';

export class TimeClockEntryController {
  /**
   * GET /api/v1/integrations/entries
   */
  static async list(req: Request, res: Response) {
    try {
      const {
        employeeId,
        deviceId,
        registrationNumber,
        startDate,
        endDate,
        source,
        search,
        page = '1',
        pageSize = '20',
      } = req.query;

      const result = await TimeClockEntryService.list({
        employeeId: employeeId ? String(employeeId) : undefined,
        deviceId: deviceId ? String(deviceId) : undefined,
        registrationNumber: registrationNumber ? String(registrationNumber) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        source: source ? String(source) : undefined,
        search: search ? String(search) : undefined,
        page: parseInt(String(page), 10) || 1,
        pageSize: parseInt(String(pageSize), 10) || 20,
      });

      return sendSuccess({
        res,
        data: result.items,
        meta: result.meta,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao consultar marcações de ponto',
      });
    }
  }

  /**
   * GET /api/v1/integrations/entries/stats
   */
  static async stats(req: Request, res: Response) {
    try {
      const stats = await TimeClockEntryService.getStats();
      return sendSuccess({
        res,
        data: stats,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao obter estatísticas das batidas',
      });
    }
  }

  /**
   * POST /api/v1/integrations/entries/remap
   */
  static async remap(req: Request, res: Response) {
    try {
      const result = await TimeClockEntryService.remapUnmappedEntries();
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (err: any) {
      return sendError({
        res,
        statusCode: err.statusCode || 500,
        message: err.message || 'Falha ao remapear vínculos de ponto',
      });
    }
  }
}
