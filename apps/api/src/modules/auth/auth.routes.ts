import { Router } from 'express';
import { AuthController } from './controllers/auth.controller.js';

const router = Router();

// -----------------------------------------------------------------------------
// AUTENTICAÇÃO (AUTH)
// -----------------------------------------------------------------------------
router.post('/auth/login', AuthController.login);
router.post('/auth/refresh-token', AuthController.refreshToken);
router.get('/auth/me', AuthController.getMe);
router.post('/auth/register', AuthController.registerUser);
router.post('/auth/seed', AuthController.seed);

export { router as authRoutes };
