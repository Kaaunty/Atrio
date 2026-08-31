import { Router } from 'express';
import { ensureAuthenticated, checkRole } from '../../middlewares/auth.middleware';
import { LifecycleController } from './controllers/lifecycle.controller';

const router = Router();

router.use(ensureAuthenticated);

router.get('/lifecycle-processes', checkRole('ADMIN', 'RH', 'GESTOR'), LifecycleController.getProcesses);
router.post('/lifecycle-processes', checkRole('ADMIN', 'RH'), LifecycleController.createProcess);
router.get('/lifecycle-processes/:id', checkRole('ADMIN', 'RH', 'GESTOR'), LifecycleController.getProcessById);
router.patch('/lifecycle-tasks/:id/complete', LifecycleController.completeTask);
router.get('/lifecycle-tasks/my-pending', LifecycleController.getMyPendingTasks);

router.get('/lifecycle-templates', checkRole('ADMIN', 'RH'), LifecycleController.getAllTemplates);
router.post('/lifecycle-templates', checkRole('ADMIN', 'RH'), LifecycleController.createTemplate);

export const lifecycleRoutes = router;
