import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PermissionScope } from '@prisma/client';
import { env } from '../config/env.js';
import { TokenPayload } from '../modules/auth/services/auth.service.js';

const SCOPE_WEIGHTS: Record<PermissionScope, number> = {
  SELF: 1,
  TEAM: 2,
  DEPARTMENT: 3,
  COMPANY: 4,
  ALL: 5,
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  employeeId?: string | null;
  roles: string[];
  permissions: Record<string, PermissionScope>;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Middleware para validar o token JWT e injetar o usuário autenticado na requisição
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação não fornecido ou inválido',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      employeeId: decoded.employeeId,
      roles: decoded.roles || [],
      permissions: decoded.permissions || {},
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticação expirado ou inválido',
    });
  }
};

/**
 * Middleware para exigir uma permissão granular específica e escopo mínimo
 */
export const requirePermission = (permissionCode: string, minScope?: PermissionScope) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    // Administradores possuem passe livre total
    if (req.user.roles.includes('ADMIN')) {
      return next();
    }

    const userScope = req.user.permissions[permissionCode];

    if (!userScope) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado: permissão necessária (${permissionCode}) não concedida ao seu perfil`,
      });
    }

    if (minScope) {
      const userWeight = SCOPE_WEIGHTS[userScope] || 0;
      const requiredWeight = SCOPE_WEIGHTS[minScope] || 0;

      if (userWeight < requiredWeight) {
        return res.status(403).json({
          success: false,
          message: `Acesso negado: o escopo atribuído (${userScope}) é insuficiente para esta operação (mínimo exigido: ${minScope})`,
        });
      }
    }

    next();
  };
};

/**
 * Middleware para exigir um ou mais papéis de acesso
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
      });
    }

    if (req.user.roles.includes('ADMIN')) {
      return next();
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado para este perfil de usuário',
      });
    }

    next();
  };
};

// Compatibilidade com os nomes usados pelos módulos mais novos.
export type AuthRequest = Request & { user?: AuthenticatedUser };
export const ensureAuthenticated = authenticate;
export const checkRole = requireRole;
