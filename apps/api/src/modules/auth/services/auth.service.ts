import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PermissionScope } from '@prisma/client';
import { prisma } from '../../../database/prisma.js';
import { env } from '../../../config/env.js';
import { RbacService } from '../../rbac/services/rbac.service.js';
import { LoginInput, RegisterUserInput } from '../auth.dto.js';
import { AuditService } from '../../audit/services/audit.service.js';

export interface TokenPayload {
  sub: string;
  email: string;
  employeeId?: string | null;
  roles: string[];
  permissions: Record<string, PermissionScope>;
}

export class AuthService {
  /**
   * Hasheia uma senha em texto claro
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compara uma senha em texto claro com o hash armazenado
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Gera Access Token e Refresh Token JWT
   */
  static generateTokens(
    user: { id: string; email: string; employeeId?: string | null },
    roles: string[],
    permissions: Record<string, PermissionScope>
  ) {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      employeeId: user.employeeId,
      roles,
      permissions,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '8h',
    });

    const refreshToken = jwt.sign(
      { sub: user.id, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Autenticação de usuário com emissão de tokens
   */
  static async login(data: LoginInput, meta?: { ipAddress?: string; userAgent?: string }) {
    const user = await prisma.user.findFirst({
      where: {
        email: data.email.toLowerCase().trim(),
        deletedAt: null,
      },
      include: {
        employee: {
          include: {
            company: { select: { id: true, tradeName: true, legalName: true } },
            department: { select: { id: true, name: true, code: true } },
            position: { select: { id: true, title: true, level: true } },
            unit: { select: { id: true, name: true } },
            manager: { select: { id: true, name: true, registrationNumber: true } },
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error('Credenciais inválidas');
      error.statusCode = 401;
      throw error;
    }

    if (!user.active) {
      const error: any = new Error('Conta de usuário inativa ou bloqueada');
      error.statusCode = 403;
      throw error;
    }

    const isPasswordValid = await this.comparePassword(data.password, user.passwordHash);
    if (!isPasswordValid) {
      const error: any = new Error('Credenciais inválidas');
      error.statusCode = 401;
      throw error;
    }

    // Atualiza data do último login
    const now = new Date();
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });

    // Registra log de auditoria do login
    await AuditService.log({
      userId: user.id,
      employeeId: user.employeeId,
      action: 'LOGIN',
      entity: 'User',
      recordId: user.id,
      newValue: { loginAt: now, email: user.email },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const roleNames = user.userRoles.map((ur) => ur.role.name);
    const permissions = await RbacService.getUserPermissionsAndScopes(user.id);
    const tokens = this.generateTokens(user, roleNames, permissions);

    return {
      user: {
        id: user.id,
        email: user.email,
        employeeId: user.employeeId,
        lastLoginAt: now,
      },
      employee: user.employee,
      roles: roleNames,
      permissions,
      ...tokens,
    };
  }

  /**
   * Renovação de Access Token via Refresh Token
   */
  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as { sub: string; type?: string };
      if (decoded.type !== 'refresh') {
        const error: any = new Error('Token inválido para renovação');
        error.statusCode = 401;
        throw error;
      }

      const user = await prisma.user.findFirst({
        where: { id: decoded.sub, active: true, deletedAt: null },
        include: {
          userRoles: { include: { role: true } },
        },
      });

      if (!user) {
        const error: any = new Error('Usuário não encontrado ou inativo');
        error.statusCode = 401;
        throw error;
      }

      const roleNames = user.userRoles.map((ur) => ur.role.name);
      const permissions = await RbacService.getUserPermissionsAndScopes(user.id);
      const tokens = this.generateTokens(user, roleNames, permissions);

      return tokens;
    } catch (err: any) {
      const error: any = new Error('Sessão expirada ou token inválido');
      error.statusCode = 401;
      throw error;
    }
  }

  /**
   * Retorna perfil e permissões completas do usuário autenticado
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        employee: {
          include: {
            company: true,
            unit: true,
            department: true,
            position: true,
            manager: {
              select: { id: true, name: true, registrationNumber: true, email: true },
            },
          },
        },
        userRoles: {
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
        },
      },
    });

    if (!user) {
      const error: any = new Error('Usuário não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const roleNames = user.userRoles.map((ur) => ur.role.name);
    const permissions = await RbacService.getUserPermissionsAndScopes(userId);

    return {
      user: {
        id: user.id,
        email: user.email,
        employeeId: user.employeeId,
        active: user.active,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
      employee: user.employee,
      roles: roleNames,
      permissions,
    };
  }

  /**
   * Cadastro de novo usuário
   */
  static async registerUser(data: RegisterUserInput) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      const error: any = new Error('Já existe um usuário cadastrado com este e-mail');
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await this.hashPassword(data.password);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash,
          employeeId: data.employeeId || null,
        },
      });

      // Atribui papéis se fornecidos
      if (data.roleNames && data.roleNames.length > 0) {
        const roles = await tx.role.findMany({
          where: { name: { in: data.roleNames } },
        });

        for (const r of roles) {
          await tx.userRole.create({
            data: { userId: user.id, roleId: r.id },
          });
        }
      }

      return user;
    });
  }

  /**
   * Inicializa o usuário administrador padrão e perfis caso não existam
   */
  static async seedAdminUser() {
    await RbacService.seedPermissionsAndRoles();

    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) return;

    const existingAdmin = await prisma.user.findFirst({
      where: { email: 'admin@atrio.com.br' },
    });

    const adminPasswordHash = await this.hashPassword(env.ADMIN_PASSWORD);
    const admin = existingAdmin
      ? await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { passwordHash: adminPasswordHash, active: true },
        })
      : await prisma.user.create({
          data: {
            email: 'admin@atrio.com.br',
            passwordHash: adminPasswordHash,
            active: true,
          },
        });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    });

    if (!existingAdmin) {
      console.log('✅ Usuário administrador padrão criado: admin@atrio.com.br');
    } else {
      console.log('✅ Usuário administrador padrão confirmado: admin@atrio.com.br');
    }

    const demoUsers = [
      { email: 'rh@atrio.com.br', roleName: 'RH', employeeEmail: 'camila.ferreira@atrio.com.br' },
      { email: 'gestor@atrio.com.br', roleName: 'GESTOR', employeeEmail: 'felipe.souza@atrio.com.br' },
      { email: 'colaborador@atrio.com.br', roleName: 'COLABORADOR', employeeEmail: 'bruno.martins@atrio.com.br' },
    ];

    for (const demo of demoUsers) {
      const role = await prisma.role.findUnique({ where: { name: demo.roleName } });
      if (!role) continue;

      const existingUser = await prisma.user.findUnique({ where: { email: demo.email } });
      const employee = await prisma.employee.findUnique({ where: { email: demo.employeeEmail } });
      const employeeOwner = employee
        ? await prisma.user.findUnique({ where: { employeeId: employee.id }, select: { id: true } })
        : null;
      const availableEmployeeId = employee && !employeeOwner ? employee.id : null;
      const passwordHash = await this.hashPassword(env.ADMIN_PASSWORD);
      const user = existingUser
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              passwordHash,
              active: true,
              ...(!existingUser.employeeId && availableEmployeeId ? { employeeId: availableEmployeeId } : {}),
            },
          })
        : await prisma.user.create({
            data: {
              email: demo.email,
              passwordHash,
              employeeId: availableEmployeeId,
              active: true,
            },
          });

      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });

      console.log(`✅ Usuário de demonstração confirmado: ${demo.email} (${demo.roleName})`);
    }
  }
}
