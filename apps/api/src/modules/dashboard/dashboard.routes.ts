import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { DashboardController } from './controllers/dashboard.controller.js';

const router = Router();

router.get('/dashboard/employee/summary', authenticate, DashboardController.getEmployeeSummary);
router.get('/dashboard/manager/summary', authenticate, DashboardController.getManagerSummary);
router.get('/dashboard/rh/summary', authenticate, requireRole('ADMIN', 'RH'), DashboardController.getRhSummary);
router.get('/search/global', authenticate, DashboardController.globalSearch);

export { router as dashboardRoutes };
