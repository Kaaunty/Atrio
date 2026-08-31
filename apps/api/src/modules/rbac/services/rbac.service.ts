import { PermissionScope } from '@prisma/client';
import { prisma } from '../../../database/prisma.js';
import {
  DEFAULT_SYSTEM_ROLES,
  SYSTEM_PERMISSIONS,
} from '../rbac.constants.js';

const SCOPE_WEIGHTS: Record<PermissionScope, number> = {
  SELF: 1,
  TEAM: 2,
  DEPARTMENT: 3,
  COMPANY: 4,
  ALL: 5,
};

export class RbacService {
  /**
   * Inicializa o catálogo de permissões e perfis padrão no banco de dados
   */
  static async seedPermissionsAndRoles() {
    // 1. Cadastra/Atualiza todas as permissões do sistema
    for (const perm of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
        create: {
          code: perm.code,
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
      });
    }

    const allPermissions = await prisma.permission.findMany();
    const permMapByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

    // 2. Cadastra/Atualiza os perfis padrão do sistema
    for (const roleConfig of DEFAULT_SYSTEM_ROLES) {
      const role = await prisma.role.upsert({
        where: { name: roleConfig.name },
        update: {
          description: roleConfig.description,
          isSystemDefault: true,
        },
        create: {
          name: roleConfig.name,
          description: roleConfig.description,
          isSystemDefault: true,
        },
      });

      // Atualiza permissões do perfil
      for (const p of roleConfig.permissions) {
        const permissionId = permMapByCode.get(p.code);
        if (permissionId) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId,
              },
            },
            update: { scope: p.scope },
            create: {
              roleId: role.id,
              permissionId,
              scope: p.scope,
            },
          });
        }
      }
    }
  }

  /**
   * Lista todos os perfis cadastrados
   */
  static async listRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });
  }

  /**
   * Busca detalhes de um perfil pelo ID
   */
  static async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    });

    if (!role) {
      const error: any = new Error('Perfil de acesso não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return role;
  }

  /**
   * Cria um novo perfil customizado
   */
  static async createRole(data: {
    name: string;
    description: string;
    permissions?: { code: string; scope: PermissionScope }[];
  }) {
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      const error: any = new Error('Já existe um perfil com este nome');
      error.statusCode = 400;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      const role = await tx.role.create({
        data: {
          name: data.name,
          description: data.description,
          isSystemDefault: false,
        },
      });

      if (data.permissions && data.permissions.length > 0) {
        const allPerms = await tx.permission.findMany();
        const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

        for (const p of data.permissions) {
          const permissionId = permMap.get(p.code);
          if (permissionId) {
            await tx.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId,
                scope: p.scope,
              },
            });
          }
        }
      }

      return tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
    });
  }

  /**
   * Atualiza permissões e dados de um perfil
   */
  static async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: { code: string; scope: PermissionScope }[];
    }
  ) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      const error: any = new Error('Perfil de acesso não encontrado');
      error.statusCode = 404;
      throw error;
    }

    return prisma.$transaction(async (tx) => {
      if (data.name && data.name !== role.name) {
        if (role.isSystemDefault) {
          const error: any = new Error('O nome de perfis padrão do sistema não pode ser alterado');
          error.statusCode = 400;
          throw error;
        }

        const existing = await tx.role.findUnique({ where: { name: data.name } });
        if (existing) {
          const error: any = new Error('Já existe outro perfil com este nome');
          error.statusCode = 400;
          throw error;
        }
      }

      await tx.role.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.description ? { description: data.description } : {}),
        },
      });

      if (data.permissions) {
        // Substitui permissões associadas
        await tx.rolePermission.deleteMany({ where: { roleId: id } });

        const allPerms = await tx.permission.findMany();
        const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

        for (const p of data.permissions) {
          const permissionId = permMap.get(p.code);
          if (permissionId) {
            await tx.rolePermission.create({
              data: {
                roleId: id,
                permissionId,
                scope: p.scope,
              },
            });
          }
        }
      }

      return tx.role.findUnique({
        where: { id },
        include: {
          rolePermissions: { include: { permission: true } },
        },
      });
    });
  }

  /**
   * Exclui um perfil customizado
   */
  static async deleteRole(id: string) {
    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      const error: any = new Error('Perfil de acesso não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (role.isSystemDefault) {
      const error: any = new Error('Perfis padrão do sistema não podem ser excluídos');
      error.statusCode = 400;
      throw error;
    }

    await prisma.role.delete({ where: { id } });
    return { success: true, message: 'Perfil removido com sucesso' };
  }

  /**
   * Lista catálogo de todas as permissões cadastradas
   */
  static async listPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Atribui lista de papéis a um usuário
   */
  static async assignUserRoles(userId: string, roleIds: string[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      const error: any = new Error('Usuário não encontrado');
      error.statusCode = 404;
      throw error;
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId } }),
      ...roleIds.map((roleId) =>
        prisma.userRole.create({
          data: { userId, roleId },
        })
      ),
    ]);

    return this.getUserPermissionsAndScopes(userId);
  }

  /**
   * Consolida todas as permissões e escopos de um usuário a partir de seus papéis
   * Aplica hierarquia de escopos caso a mesma permissão exista em múltiplos papéis:
   * ALL (5) > COMPANY (4) > DEPARTMENT (3) > TEAM (2) > SELF (1)
   */
  static async getUserPermissionsAndScopes(userId: string): Promise<Record<string, PermissionScope>> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const permissionsMap: Record<string, PermissionScope> = {};

    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const code = rp.permission.code;
        const currentScope = permissionsMap[code];

        if (!currentScope) {
          permissionsMap[code] = rp.scope;
        } else {
          // Mantém o escopo mais abrangente
          const currentWeight = SCOPE_WEIGHTS[currentScope] || 0;
          const newWeight = SCOPE_WEIGHTS[rp.scope] || 0;
          if (newWeight > currentWeight) {
            permissionsMap[code] = rp.scope;
          }
        }
      }
    }

    return permissionsMap;
  }

  /**
   * Lista todos os usuários cadastrados com informações do colaborador e papéis atribuídos
   */
  static async listUsersWithRoles() {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            department: {
              select: { name: true },
            },
            position: {
              select: { title: true },
            },
          },
        },
        userRoles: {
          select: {
            roleId: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true,
                isSystemDefault: true,
              },
            },
          },
        },
      },
    });

    return users;
  }

  /**
   * Sincroniza usuários sem colaborador buscando correspondência por e-mail no cadastro funcional
   */
  static async syncUserEmployees() {
    const demoMappings: Record<string, string> = {
      'rh@atrio.com.br': 'camila.ferreira@atrio.com.br',
      'gestor@atrio.com.br': 'felipe.souza@atrio.com.br',
      'colaborador@atrio.com.br': 'bruno.martins@atrio.com.br',
      'admin@atrio.com.br': 'rodrigo.albuquerque@atrio.com.br',
    };

    let syncedCount = 0;
    const usersWithoutEmployee = await prisma.user.findMany({
      where: { employeeId: null },
    });

    for (const user of usersWithoutEmployee) {
      const targetEmployeeEmail = demoMappings[user.email] || user.email;
      const employee = await prisma.employee.findUnique({
        where: { email: targetEmployeeEmail },
      });

      if (employee) {
        const alreadyLinked = await prisma.user.findUnique({
          where: { employeeId: employee.id },
        });

        if (!alreadyLinked) {
          await prisma.user.update({
            where: { id: user.id },
            data: { employeeId: employee.id },
          });
          syncedCount++;
        }
      }
    }

    return { message: `${syncedCount} usuário(s) sincronizado(s) com colaborador com sucesso.` };
  }

  /**
   * Atualiza ou remove o vínculo de colaborador de um usuário
   */
  static async updateUserEmployee(userId: string, employeeId: string | null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (employeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!employee) {
        throw new Error('Colaborador não encontrado');
      }

      const existingOwner = await prisma.user.findUnique({ where: { employeeId } });
      if (existingOwner && existingOwner.id !== userId) {
        throw new Error('Este colaborador já está vinculado a outro usuário');
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { employeeId },
    });

    return this.listUsersWithRoles();
  }
}

