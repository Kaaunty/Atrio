import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware.js';
import {
  JobRequisitionController,
  JobOpeningController,
  CandidateController,
  ApplicationController,
  InterviewController,
  RecruitmentDashboardController,
} from './controllers/recruitment.controller.js';

const router = Router();

// ==========================================
// DASHBOARD
// ==========================================
router.get(
  '/recruitment/dashboard',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  RecruitmentDashboardController.getOverview
);

// ==========================================
// SOLICITAÇÕES DE VAGA (JOB REQUISITIONS)
// ==========================================
router.post(
  '/recruitment/requisitions',
  authenticate,
  requirePermission('recrutamento.solicitar', 'TEAM'),
  JobRequisitionController.create
);
router.get(
  '/recruitment/requisitions/me',
  authenticate,
  requirePermission('recrutamento.solicitar'),
  JobRequisitionController.listMine
);
router.get(
  '/recruitment/requisitions/pending',
  authenticate,
  requirePermission('recrutamento.aprovar'),
  JobRequisitionController.listPending
);
router.get(
  '/recruitment/requisitions',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  JobRequisitionController.list
);
router.get(
  '/recruitment/requisitions/:id',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  JobRequisitionController.getById
);
router.post(
  '/recruitment/requisitions/:id/approve',
  authenticate,
  requirePermission('recrutamento.aprovar'),
  JobRequisitionController.approve
);
router.post(
  '/recruitment/requisitions/:id/reject',
  authenticate,
  requirePermission('recrutamento.aprovar'),
  JobRequisitionController.reject
);

// ==========================================
// VAGAS (JOB OPENINGS)
// ==========================================
router.get(
  '/recruitment/openings',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  JobOpeningController.list
);
router.get(
  '/recruitment/openings/:id',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  JobOpeningController.getById
);
router.post(
  '/recruitment/openings',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  JobOpeningController.create
);
router.patch(
  '/recruitment/openings/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  JobOpeningController.update
);
router.delete(
  '/recruitment/openings/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  JobOpeningController.remove
);

// ==========================================
// CANDIDATOS (CANDIDATES)
// ==========================================
router.get(
  '/recruitment/candidates',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  CandidateController.list
);
router.get(
  '/recruitment/candidates/:id',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  CandidateController.getById
);
router.post(
  '/recruitment/candidates',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  CandidateController.create
);
router.patch(
  '/recruitment/candidates/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  CandidateController.update
);
router.delete(
  '/recruitment/candidates/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  CandidateController.remove
);

// ==========================================
// CANDIDATURAS / PIPELINE (APPLICATIONS)
// ==========================================
router.get(
  '/recruitment/applications',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  ApplicationController.list
);
router.get(
  '/recruitment/applications/:id',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  ApplicationController.getById
);
router.post(
  '/recruitment/applications',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  ApplicationController.create
);
router.patch(
  '/recruitment/applications/:id/stage',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  ApplicationController.moveStage
);
router.delete(
  '/recruitment/applications/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  ApplicationController.remove
);

// ==========================================
// ENTREVISTAS (INTERVIEW SCHEDULES)
// ==========================================
router.get(
  '/recruitment/interviews',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  InterviewController.list
);
router.get(
  '/recruitment/interviews/:id',
  authenticate,
  requirePermission('recrutamento.visualizar'),
  InterviewController.getById
);
router.post(
  '/recruitment/interviews',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  InterviewController.create
);
router.patch(
  '/recruitment/interviews/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  InterviewController.update
);
router.delete(
  '/recruitment/interviews/:id',
  authenticate,
  requirePermission('recrutamento.gerenciar'),
  InterviewController.remove
);

export const recruitmentRoutes = router;
