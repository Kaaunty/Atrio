import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { VacationController } from './controllers/vacation.controller.js';

const router = Router();

// ==========================================
// AUTOSSERVIÇO DE FÉRIAS (COLABORADOR)
// ==========================================
router.get('/vacations/me', authenticate, VacationController.getMe);
router.post('/vacations/requests', authenticate, VacationController.createRequest);
router.delete('/vacations/requests/:id', authenticate, VacationController.cancelRequest);

// ==========================================
// GESTÃO DA EQUIPE (GESTOR)
// ==========================================
router.get('/vacations/team/calendar', authenticate, VacationController.getTeamCalendar);
router.get('/vacations/team/pending', authenticate, VacationController.getTeamPending);
router.post('/vacations/requests/:id/manager-approve', authenticate, VacationController.managerApprove);
router.post('/vacations/requests/:id/manager-reject', authenticate, VacationController.managerReject);

// ==========================================
// CENTRAL DE HOMOLOGAÇÃO & ALERTAS (RH)
// ==========================================
router.get('/vacations/rh/pending', authenticate, requireRole('ADMIN', 'RH'), VacationController.getRhPending);
router.post('/vacations/requests/:id/rh-approve', authenticate, requireRole('ADMIN', 'RH'), VacationController.rhApprove);
router.post('/vacations/requests/:id/rh-reject', authenticate, requireRole('ADMIN', 'RH'), VacationController.rhReject);
router.get('/vacations/rh/expiring-alerts', authenticate, requireRole('ADMIN', 'RH'), VacationController.getExpiringAlerts);

export const vacationsRoutes = router;
