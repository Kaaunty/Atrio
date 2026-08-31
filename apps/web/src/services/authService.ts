import { api } from './api';
import { Employee } from './employeeService';

export type PermissionScope = 'SELF' | 'TEAM' | 'DEPARTMENT' | 'COMPANY' | 'ALL';

export interface AuthUser {
  id: string;
  email: string;
  employeeId?: string | null;
  active?: boolean;
  lastLoginAt?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  employee?: Employee | null;
  roles: string[];
  permissions: Record<string, PermissionScope>;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(credentials: { email: string; password: string }): Promise<LoginResponse> {
    const res = await api.post<{ success: boolean; data: LoginResponse }>('/auth/login', credentials);
    const data = res.data.data;
    if (data.accessToken) {
      localStorage.setItem('atrio_token', data.accessToken);
      localStorage.setItem('atrio_refresh_token', data.refreshToken);
      localStorage.setItem('atrio_user', JSON.stringify(data.user));
      localStorage.setItem('atrio_roles', JSON.stringify(data.roles));
      localStorage.setItem('atrio_permissions', JSON.stringify(data.permissions));
      if (data.employee) {
        localStorage.setItem('atrio_employee', JSON.stringify(data.employee));
      }
    }
    return data;
  },

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const res = await api.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
      '/auth/refresh-token',
      { refreshToken }
    );
    const data = res.data.data;
    if (data.accessToken) {
      localStorage.setItem('atrio_token', data.accessToken);
      localStorage.setItem('atrio_refresh_token', data.refreshToken);
    }
    return data;
  },

  async getMe(): Promise<{
    user: AuthUser;
    employee?: Employee | null;
    roles: string[];
    permissions: Record<string, PermissionScope>;
  }> {
    const res = await api.get<{
      success: boolean;
      data: {
        user: AuthUser;
        employee?: Employee | null;
        roles: string[];
        permissions: Record<string, PermissionScope>;
      };
    }>('/auth/me');
    return res.data.data;
  },

  logout() {
    localStorage.removeItem('atrio_token');
    localStorage.removeItem('atrio_refresh_token');
    localStorage.removeItem('atrio_user');
    localStorage.removeItem('atrio_roles');
    localStorage.removeItem('atrio_permissions');
    localStorage.removeItem('atrio_employee');
  },

  getStoredSession() {
    const token = localStorage.getItem('atrio_token');
    const userStr = localStorage.getItem('atrio_user');
    const rolesStr = localStorage.getItem('atrio_roles');
    const permsStr = localStorage.getItem('atrio_permissions');
    const employeeStr = localStorage.getItem('atrio_employee');

    if (!token || !userStr) return null;

    try {
      return {
        token,
        user: JSON.parse(userStr) as AuthUser,
        roles: (rolesStr ? JSON.parse(rolesStr) : []) as string[],
        permissions: (permsStr ? JSON.parse(permsStr) : {}) as Record<string, PermissionScope>,
        employee: employeeStr ? (JSON.parse(employeeStr) as Employee) : null,
      };
    } catch {
      return null;
    }
  },
};
