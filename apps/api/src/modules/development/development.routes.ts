import { Router } from 'express';
import { ensureAuthenticated, checkRole } from '../../middlewares/auth.middleware';
import { DevelopmentController } from './controllers/development.controller';

const router = Router();

router.use(ensureAuthenticated);

// Treinamentos
router.get('/trainings/me', DevelopmentController.getMyTrainings);
router.post('/trainings/:id/certificate', DevelopmentController.uploadCertificate);
router.get('/rh/trainings', checkRole('ADMIN', 'RH'), DevelopmentController.getAllTrainings);
router.post('/rh/trainings', checkRole('ADMIN', 'RH'), DevelopmentController.createTraining);
router.post('/rh/trainings/assign', checkRole('ADMIN', 'RH'), DevelopmentController.assignTraining);
router.get('/rh/trainings/compliance', checkRole('ADMIN', 'RH'), DevelopmentController.getComplianceReport);

// Feedbacks & 1:1
router.get('/feedbacks/me', DevelopmentController.getMyFeedbacks);
router.get('/feedbacks/team/:employeeId', checkRole('ADMIN', 'RH', 'GESTOR'), DevelopmentController.getTeamFeedbacks);
router.post('/feedbacks', checkRole('ADMIN', 'RH', 'GESTOR'), DevelopmentController.createFeedback);

// PDI (Plano de Desenvolvimento Individual)
router.get('/development-plans/me', DevelopmentController.getMyDevelopmentPlans);
router.post('/development-plans', checkRole('ADMIN', 'RH', 'GESTOR'), DevelopmentController.createDevelopmentPlan);
router.post('/development-plans/:id/goals', DevelopmentController.addGoalToPlan);
router.patch('/development-plans/goals/:goalId', DevelopmentController.updateGoal);

export const developmentRoutes = router;
