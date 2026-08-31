import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma';
import { NotificationsService } from '../services/notifications.service';

describe('Central de Notificações Integration Flow', () => {
  let userId: string;

  before(async () => {
    // 1. Criar Usuário de Teste
    const user = await prisma.user.create({
      data: {
        email: `notif_test_${Date.now()}@atrio.com.br`,
        passwordHash: 'hashed_pw',
      },
    });
    userId = user.id;
  });

  after(async () => {
    // Limpeza
    if (userId) {
      await prisma.notification.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
  });

  it('deve disparar notificação assíncrona para o usuário', async () => {
    const notif = await NotificationsService.notifyUser({
      userId,
      title: 'Ajuste de Ponto Requer Aprovação',
      message: 'Você tem 1 nova solicitação de ajuste de ponto na sua fila.',
      type: 'ACTION_REQUIRED',
      category: 'PONTO',
      actionUrl: '/gestao/aprovacoes/ponto',
      sendEmail: true,
    });

    assert.ok(notif.id);
    assert.equal(notif.title, 'Ajuste de Ponto Requer Aprovação');
    assert.equal(notif.type, 'ACTION_REQUIRED');
    assert.equal(notif.category, 'PONTO');
    assert.equal(notif.readAt, null);
  });

  it('deve retornar contagem correta de notificações não lidas', async () => {
    const unread = await NotificationsService.getUnreadCount(userId);
    assert.equal(unread.unreadCount, 1);
  });

  it('deve listar as notificações do usuário', async () => {
    const list = await NotificationsService.getUserNotifications(userId, {
      unreadOnly: true,
      page: 1,
      pageSize: 10,
    });

    assert.equal(list.data.length, 1);
    assert.equal(list.meta.total, 1);
  });

  it('deve marcar notificação como lida', async () => {
    const unreadBefore = await NotificationsService.getUnreadCount(userId);
    assert.equal(unreadBefore.unreadCount, 1);

    const notifications = await NotificationsService.getUserNotifications(userId, { unreadOnly: true });
    const notifId = notifications.data[0].id;

    await NotificationsService.markAsRead(notifId, userId);

    const unreadAfter = await NotificationsService.getUnreadCount(userId);
    assert.equal(unreadAfter.unreadCount, 0);
  });

  it('deve marcar todas como lidas em lote', async () => {
    // Criar mais 2 notificações
    await NotificationsService.notifyUser({ userId, title: 'Notif 1', message: 'Msg 1' });
    await NotificationsService.notifyUser({ userId, title: 'Notif 2', message: 'Msg 2' });

    const unreadBefore = await NotificationsService.getUnreadCount(userId);
    assert.equal(unreadBefore.unreadCount, 2);

    await NotificationsService.markAllAsRead(userId);

    const unreadAfter = await NotificationsService.getUnreadCount(userId);
    assert.equal(unreadAfter.unreadCount, 0);
  });
});
