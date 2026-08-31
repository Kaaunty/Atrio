import { Response } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { NotificationsService } from '../services/notifications.service';
import { GetNotificationsQuerySchema } from '../notification.dto';

export class NotificationsController {
  static async getMyNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const query = GetNotificationsQuerySchema.parse(req.query);
      const result = await NotificationsService.getUserNotifications(userId, query);

      return res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao listar notificações.' });
    }
  }

  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const result = await NotificationsService.getUnreadCount(userId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao consultar contagem de notificações.' });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const { id } = req.params;
      const updated = await NotificationsService.markAsRead(id, userId);

      return res.json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao marcar notificação como lida.' });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }

      const result = await NotificationsService.markAllAsRead(userId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Erro ao marcar notificações como lidas.' });
    }
  }
}
