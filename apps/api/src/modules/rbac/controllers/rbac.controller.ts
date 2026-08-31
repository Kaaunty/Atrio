import { Request, Response, NextFunction } from 'express';
import { RbacService } from '../services/rbac.service.js';
import { sendSuccess } from '../../../shared/response.js';
import { z } from 'zod';

const permissionScopeEnum = z.enum(['SELF', 'TEAM', 'DEPARTMENT', 'COMPANY', 'ALL']);

const rolePermissionInputSchema = z.object({
  code: z.string(),
  scope: permissionScopeEnum,
});

const createRoleSchema = z.object({
  name: z.string().min(2, 'O nome do perfil é obrigatório'),
  description: z.string().min(3, 'A descrição do perfil é obrigatória'),
  permissions: z.array(rolePermissionInputSchema).optional(),
});

const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().min(3).optional(),
  permissions: z.array(rolePermissionInputSchema).optional(),
});

const assignUserRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export class RbacController {
  static async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const roles = await RbacService.listRoles();
      return sendSuccess({ res, data: roles });
    } catch (error) {
      next(error);
    }
  }

  static async getRoleById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const role = await RbacService.getRoleById(id);
      return sendSuccess({ res, data: role });
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createRoleSchema.parse(req.body);
      const role = await RbacService.createRole(body);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Perfil criado com sucesso',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const body = updateRoleSchema.parse(req.body);
      const role = await RbacService.updateRole(id, body);
      return sendSuccess({
        res,
        message: 'Perfil atualizado com sucesso',
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await RbacService.deleteRole(id);
      return sendSuccess({ res, message: result.message });
    } catch (error) {
      next(error);
    }
  }

  static async listPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = await RbacService.listPermissions();
      return sendSuccess({ res, data: permissions });
    } catch (error) {
      next(error);
    }
  }

  static async assignUserRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.id as string;
      const body = assignUserRolesSchema.parse(req.body);
      const permissions = await RbacService.assignUserRoles(userId, body.roleIds);
      return sendSuccess({
        res,
        message: 'Papéis atribuídos ao usuário com sucesso',
        data: permissions,
      });
    } catch (error) {
      next(error);
    }
  }

  static async seed(req: Request, res: Response, next: NextFunction) {
    try {
      await RbacService.seedPermissionsAndRoles();
      return sendSuccess({
        res,
        message: 'Perfis e permissões padrão inicializados com sucesso',
      });
    } catch (error) {
      next(error);
    }
  }
}
