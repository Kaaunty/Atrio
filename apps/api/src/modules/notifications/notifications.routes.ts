import { Router } from 'express';
import { ensureAuthenticated } from '../../middlewares/auth.middleware';
import { NotificationsController } from './controllers/notifications.controller';

const router = Router();

router.use(ensureAuthenticated);

router.get('/me', NotificationsController.getMyNotifications);
router.get('/me/unread-count', NotificationsController.getUnreadCount);
router.patch('/:id/read', NotificationsController.markAsRead);
router.post('/me/mark-all-read', NotificationsController.markAllAsRead);

export const notificationsRoutes = router;
