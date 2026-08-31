import { Router } from 'express';
import { AuditController } from './controllers/audit.controller.js';

const router = Router();

// Logs de Auditoria
router.get('/admin/audit-logs', AuditController.list);

export { router as auditRoutes };
