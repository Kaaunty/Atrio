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
// Apenas administradores podem criar contas ou inicializar usuários padrão.
// O bootstrap do servidor chama seedAdminUser() diretamente, sem passar por esta rota.
router.post('/auth/register', authenticate, requireRole('ADMIN'), AuthController.registerUser);
router.post('/auth/seed', authenticate, requireRole('ADMIN'), AuthController.seed);

export { router as authRoutes };
