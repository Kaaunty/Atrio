import { Router } from 'express';
import { ensureAuthenticated, checkRole } from '../../middlewares/auth.middleware';
import { ReportsController } from './controllers/reports.controller';

const router = Router();

router.use(ensureAuthenticated);
router.use(checkRole('ADMIN', 'RH', 'GESTOR'));

router.post('/employees/export', ReportsController.exportEmployees);
router.post('/time-clock/export', ReportsController.exportTimeClockSummary);
router.post('/divergences/export', ReportsController.exportDivergences);
router.post('/vacations/export', ReportsController.exportVacations);
router.post('/absenteeism/export', ReportsController.exportAbsenteeism);
router.post('/requests/export', ReportsController.exportRequestsSLA);
router.post('/time-clock/monthly-mirror-pdf', ReportsController.generateMonthlyMirrorPdf);

export const reportsRoutes = router;
