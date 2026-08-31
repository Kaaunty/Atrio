import { prisma } from '../../../database/prisma';
import { CreateNotificationDto, GetNotificationsQueryDto } from '../notification.dto';

export class NotificationsService {
  /**
   * Obtém as notificações do usuário com paginação e filtro unreadOnly
   */
  static async getUserNotifications(userId: string, options: GetNotificationsQueryDto) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 15;
    const skip = (page - 1) * pageSize;

    const where: any = { userId };
    if (options.unreadOnly) {
      where.readAt = null;
    }

    const [items, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Obtém a quantidade de notificações não lidas para o badge do sino no topbar
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });

    return { unreadCount: count };
  }

  /**
   * Marca uma notificação individual como lida
   */
  static async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notificação não encontrada.');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return updated;
  }

  /**
   * Marca todas as notificações do usuário como lidas
   */
  static async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Dispara a criação de uma nova notificação assíncrona (com simulação de e-mail em background)
   */
  static async notifyUser(data: CreateNotificationDto) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        category: data.category || 'SISTEMA',
        actionUrl: data.actionUrl,
        sentViaEmail: Boolean(data.sendEmail),
      },
    });

    if (data.sendEmail) {
      // Simulação assíncrona não-bloqueante de envio de e-mail via fila de eventos
      setImmediate(() => {
        console.log(
          `[EMAIL QUEUE] [ASYNCHRONOUS DISPATCH] Notificação enviada por e-mail para usuário ${data.userId}: "${data.title}"`
        );
      });
    }

    return notification;
  }
}
