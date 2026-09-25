import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware.js';
import { QlpController } from './controllers/qlp.controller.js';

const router = Router();

// ==========================================
// PAINEL / CONSULTAS (qlp.visualizar)
// ==========================================
router.get('/qlp/dashboard', authenticate, requirePermission('qlp.visualizar'), QlpController.getDashboard);
router.get('/qlp/employees', authenticate, requirePermission('qlp.visualizar'), QlpController.listEmployees);

// ==========================================
// PARÂMETROS DE DIMENSIONAMENTO (RH — qlp.gerenciar)
// ==========================================
router.get('/qlp/parameters', authenticate, requirePermission('qlp.visualizar'), QlpController.listParameters);
router.post('/qlp/parameters', authenticate, requirePermission('qlp.gerenciar'), QlpController.createParameter);
router.patch('/qlp/parameters/:id', authenticate, requirePermission('qlp.gerenciar'), QlpController.updateParameter);
router.delete('/qlp/parameters/:id', authenticate, requirePermission('qlp.gerenciar'), QlpController.deleteParameter);

// ==========================================
// SOLICITAÇÕES DE MOVIMENTAÇÃO DE QUADRO
// ==========================================
router.get('/qlp/requests', authenticate, requirePermission('qlp.visualizar'), QlpController.listRequests);
router.post(
  '/qlp/requests',
  authenticate,
  requirePermission('qlp.solicitar', 'TEAM'),
  QlpController.createRequest
);
router.delete(
  '/qlp/requests/:id',
  authenticate,
  requirePermission('qlp.solicitar', 'TEAM'),
  QlpController.cancelRequest
);
router.post(
  '/qlp/requests/:id/decision',
  authenticate,
  requirePermission('qlp.aprovar'),
  QlpController.decideRequest
);

export const qlpRoutes = router;
