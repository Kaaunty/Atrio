import { Router } from 'express';
import { authenticate, requirePermission, requireRole } from '../../middlewares/auth.middleware.js';
import { TimeClockController } from './controllers/time-clock.controller.js';
import { WorkScheduleController } from './controllers/work-schedule.controller.js';
import { TimeAdjustmentController } from './controllers/time-adjustment.controller.js';

const router = Router();

// ==========================================
// AUTOSSERVIÇO MEU PONTO (COLABORADOR)
// ==========================================
router.get('/time-clock/me/today', authenticate, TimeClockController.getMeToday);
router.get('/time-clock/me/monthly', authenticate, TimeClockController.getMeMonthly);
router.get('/time-clock/me/balance', authenticate, TimeClockController.getMeBalance);

// ==========================================
// CONSULTA DE EQUIPE E ESPELHO (GESTORES / RH)
// ==========================================
router.get(
  '/time-clock/employees/:employeeId/monthly',
  authenticate,
  requirePermission('ponto.visualizar'),
  TimeClockController.getEmployeeMonthly
);
router.get(
  '/time-clock/employees/:employeeId/balance',
  authenticate,
  requirePermission('ponto.visualizar'),
  TimeClockController.getEmployeeBalance
);
router.get(
  '/time-clock/team/summary',
  authenticate,
  requirePermission('ponto.visualizar'),
  TimeClockController.getTeamSummary
);

// ==========================================
// SOLICITAÇÕES E WORKFLOW DE AJUSTE DE PONTO (ETAPA 06)
// ==========================================
router.post(
  '/time-clock/adjustments',
  authenticate,
  requirePermission('ponto.ajustar'),
  TimeAdjustmentController.create
);
router.get(
  '/time-clock/adjustments/me',
  authenticate,
  TimeAdjustmentController.listMe
);
router.get(
  '/time-clock/adjustments/team',
  authenticate,
  requirePermission('ponto.aprovar'),
  TimeAdjustmentController.listTeam
);
router.get(
  '/time-clock/adjustments/rh',
  authenticate,
  requireRole('ADMIN', 'RH'),
  TimeAdjustmentController.listRh
);
router.post(
  '/time-clock/adjustments/:id/manager-approve',
  authenticate,
  requirePermission('ponto.aprovar'),
  TimeAdjustmentController.managerApprove
);
router.post(
  '/time-clock/adjustments/:id/manager-reject',
  authenticate,
  requirePermission('ponto.aprovar'),
  TimeAdjustmentController.managerReject
);
router.post(
  '/time-clock/adjustments/:id/rh-approve',
  authenticate,
  requireRole('ADMIN', 'RH'),
  TimeAdjustmentController.rhApprove
);
router.post(
  '/time-clock/adjustments/:id/rh-reject',
  authenticate,
  requireRole('ADMIN', 'RH'),
  TimeAdjustmentController.rhReject
);
router.delete(
  '/time-clock/adjustments/:id',
  authenticate,
  TimeAdjustmentController.cancel
);

// ==========================================
// GESTÃO, RECÁLCULO E AJUSTES DIRETOS DE BANCO
// ==========================================
router.post(
  '/time-clock/recalculate',
  authenticate,
  requireRole('ADMIN', 'RH', 'GESTOR'),
  TimeClockController.recalculate
);
router.post(
  '/time-clock/balance/adjustments',
  authenticate,
  requireRole('ADMIN', 'RH'),
  TimeClockController.addManualAdjustment
);

// ==========================================
// ESCALAS DE TRABALHO (WORK SCHEDULES)
// ==========================================
router.get('/work-schedules', authenticate, WorkScheduleController.list);
router.get('/work-schedules/:id', authenticate, WorkScheduleController.getById);
router.post('/work-schedules', authenticate, requireRole('ADMIN', 'RH'), WorkScheduleController.create);
router.put('/work-schedules/:id', authenticate, requireRole('ADMIN', 'RH'), WorkScheduleController.update);
router.delete('/work-schedules/:id', authenticate, requireRole('ADMIN', 'RH'), WorkScheduleController.delete);

export const timeClockRoutes = router;
