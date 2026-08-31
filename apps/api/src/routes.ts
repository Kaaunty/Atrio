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
import { medicalCertificatesRoutes } from './modules/medical-certificates/medical-certificates.routes.js';
import { documentsRoutes } from './modules/documents/documents.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { notificationsRoutes } from './modules/notifications/notifications.routes.js';
import { reportsRoutes } from './modules/reports/reports.routes.js';
import { benefitsRoutes } from './modules/benefits/benefits.routes.js';
import { announcementsRoutes } from './modules/announcements/announcements.routes.js';
import { lifecycleRoutes } from './modules/lifecycle/lifecycle.routes.js';
import { developmentRoutes } from './modules/development/development.routes.js';

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
router.use('/', medicalCertificatesRoutes);
router.use('/', documentsRoutes);
router.use('/', dashboardRoutes);
router.use('/', benefitsRoutes);
router.use('/', announcementsRoutes);
router.use('/', lifecycleRoutes);
router.use('/', developmentRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/reports', reportsRoutes);

export { router };


