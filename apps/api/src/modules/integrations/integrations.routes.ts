import { Router } from 'express';
import { authenticate, requirePermission } from '../../middlewares/auth.middleware.js';
import { IntegrationController } from './controllers/integration.controller.js';
import { DeviceController } from './controllers/device.controller.js';
import { SyncLogController } from './controllers/sync-log.controller.js';
import { TimeClockEntryController } from './controllers/time-clock-entry.controller.js';

const router = Router();

// ============================================================================
// 1. ENDPOINTS PÚBLICOS / WEBHOOKS (Coletores Control iD / Dispositivos)
// ============================================================================
router.post('/integrations/control-id/webhook', IntegrationController.handleWebhook);
router.post('/integrations/:key/webhook', IntegrationController.handleWebhook);

// ============================================================================
// 2. ENDPOINTS AUTENTICADOS (Painel Administrativo & RH)
// ============================================================================
router.use('/integrations', authenticate);

// --- Dispositivos / Relógios de Ponto ---
router.get(
  '/integrations/devices',
  requirePermission('integracoes.visualizar'),
  DeviceController.list
);
router.post(
  '/integrations/devices',
  requirePermission('integracoes.gerenciar'),
  DeviceController.create
);
router.put(
  '/integrations/devices/:id',
  requirePermission('integracoes.gerenciar'),
  DeviceController.update
);
router.delete(
  '/integrations/devices/:id',
  requirePermission('integracoes.gerenciar'),
  DeviceController.delete
);
router.post(
  '/integrations/devices/:id/test-connection',
  requirePermission('integracoes.gerenciar'),
  DeviceController.testConnection
);

// --- Logs de Sincronização ---
router.get(
  '/integrations/logs',
  requirePermission('integracoes.visualizar'),
  SyncLogController.list
);
router.get(
  '/integrations/logs/:id',
  requirePermission('integracoes.visualizar'),
  SyncLogController.getById
);

// --- Registros Brutos (TimeClockEntries) ---
router.get(
  '/integrations/entries',
  requirePermission('integracoes.visualizar'),
  TimeClockEntryController.list
);
router.get(
  '/integrations/entries/stats',
  requirePermission('integracoes.visualizar'),
  TimeClockEntryController.stats
);

// --- Integrações (Hub, Configurações e Disparo Manual) ---
router.get(
  '/integrations',
  requirePermission('integracoes.visualizar'),
  IntegrationController.list
);
router.get(
  '/integrations/:key',
  requirePermission('integracoes.visualizar'),
  IntegrationController.getByKey
);
router.patch(
  '/integrations/:key/toggle',
  requirePermission('integracoes.gerenciar'),
  IntegrationController.toggle
);
router.put(
  '/integrations/:key/settings',
  requirePermission('integracoes.gerenciar'),
  IntegrationController.updateSettings
);
router.post(
  '/integrations/:key/sync',
  requirePermission('integracoes.gerenciar'),
  IntegrationController.triggerSync
);
router.post(
  '/integrations/:key/test-connection',
  requirePermission('integracoes.gerenciar'),
  IntegrationController.testConnection
);
router.post(
  '/integrations/:key/upload-afd',
  requirePermission('integracoes.gerenciar'),
  IntegrationController.uploadAfd
);

export { router as integrationsRoutes };
