import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, AuthUser, PermissionScope } from '../services/authService';
import { Employee } from '../services/employeeService';

const SCOPE_WEIGHTS: Record<PermissionScope, number> = {
  SELF: 1,
  TEAM: 2,
  DEPARTMENT: 3,
  COMPANY: 4,
  ALL: 5,
};

interface AuthContextData {
  user: AuthUser | null;
  employee: Employee | null;
  roles: string[];
  permissions: Record<string, PermissionScope>;
  requiresPasswordChange: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  completePasswordChange: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionCode: string, minScope?: PermissionScope) => boolean;
  hasRole: (...roleNames: string[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<string, PermissionScope>>({});
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Inicializa sessão a partir do localStorage
  useEffect(() => {
    const session = authService.getStoredSession();
    if (session) {
      setUser(session.user);
      setRoles(session.roles);
      setPermissions(session.permissions);
      setEmployee(session.employee);
      setRequiresPasswordChange(session.requiresPasswordChange);
    }
    setLoading(false);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const data = await authService.login(credentials);
    setUser(data.user);
    setRoles(data.roles);
    setPermissions(data.permissions);
    setEmployee(data.employee || null);
    setRequiresPasswordChange(data.requiresPasswordChange);
    return data.requiresPasswordChange;
  };

  const completePasswordChange = async (data: { currentPassword: string; newPassword: string }) => {
    await authService.changePassword(data);
    setRequiresPasswordChange(false);
    setUser((currentUser) => (currentUser ? { ...currentUser, mustChangePassword: false } : currentUser));
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setEmployee(null);
    setRoles([]);
    setPermissions({});
    setRequiresPasswordChange(false);
  };

  const refreshProfile = async () => {
    try {
      const data = await authService.getMe();
      setUser(data.user);
      setRoles(data.roles);
      setPermissions(data.permissions);
      setEmployee(data.employee || null);
      setRequiresPasswordChange(Boolean(data.user.mustChangePassword));
    } catch {
      logout();
    }
  };

  const hasPermission = (permissionCode: string, minScope?: PermissionScope): boolean => {
    if (roles.includes('ADMIN')) return true;

    let userScope = permissions[permissionCode];

    // Alias para compatibilidade de rotas
    if (!userScope) {
      if (permissionCode === 'admin.rbac.gerenciar') userScope = permissions['rbac.gerenciar'];
      if (permissionCode === 'admin.auditoria.visualizar') userScope = permissions['auditoria.visualizar'];
      if (permissionCode === 'rbac.gerenciar') userScope = permissions['admin.rbac.gerenciar'];
      if (permissionCode === 'auditoria.visualizar') userScope = permissions['admin.auditoria.visualizar'];
    }

    if (!userScope) return false;

    if (minScope) {
      const userWeight = SCOPE_WEIGHTS[userScope] || 0;
      const requiredWeight = SCOPE_WEIGHTS[minScope] || 0;
      return userWeight >= requiredWeight;
    }

    return true;
  };

  const hasRole = (...roleNames: string[]): boolean => {
    if (roles.includes('ADMIN')) return true;
    return roles.some((r) => roleNames.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        roles,
        permissions,
        requiresPasswordChange,
        isAuthenticated: !!user,
        loading,
        login,
        completePasswordChange,
        logout,
        hasPermission,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
