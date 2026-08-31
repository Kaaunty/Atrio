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
import { adminService, Role, Permission } from '../../services/adminService';
import { PermissionScope } from '../../services/authService';

export const AccessControlPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
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
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermissions(),
      ]);
      setRoles(rolesData || []);
      setPermissions(permsData || []);
    } catch (err) {
      console.error('Erro ao carregar perfis e permissões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      } else {
        await adminService.createRole({
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        });
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
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      loadData();
    } catch (err) {
      console.error('Erro ao excluir perfil:', err);
    }
  };

  // Agrupa permissões por módulo
  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    acc[p.module] = acc[p.module] || [];
    acc[p.module].push(p);
    return acc;
  }, {});

  return (
    <AppLayout
      title="Controle de Acesso & Perfis (RBAC)"
      subtitle="Gerenciamento de papéis, permissões granulares e configuração de escopos contextuais de acesso"
    >
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
            <p className="text-xs text-slate-500 font-medium">Perfis de Sistema</p>
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
            <p className="text-xs text-slate-500 font-medium">Permissões no Catálogo</p>
            <h4 className="text-xl font-bold text-emerald-700">{permissions.length}</h4>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5 bg-white border-atrio-border">
          <div className="w-10 h-10 rounded-lg bg-teal-50 text-atrio-navy flex items-center justify-center font-bold shrink-0 border border-teal-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total de Usuários Ativos</p>
            <h4 className="text-xl font-bold text-atrio-navy">
              {roles.reduce((acc, r) => acc + (r._count?.userRoles || 0), 0)}
            </h4>
          </div>
        </Card>
      </div>

      {/* Tabela de Perfis */}
      <Card className="p-5 space-y-4 bg-white border-atrio-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-atrio-navy">Perfis de Acesso (Roles)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cada perfil define o conjunto de ações permitidas e a abrangência (escopo) dos dados
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
                <th className="py-3 px-4">Descrição</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Permissões Atribuídas</th>
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
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {role.rolePermissions.length} permissões
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
                          title="Excluir Perfil"
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
              <span className="text-xs text-slate-400 font-medium">
                {roleForm.permissions.length} selecionadas
              </span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {Object.entries(groupedPermissions).map(([moduleName, perms]) => (
                <div
                  key={moduleName}
                  className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-2.5"
                >
                  <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Módulo: {moduleName}
                  </h5>

                  <div className="space-y-2">
                    {perms.map((p) => {
                      const selected = roleForm.permissions.find((rp) => rp.code === p.code);
                      const isChecked = !!selected;

                      return (
                        <div
                          key={p.code}
                          className={`p-2.5 rounded-lg border text-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-white border-atrio-teal/50 shadow-xs'
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
                            <div className="flex items-center gap-2 shrink-0 sm:w-44">
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
              ))}
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

      {/* Modal de Confirmação de Exclusão */}
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
