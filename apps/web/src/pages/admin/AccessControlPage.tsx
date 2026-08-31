import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Users,
  Layers,
  AlertCircle,
  Key,
  Search,
  UserCheck,
  UserPlus,
  CheckSquare,
  Square,
  CheckCircle2,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  adminService,
  Role,
  Permission,
  UserWithRoles,
} from '../../services/adminService';
import { PermissionScope } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';
import { employeeService, Employee } from '../../services/employeeService';

export const AccessControlPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isSystemAdmin = hasRole('ADMIN');
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais de Perfil (Role)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState<{
    name: string;
    description: string;
    permissions: { code: string; scope: PermissionScope }[];
  }>({
    name: '',
    description: '',
    permissions: [],
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Modal de Atribuição de Usuário
  const [isUserRoleModalOpen, setIsUserRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Modal de Criação de Usuário (exclusivo ADMIN)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    roleName: '',
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData, usersData] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissions(),
        adminService.getUsersWithRoles(),
      ]);
      setRoles(rolesData || []);
      setPermissions(permsData || []);
      setUsers(usersData || []);
    } catch (err) {
      console.error('Erro ao carregar dados do RBAC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // --- Handlers para Perfis (Roles) ---
  const handleOpenCreate = () => {
    setEditingRole(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: [],
    });
    setError(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEdit = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        code: rp.permission.code,
        scope: rp.scope,
      })),
    });
    setError(null);
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (code: string, scope: PermissionScope = 'SELF') => {
    const exists = roleForm.permissions.find((p) => p.code === code);
    if (exists) {
      setRoleForm({
        ...roleForm,
        permissions: roleForm.permissions.filter((p) => p.code !== code),
      });
    } else {
      setRoleForm({
        ...roleForm,
        permissions: [...roleForm.permissions, { code, scope }],
      });
    }
  };

  const handleScopeChange = (code: string, newScope: PermissionScope) => {
    setRoleForm({
      ...roleForm,
      permissions: roleForm.permissions.map((p) =>
        p.code === code ? { ...p, scope: newScope } : p
      ),
    });
  };

  // Seleção e alteração em massa por módulo
  const handleSelectModuleAll = (modulePerms: Permission[], scope: PermissionScope = 'COMPANY') => {
    const permCodes = new Set(modulePerms.map((p) => p.code));
    const currentOthers = roleForm.permissions.filter((p) => !permCodes.has(p.code));
    const newModulePerms = modulePerms.map((p) => ({
      code: p.code,
      scope: p.module === 'ADMIN' ? ('ALL' as PermissionScope) : scope,
    }));

    setRoleForm({
      ...roleForm,
      permissions: [...currentOthers, ...newModulePerms],
    });
  };

  const handleDeselectModuleAll = (modulePerms: Permission[]) => {
    const permCodes = new Set(modulePerms.map((p) => p.code));
    setRoleForm({
      ...roleForm,
      permissions: roleForm.permissions.filter((p) => !permCodes.has(p.code)),
    });
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim() || !roleForm.description.trim()) {
      setError('Por favor, preencha o nome e a descrição do perfil.');
      return;
    }

    try {
      setModalLoading(true);
      setError(null);

      if (editingRole) {
        await adminService.updateRole(editingRole.id, {
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        });
        showNotification(`Perfil "${roleForm.name}" atualizado com sucesso!`);
      } else {
        await adminService.createRole({
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        });
        showNotification(`Perfil "${roleForm.name}" criado com sucesso!`);
      }

      setIsRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao salvar perfil.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenDelete = (role: Role) => {
    setRoleToDelete(role);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      await adminService.deleteRole(roleToDelete.id);
      showNotification(`Perfil "${roleToDelete.name}" removido com sucesso.`);
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      loadData();
    } catch (err) {
      console.error('Erro ao excluir perfil:', err);
    }
  };

  // --- Handlers para Atribuição de Usuários ---
  const handleOpenUserRoleModal = (user: UserWithRoles) => {
    setSelectedUser(user);
    setUserRoleIds(user.userRoles.map((ur) => ur.roleId));
    setError(null);
    setIsUserRoleModalOpen(true);
  };

  const handleToggleUserRole = (roleId: string) => {
    if (userRoleIds.includes(roleId)) {
      setUserRoleIds(userRoleIds.filter((id) => id !== roleId));
    } else {
      setUserRoleIds([...userRoleIds, roleId]);
    }
  };

  const handleSubmitUserRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setModalLoading(true);
      setError(null);
      await adminService.assignUserRoles(selectedUser.id, userRoleIds);
      showNotification(`Perfis do usuário ${selectedUser.email} atualizados!`);
      setIsUserRoleModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao atribuir perfis ao usuário.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenCreateUser = async () => {
    setError(null);
    setCreateUserForm({ email: '', password: '', confirmPassword: '', employeeId: '', roleName: '' });
    setIsCreateUserModalOpen(true);

    try {
      const response = await employeeService.getEmployees({ pageSize: 100, status: 'ATIVO' });
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar colaboradores para o novo usuário:', err);
      setError('Não foi possível carregar a lista de colaboradores.');
    }
  };

  const handleSubmitCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (createUserForm.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (createUserForm.password !== createUserForm.confirmPassword) {
      setError('A confirmação de senha não confere.');
      return;
    }
    if (!createUserForm.roleName) {
      setError('Selecione um perfil de acesso.');
      return;
    }

    try {
      setModalLoading(true);
      setError(null);
      await adminService.createUser({
        email: createUserForm.email,
        password: createUserForm.password,
        employeeId: createUserForm.employeeId || null,
        roleNames: [createUserForm.roleName],
      });
      showNotification(`Usuário ${createUserForm.email} criado com sucesso!`);
      setIsCreateUserModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao criar usuário.');
    } finally {
      setModalLoading(false);
    }
  };

  // Agrupa permissões por módulo
  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  // Filtro de usuários
  const filteredUsers = users.filter((u) => {
    const search = userSearchTerm.toLowerCase();
    const name = u.employee?.name.toLowerCase() || '';
    const email = u.email.toLowerCase();
    const reg = u.employee?.registrationNumber || '';
    return name.includes(search) || email.includes(search) || reg.includes(search);
  });

  return (
    <AppLayout
      title="Controle de Acesso & Perfis (RBAC)"
      subtitle="Gerenciamento de papéis, permissões granulares, escopos contextuais e atribuição por usuário"
    >
      {/* Alerta de Sucesso */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-medium border border-emerald-200 flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0 border border-purple-100">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Perfis Cadastrados</p>
            <h4 className="text-xl font-bold text-atrio-navy">{roles.length}</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold shrink-0 border border-blue-100">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Perfis Padrão</p>
            <h4 className="text-xl font-bold text-blue-700">
              {roles.filter((r) => r.isSystemDefault).length}
            </h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shrink-0 border border-emerald-100">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Catálogo de Permissões</p>
            <h4 className="text-xl font-bold text-emerald-700">{permissions.length}</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-atrio-navy flex items-center justify-center font-bold shrink-0 border border-teal-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Usuários Mapeados</p>
            <h4 className="text-xl font-bold text-atrio-navy">{users.length}</h4>
          </div>
        </Card>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'roles'
              ? 'border-atrio-teal text-atrio-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Shield className="w-4 h-4" />
          Perfis de Acesso & Matriz (Roles)
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {roles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-atrio-teal text-atrio-navy'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Atribuição por Usuário
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {users.length}
          </span>
        </button>
      </div>

      {/* ABA 1: PERFIS DE ACESSO */}
      {activeTab === 'roles' && (
        <Card className="p-5 space-y-4 bg-white border-atrio-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-atrio-navy">Perfis de Acesso do Sistema</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Defina os papéis dos usuários e especifique a abrangência dos dados por permissão (SELF, TEAM, DEPARTMENT, COMPANY, ALL)
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleOpenCreate}
              icon={<Plus className="w-4 h-4" />}
            >
              Novo Perfil Customizado
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-atrio-border">
            <table className="w-full text-left text-sm text-atrio-text-primary">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-atrio-border">
                <tr>
                  <th className="py-3 px-4">Nome do Perfil</th>
                  <th className="py-3 px-4">Descrição das Atribuições</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Permissões Vinculadas</th>
                  <th className="py-3 px-4">Usuários</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atrio-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Carregando perfis de acesso...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      Nenhum perfil cadastrado.
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-atrio-navy flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                        {role.name}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                        {role.description}
                      </td>

                      <td className="py-3.5 px-4">
                        {role.isSystemDefault ? (
                          <Badge variant="navy">Padrão do Sistema</Badge>
                        ) : (
                          <Badge variant="neutral">Customizado</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {role.rolePermissions.length} de {permissions.length} ativas
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {role._count?.userRoles || 0} usuário(s)
                      </td>

                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Editar Perfil e Permissões"
                          onClick={() => handleOpenEdit(role)}
                        >
                          <Edit2 className="w-4 h-4 text-atrio-teal-dark" />
                        </Button>

                        {!role.isSystemDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Excluir Perfil Customizado"
                            onClick={() => handleOpenDelete(role)}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ABA 2: ATRIBUIÇÃO DE USUÁRIOS */}
      {activeTab === 'users' && (
        <Card className="p-5 space-y-4 bg-white border-atrio-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-atrio-navy">Gerenciamento de Perfis por Usuário</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Vincule um ou mais papéis de acesso aos usuários cadastrados no sistema
              </p>
            </div>

            {isSystemAdmin && (
              <Button
                variant="primary"
                size="md"
                onClick={handleOpenCreateUser}
                icon={<UserPlus className="w-4 h-4" />}
              >
                Novo Usuário
              </Button>
            )}

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome, e-mail ou matrícula..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-atrio-teal/30 focus:border-atrio-teal"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-atrio-border">
            <table className="w-full text-left text-sm text-atrio-text-primary">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600 border-b border-atrio-border">
                <tr>
                  <th className="py-3 px-4">Colaborador / E-mail</th>
                  <th className="py-3 px-4">Matrícula</th>
                  <th className="py-3 px-4">Departamento & Cargo</th>
                  <th className="py-3 px-4">Perfis Atribuídos</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atrio-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Carregando usuários...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-atrio-navy">
                          {user.employee?.name || 'Usuário Sem Colaborador'}
                        </p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                        {user.employee?.registrationNumber || 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {user.employee?.department?.name || 'N/A'}{' '}
                        {user.employee?.position?.title && `— ${user.employee.position.title}`}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {user.userRoles.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">Nenhum perfil</span>
                          ) : (
                            user.userRoles.map((ur) => (
                              <Badge key={ur.roleId} variant="navy">
                                {ur.role.name}
                              </Badge>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<UserCheck className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenUserRoleModal(user)}
                        >
                          Gerenciar Perfis
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de Criação de Usuário */}
      <Modal
        isOpen={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
        title="Novo Usuário"
        subtitle="Criação de contas restrita ao administrador do sistema"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitCreateUser} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="E-mail de acesso"
            type="email"
            value={createUserForm.email}
            onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
            placeholder="usuario@empresa.com.br"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Senha"
              type="password"
              minLength={6}
              value={createUserForm.password}
              onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
              required
            />
            <Input
              label="Confirmar senha"
              type="password"
              minLength={6}
              value={createUserForm.confirmPassword}
              onChange={(e) => setCreateUserForm({ ...createUserForm, confirmPassword: e.target.value })}
              required
            />
          </div>

          <Select
            label="Perfil de acesso"
            value={createUserForm.roleName}
            onChange={(e) => setCreateUserForm({ ...createUserForm, roleName: e.target.value })}
            required
            options={[
              { value: '', label: 'Selecione um perfil...' },
              ...roles.map((role) => ({ value: role.name, label: role.name })),
            ]}
          />

          <Select
            label="Vincular ao colaborador"
            helperText="Opcional. O vínculo associa a conta ao cadastro funcional."
            value={createUserForm.employeeId}
            onChange={(e) => setCreateUserForm({ ...createUserForm, employeeId: e.target.value })}
            options={[
              { value: '', label: 'Sem vínculo neste momento' },
              ...employees
                .filter((employee) => !users.some((user) => user.employee?.id === employee.id))
                .map((employee) => ({
                  value: employee.id,
                  label: `${employee.name} — ${employee.email}`,
                })),
            ]}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-atrio-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateUserModalOpen(false)}
              disabled={modalLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={modalLoading}>
              {modalLoading ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Criação / Edição de Perfil & Matriz de Escopos */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Editar Perfil: ${editingRole.name}` : 'Cadastrar Novo Perfil de Acesso'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmitRole} className="space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome do Perfil"
              placeholder="Ex: AUDITOR_QUALIDADE"
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value.toUpperCase() })}
              required
              disabled={editingRole?.isSystemDefault}
              helperText={
                editingRole?.isSystemDefault
                  ? 'Perfis padrão do sistema têm nomes protegidos'
                  : 'Letras maiúsculas sem espaços'
              }
            />

            <div className="sm:col-span-2">
              <Textarea
                label="Descrição das Atribuições"
                rows={2}
                placeholder="Ex: Perfil com acesso de leitura a histórico de colaboradores e auditoria..."
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Matriz de Permissões e Escopos por Módulo */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-xs font-bold text-atrio-navy uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-atrio-teal" />
                Matriz de Permissões & Escopos Contextuais
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                <strong className="text-atrio-navy">{roleForm.permissions.length}</strong> de {permissions.length} selecionadas
              </span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                const allModuleChecked = perms.every((p) =>
                  roleForm.permissions.some((rp) => rp.code === p.code)
                );

                return (
                  <div
                    key={moduleName}
                    className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <Layers className="w-3.5 h-3.5 text-atrio-teal" />
                        Módulo: {moduleName}
                      </h5>

                      <div className="flex items-center gap-2">
                        {allModuleChecked ? (
                          <button
                            type="button"
                            onClick={() => handleDeselectModuleAll(perms)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-1"
                          >
                            <Square className="w-3 h-3" /> Desmarcar Módulo
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectModuleAll(perms, 'COMPANY')}
                            className="text-[11px] font-semibold text-atrio-teal hover:underline flex items-center gap-1"
                          >
                            <CheckSquare className="w-3 h-3" /> Marcar Todos
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {perms.map((p) => {
                        const selected = roleForm.permissions.find((rp) => rp.code === p.code);
                        const isChecked = !!selected;

                        return (
                          <div
                            key={p.code}
                            className={`p-2.5 rounded-lg border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isChecked
                                ? 'bg-white border-atrio-teal/60 shadow-xs'
                                : 'bg-white/60 border-slate-200 opacity-75'
                            }`}
                          >
                            <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.code)}
                                className="mt-0.5 rounded text-atrio-navy focus:ring-atrio-teal"
                              />
                              <div>
                                <p className="font-semibold text-slate-800">{p.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{p.description}</p>
                              </div>
                            </label>

                            {/* Seletor de Escopo se a permissão estiver marcada */}
                            {isChecked && (
                              <div className="flex items-center gap-2 shrink-0 sm:w-48">
                                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                                  Escopo:
                                </span>
                                <Select
                                  value={selected.scope}
                                  onChange={(e) =>
                                    handleScopeChange(p.code, e.target.value as PermissionScope)
                                  }
                                  options={[
                                    { value: 'SELF', label: 'SELF (Próprio)' },
                                    { value: 'TEAM', label: 'TEAM (Equipe)' },
                                    { value: 'DEPARTMENT', label: 'DEPARTMENT (Setor)' },
                                    { value: 'COMPANY', label: 'COMPANY (Empresa)' },
                                    { value: 'ALL', label: 'ALL (Geral/Todos)' },
                                  ]}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rodapé do Modal */}
          <div className="flex justify-end gap-2 pt-4 border-t border-atrio-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={modalLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={modalLoading}>
              {modalLoading ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Atribuição de Papéis ao Usuário */}
      <Modal
        isOpen={isUserRoleModalOpen}
        onClose={() => setIsUserRoleModalOpen(false)}
        title={`Gerenciar Perfis do Usuário`}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitUserRoles} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {selectedUser && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Usuário Selecionado:</p>
              <h4 className="text-sm font-bold text-atrio-navy mt-0.5">
                {selectedUser.employee?.name || selectedUser.email}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">{selectedUser.email}</p>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Selecione os Perfis de Acesso para este usuário:
            </label>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {roles.map((role) => {
                const isSelected = userRoleIds.includes(role.id);

                return (
                  <label
                    key={role.id}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleUserRole(role.id)}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-atrio-navy">{role.name}</span>
                        {role.isSystemDefault && (
                          <Badge variant="navy">Padrão</Badge>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">{role.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-atrio-border">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUserRoleModalOpen(false)}
              disabled={modalLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={modalLoading}>
              {modalLoading ? 'Salvando...' : 'Atualizar Perfis'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Confirmação de Exclusão de Perfil */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Perfil"
        description={`Tem certeza que deseja excluir o perfil "${roleToDelete?.name}"? Esta ação removerá as atribuições dos usuários vinculados.`}
        confirmText="Excluir Perfil"
        variant="danger"
      />
    </AppLayout>
  );
};
