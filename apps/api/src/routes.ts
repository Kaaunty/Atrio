import { Router } from 'express';
import { healthRoutes } from './modules/health/health.routes.js';
import { organizationRoutes } from './modules/organization/organization.routes.js';
import { employeeRoutes } from './modules/employees/employee.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { rbacRoutes } from './modules/rbac/rbac.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { integrationsRoutes } from './modules/integrations/integrations.routes.js';
import { timeClockRoutes } from './modules/time-clock/time-clock.routes.js';
import { requestsRoutes } from './modules/requests/requests.routes.js';
import { vacationsRoutes } from './modules/vacations/vacations.routes.js';

const router = Router();

// Sub-rotas v1
router.use('/', healthRoutes);
router.use('/', authRoutes);
router.use('/', rbacRoutes);
router.use('/', auditRoutes);
router.use('/', organizationRoutes);
router.use('/', employeeRoutes);
router.use('/', integrationsRoutes);
router.use('/', timeClockRoutes);
router.use('/', requestsRoutes);
router.use('/', vacationsRoutes);

export { router };


