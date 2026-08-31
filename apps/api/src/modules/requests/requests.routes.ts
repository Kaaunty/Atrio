import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { RequestsController } from './controllers/requests.controller.js';

const router = Router();

// ==========================================
// CATÁLOGO DE TIPOS DE SOLICITAÇÃO
// ==========================================
router.get('/request-types', authenticate, RequestsController.listTypes);
router.post('/request-types', authenticate, requireRole('ADMIN', 'RH'), RequestsController.createType);

// ==========================================
// CENTRAL DE SOLICITAÇÕES (COLABORADOR)
// ==========================================
router.post('/requests', authenticate, RequestsController.createRequest);
router.get('/requests/me', authenticate, RequestsController.listMyRequests);

// ==========================================
// CAIXA DE ENTRADA & AVALIAÇÕES (GESTOR / RH)
// ==========================================
router.get('/requests/inbox', authenticate, RequestsController.listInbox);
router.get('/requests/:id', authenticate, RequestsController.getById);
router.post('/requests/:id/approve', authenticate, RequestsController.approveStep);
router.post('/requests/:id/reject', authenticate, RequestsController.reject);
router.post('/requests/:id/comment', authenticate, RequestsController.addComment);
router.post('/requests/:id/cancel', authenticate, RequestsController.cancel);

export const requestsRoutes = router;
