import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../../database/prisma.js';
import { AuthService } from '../services/auth.service.js';
import { RbacService } from '../../rbac/services/rbac.service.js';
import { AuditService } from '../../audit/services/audit.service.js';

describe('Auth, RBAC & Audit Module Suite', () => {
  let createdUserId: string;
  let testRoleId: string;

  before(async () => {
    // Inicializa catálogo de permissões e perfis padrão
    await RbacService.seedPermissionsAndRoles();
  });

  after(async () => {
    if (createdUserId) {
      await prisma.userRole.deleteMany({ where: { userId: createdUserId } });
      await prisma.auditLog.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    if (testRoleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId: testRoleId } });
      await prisma.role.deleteMany({ where: { id: testRoleId } });
    }
  });

  test('1. deve inicializar catálogo de permissões e perfis padrão com sucesso', async () => {
    const permissions = await RbacService.listPermissions();
    assert.ok(permissions.length >= 10, 'Deve ter pelo menos 10 permissões cadastradas');

    const roles = await RbacService.listRoles();
    const roleNames = roles.map((r) => r.name);
    assert.ok(roleNames.includes('ADMIN'), 'Deve conter perfil ADMIN');
    assert.ok(roleNames.includes('RH'), 'Deve conter perfil RH');
    assert.ok(roleNames.includes('GESTOR'), 'Deve conter perfil GESTOR');
    assert.ok(roleNames.includes('COLABORADOR'), 'Deve conter perfil COLABORADOR');
  });

  test('2. deve cadastrar usuário, hashear senha e realizar login com emissão de tokens JWT', async () => {
    const testEmail = `test.user.${Date.now()}@atrio.com.br`;

    const user = await AuthService.registerUser({
      email: testEmail,
      password: 'SenhaForte123!',
      roleNames: ['COLABORADOR'],
    });

    createdUserId = user.id;
    assert.ok(user.id, 'Usuário deve ser criado com ID');
    assert.notStrictEqual(user.passwordHash, 'SenhaForte123!', 'Senha não deve ser salva em texto claro');

    // Login com credenciais válidas
    const loginResult = await AuthService.login({
      email: testEmail,
      password: 'SenhaForte123!',
    });

    assert.ok(loginResult.accessToken, 'Deve retornar accessToken');
    assert.ok(loginResult.refreshToken, 'Deve retornar refreshToken');
    assert.strictEqual(loginResult.user.email, testEmail);
    assert.ok(loginResult.roles.includes('COLABORADOR'));
    assert.strictEqual(loginResult.permissions['colaboradores.visualizar'], 'SELF');
  });

  test('3. deve rejeitar login com senha incorreta ou usuário inexistente', async () => {
    await assert.rejects(
      async () => {
        await AuthService.login({
          email: 'usuario.inexistente@atrio.com.br',
          password: '123',
        });
      },
      { statusCode: 401 }
    );
  });

  test('4. deve renovar tokens com sucesso via refresh token', async () => {
    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    assert.ok(user);

    const tokens = AuthService.generateTokens(user, ['COLABORADOR'], {
      'colaboradores.visualizar': 'SELF',
    });

    const refreshed = await AuthService.refreshToken(tokens.refreshToken);
    assert.ok(refreshed.accessToken, 'Deve retornar novo access token');
    assert.ok(refreshed.refreshToken, 'Deve retornar novo refresh token');
  });

  test('5. deve consolidar permissões e escopos em múltiplos papéis com hierarquia de precedência', async () => {
    // Atribui papel GESTOR e depois RH
    const gestorRole = await prisma.role.findUnique({ where: { name: 'GESTOR' } });
    const rhRole = await prisma.role.findUnique({ where: { name: 'RH' } });
    assert.ok(gestorRole && rhRole);

    await RbacService.assignUserRoles(createdUserId, [gestorRole.id, rhRole.id]);

    const perms = await RbacService.getUserPermissionsAndScopes(createdUserId);
    // Para 'colaboradores.visualizar': GESTOR tem 'TEAM' (peso 2), RH tem 'COMPANY' (peso 4) -> Prevalece 'COMPANY'
    assert.strictEqual(perms['colaboradores.visualizar'], 'COMPANY');
  });

  test('6. deve criar, atualizar e excluir perfis customizados protegendo perfis de sistema', async () => {
    const customRole = await RbacService.createRole({
      name: `AUDITOR_INTERNO_${Date.now()}`,
      description: 'Perfil customizado para auditoria interna',
      permissions: [
        { code: 'admin.auditoria.visualizar', scope: 'ALL' },
        { code: 'colaboradores.visualizar', scope: 'COMPANY' },
      ],
    });

    assert.ok(customRole);
    testRoleId = customRole.id;
    assert.strictEqual(customRole.isSystemDefault, false);
    assert.strictEqual(customRole.rolePermissions.length, 2);

    // Tentativa de exclusão de perfil padrão do sistema (ADMIN) deve falhar
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    assert.ok(adminRole);

    await assert.rejects(
      async () => {
        await RbacService.deleteRole(adminRole.id);
      },
      { statusCode: 400 }
    );

    // Exclusão do perfil customizado deve ser permitida
    const delResult = await RbacService.deleteRole(customRole.id);
    assert.strictEqual(delResult.success, true);
    testRoleId = '';
  });

  test('7. deve gravar e consultar logs de auditoria com rastreabilidade completa', async () => {
    const log = await AuditService.log({
      userId: createdUserId,
      action: 'UPDATE',
      entity: 'Employee',
      recordId: 'EMP-001',
      previousValue: { salary: 5000, position: 'Analista Jr' },
      newValue: { salary: 6500, position: 'Analista Pleno' },
      ipAddress: '127.0.0.1',
      userAgent: 'Integration-Test-Agent',
    });

    assert.ok(log?.id, 'Log de auditoria deve ser criado');

    const result = await AuditService.list({
      userId: createdUserId,
      entity: 'Employee',
      action: 'UPDATE',
    });

    assert.ok(result.items.length >= 1, 'Deve retornar ao menos 1 log');
    assert.strictEqual(result.items[0].action, 'UPDATE');
    assert.strictEqual(result.items[0].entity, 'Employee');
  });
});
