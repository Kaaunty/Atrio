import { Router } from 'express';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';
import { DocumentsController } from './controllers/documents.controller.js';

const router = Router();

// ─── Rotas do Colaborador ─────────────────────────────────────────────────────
router.get('/documents/me', authenticate, DocumentsController.getEmployeeDocuments);
router.get('/documents/types', authenticate, DocumentsController.getDocumentTypes);
router.get('/documents/:id/download', authenticate, DocumentsController.downloadDocument);
router.post('/documents/:id/acknowledge', authenticate, DocumentsController.acknowledgeDocument);

// ─── Rotas do RH & Gestão ─────────────────────────────────────────────────────
router.post('/documents/upload-single', authenticate, requireRole('ADMIN', 'RH'), DocumentsController.uploadSingleDocument);
router.post('/documents/upload-batch', authenticate, requireRole('ADMIN', 'RH'), DocumentsController.uploadBatchDocuments);
router.post('/documents/publish-institutional', authenticate, requireRole('ADMIN', 'RH'), DocumentsController.publishInstitutionalDocument);
router.get('/documents/:id/receipts-report', authenticate, requireRole('ADMIN', 'RH'), DocumentsController.getReceiptsReport);

export { router as documentsRoutes };
