import { Request, Response, NextFunction } from 'express';
import { ChartService } from '../services/chart.service.js';
import { sendSuccess } from '../../../shared/response.js';

export class ChartController {
  static async getChart(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.query.companyId as string | undefined;
      const chartData = await ChartService.getChart(companyId);

      return sendSuccess({
        res,
        data: chartData,
      });
    } catch (error) {
      next(error);
    }
  }
}
