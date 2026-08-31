import { api, ApiResponse } from './api';
import { PermissionScope } from './authService';

export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  scope: PermissionScope;
  permission: Permission;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
  rolePermissions: RolePermission[];
  _count?: {
    userRoles?: number;
    rolePermissions?: number;
  };
}

export interface UserWithRoles {
  id: string;
  email: string;
  createdAt: string;
  employee?: {
    id: string;
    name: string;
    registrationNumber: string;
    department?: { name: string } | null;
    position?: { title: string } | null;
  } | null;
  userRoles: {
    roleId: string;
    role: {
      id: string;
      name: string;
      description: string;
      isSystemDefault: boolean;
    };
  }[];
}

export interface AuditLogItem {
  id: string;
  userId?: string | null;
  employeeId?: string | null;
  action: string;
  entity: string;
  recordId: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    employee?: {
      id: string;
      name: string;
      registrationNumber: string;
    } | null;
  } | null;
  employee?: {
    id: string;
    name: string;
    registrationNumber: string;
  } | null;
}

export const adminService = {
  // Perfis (Roles)
  async getRoles(): Promise<Role[]> {
    const res = await api.get<ApiResponse<Role[]>>('/admin/roles');
    return res.data.data;
  },

  async getRole(id: string): Promise<Role> {
    const res = await api.get<ApiResponse<Role>>(`/admin/roles/${id}`);
    return res.data.data;
  },

  async createRole(data: {
    name: string;
    description: string;
    permissions?: { code: string; scope: PermissionScope }[];
  }): Promise<Role> {
    const res = await api.post<ApiResponse<Role>>('/admin/roles', data);
    return res.data.data;
  },

  async updateRole(
    id: string,
    data: {
      name?: string;
      description?: string;
      permissions?: { code: string; scope: PermissionScope }[];
    }
  ): Promise<Role> {
    const res = await api.put<ApiResponse<Role>>(`/admin/roles/${id}`, data);
    return res.data.data;
  },

  async deleteRole(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete<ApiResponse<{ success: boolean; message: string }>>(`/admin/roles/${id}`);
    return res.data.data;
  },

  // Permissões
  async getPermissions(): Promise<Permission[]> {
    const res = await api.get<ApiResponse<Permission[]>>('/admin/permissions');
    return res.data.data;
  },

  // Usuários & Papéis
  async getUsersWithRoles(): Promise<UserWithRoles[]> {
    const res = await api.get<ApiResponse<UserWithRoles[]>>('/admin/users');
    return res.data.data;
  },

  async assignUserRoles(userId: string, roleIds: string[]): Promise<Record<string, PermissionScope>> {
    const res = await api.post<ApiResponse<Record<string, PermissionScope>>>(`/admin/users/${userId}/roles`, { roleIds });
    return res.data.data;
  },

  // Auditoria
  async getAuditLogs(params?: {
    page?: number;
    pageSize?: number;
    userId?: string;
    entity?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ items: AuditLogItem[]; meta: any }> {
    const res = await api.get<ApiResponse<AuditLogItem[]>>('/admin/audit-logs', { params });
    return {
      items: res.data.data,
      meta: res.data.meta,
    };
  },
};
