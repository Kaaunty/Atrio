import { Router } from 'express';
import { AuthController } from './controllers/auth.controller.js';
import { authenticate, requireRole } from '../../middlewares/auth.middleware.js';

const router = Router();

// -----------------------------------------------------------------------------
// AUTENTICAÇÃO (AUTH)
// -----------------------------------------------------------------------------
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh-token', AuthController.refreshToken);
router.get('/auth/me', AuthController.getMe);
router.post('/auth/change-password', authenticate, AuthController.changePassword);
// Apenas administradores podem criar contas. O administrador inicial é
// provisionado explicitamente pelo comando de seed com variáveis de ambiente.
router.post('/auth/register', authenticate, requireRole('ADMIN'), AuthController.registerUser);

export { router as authRoutes };
