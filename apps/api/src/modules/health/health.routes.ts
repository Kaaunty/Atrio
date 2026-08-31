import { Router } from 'express';
import { HealthController } from './health.controller.js';

const healthRoutes = Router();

healthRoutes.get('/health', HealthController.check);

export { healthRoutes };
