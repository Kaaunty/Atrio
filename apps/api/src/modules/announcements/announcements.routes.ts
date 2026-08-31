import { Router } from 'express';
import { ensureAuthenticated, checkRole } from '../../middlewares/auth.middleware';
import { AnnouncementsController } from './controllers/announcements.controller';

const router = Router();

router.use(ensureAuthenticated);

router.get('/announcements', AnnouncementsController.getFeed);
router.get('/announcements/:id', AnnouncementsController.getDetail);
router.post('/announcements/:id/acknowledge', AnnouncementsController.acknowledge);

// Gestão de Comunicados (RH / Admin)
router.post('/rh/announcements', checkRole('ADMIN', 'RH'), AnnouncementsController.create);
router.get('/rh/announcements/:id/metrics', checkRole('ADMIN', 'RH'), AnnouncementsController.getMetrics);

export const announcementsRoutes = router;
