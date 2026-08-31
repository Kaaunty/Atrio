import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { loginSchema, refreshTokenSchema, registerUserSchema } from '../auth.dto.js';
import { sendSuccess } from '../../../shared/response.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress || undefined;
      const userAgent = req.headers['user-agent'] || undefined;

      const result = await AuthService.login(body, { ipAddress, userAgent });

      return sendSuccess({
        res,
        message: 'Login realizado com sucesso',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const body = refreshTokenSchema.parse(req.body);
      const tokens = await AuthService.refreshToken(body.refreshToken);

      return sendSuccess({
        res,
        message: 'Tokens renovados com sucesso',
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      // Injetado pelo middleware authenticate ou passado como parâmetro
      const userId = (req as any).user?.id || (req.query.userId as string);
      if (!userId) {
        const error: any = new Error('Não autenticado');
        error.statusCode = 401;
        throw error;
      }

      const me = await AuthService.getMe(userId);

      return sendSuccess({
        res,
        data: me,
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerUser(req: Request, res: Response, next: NextFunction) {
    try {
      const body = registerUserSchema.parse(req.body);
      const user = await AuthService.registerUser(body);

      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Usuário cadastrado com sucesso',
        data: {
          id: user.id,
          email: user.email,
          employeeId: user.employeeId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async seed(req: Request, res: Response, next: NextFunction) {
    try {
      await AuthService.seedAdminUser();
      return sendSuccess({
        res,
        message: 'Usuário administrador e perfis padrão inicializados com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
