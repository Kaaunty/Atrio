import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { AnnouncementsService } from '../services/announcements.service';
import { CreateAnnouncementSchema, QueryAnnouncementsSchema } from '../announcement.dto';

export class AnnouncementsController {
  static async getFeed(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const query = QueryAnnouncementsSchema.parse(req.query);
      const result = await AnnouncementsService.getFeedForEmployee(userId, query);

      return res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao carregar mural de comunicados.' });
    }
  }

  static async getDetail(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const { id } = req.params;
      const detail = await AnnouncementsService.getAnnouncementDetail(id, userId);

      return res.json({
        success: true,
        data: detail,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter detalhes do comunicado.' });
    }
  }

  static async acknowledge(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const { id } = req.params;
      const view = await AnnouncementsService.acknowledgeAnnouncement(id, userId);

      return res.json({
        success: true,
        data: view,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao confirmar ciência do comunicado.' });
    }
  }

  static async create(req: AuthRequest, res: Response) {
    try {
      const authorId = req.user?.id;
      if (!authorId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const dto = CreateAnnouncementSchema.parse(req.body);
      const announcement = await AnnouncementsService.createAnnouncement(authorId, dto);

      return res.status(201).json({
        success: true,
        data: announcement,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao publicar comunicado.' });
    }
  }

  static async getMetrics(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const metrics = await AnnouncementsService.getAnnouncementMetrics(id);

      return res.json({
        success: true,
        data: metrics,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao obter métricas de engajamento.' });
    }
  }
}
