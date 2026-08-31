import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { ReportsService } from '../services/reports.service';
import { BaseReportFilterSchema, MonthlyMirrorPdfSchema } from '../report.dto';

export class ReportsController {
  private static sendFileResponse(res: Response, result: { buffer: Buffer; filename: string; contentType: string }) {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  }

  static async exportEmployees(req: AuthRequest, res: Response) {
    try {
      const filters = BaseReportFilterSchema.parse(req.body);
      const result = await ReportsService.exportEmployees(filters);
      return ReportsController.sendFileResponse(res, result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao exportar relatório de colaboradores.' });
    }
  }

  static async exportTimeClockSummary(req: AuthRequest, res: Response) {
    try {
      const filters = BaseReportFilterSchema.parse(req.body);
      const result = await ReportsService.exportTimeClockSummary(filters);
      return ReportsController.sendFileResponse(res, result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao exportar espelho de ponto.' });
    }
  }

  static async exportDivergences(req: AuthRequest, res: Response) {
    try {
      const filters = BaseReportFilterSchema.parse(req.body);
      const result = await ReportsService.exportDivergences(filters);
      return ReportsController.sendFileResponse(res, result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao exportar divergências de ponto.' });
    }
  }

  static async exportVacations(req: AuthRequest, res: Response) {
    try {
      const filters = BaseReportFilterSchema.parse(req.body);
      const result = await ReportsService.exportVacations(filters);
      return ReportsController.sendFileResponse(res, result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao exportar relatório de férias.' });
    }
  }

  static async exportAbsenteeism(req: AuthRequest, res: Response) {
    try {
      const filters = BaseReportFilterSchema.parse(req.body);
      const result = await ReportsService.exportAbsenteeism(filters);
      return ReportsController.sendFileResponse(res, result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao exportar relatório de absenteísmo.' });
    }
  }

  static async exportRequestsSLA(req: AuthRequest, res: Response) {
    try {
      const filters = BaseReportFilterSchema.parse(req.body);
      const result = await ReportsService.exportRequestsSLA(filters);
      return ReportsController.sendFileResponse(res, result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao exportar relatório de solicitações.' });
    }
  }

  static async generateMonthlyMirrorPdf(req: AuthRequest, res: Response) {
    try {
      const dto = MonthlyMirrorPdfSchema.parse(req.body);
      const result = await ReportsService.generateMonthlyMirrorPdf(dto);
      return ReportsController.sendFileResponse(res, { ...result, contentType: 'application/pdf' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao gerar PDF do espelho mensal de ponto.' });
    }
  }
}
