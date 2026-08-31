import { api, ApiResponse } from './api';

export interface Company {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    units: number;
    departments: number;
  };
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string | null;
  active: boolean;
  createdAt: string;
  company?: {
    id: string;
    legalName: string;
    tradeName: string;
  };
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  costCenter: string | null;
  parentId: string | null;
  managerId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    legalName: string;
    tradeName: string;
  };
  parent?: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  children?: Department[];
  positions?: Position[];
  _count?: {
    children: number;
    positions: number;
  };
}

export interface DepartmentTreeNode {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  costCenter: string | null;
  parentId: string | null;
  managerId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  positionsCount: number;
  children: DepartmentTreeNode[];
}

export interface Position {
  id: string;
  departmentId: string | null;
  title: string;
  level: string;
  description: string | null;
  responsibilities: string | null;
  active: boolean;
  createdAt: string;
  department?: {
    id: string;
    name: string;
    code: string | null;
    company?: {
      id: string;
      tradeName: string;
    };
  } | null;
}

export interface OrgChartDepartmentNode {
  id: string;
  companyId: string;
  name: string;
  code: string | null;
  costCenter: string | null;
  parentId: string | null;
  managerId: string | null;
  positions: {
    id: string;
    title: string;
    level: string;
    active: boolean;
  }[];
  children: OrgChartDepartmentNode[];
  totalPositions: number;
  totalSubdepartments: number;
}

export interface OrgChartCompany {
  id: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  unitsCount: number;
  departmentsCount: number;
  totalPositionsCount: number;
  departmentsTree: OrgChartDepartmentNode[];
}

export const organizationService = {
  // Empresas
  getCompanies: async (params?: { search?: string; active?: boolean; page?: number; pageSize?: number }) => {
    const { data } = await api.get<ApiResponse<Company[]>>('/companies', { params });
    return data;
  },

  getCompany: async (id: string) => {
    const { data } = await api.get<ApiResponse<Company & { units: Unit[]; departments: Department[] }>>(`/companies/${id}`);
    return data.data;
  },

  createCompany: async (payload: { legalName: string; tradeName: string; cnpj: string; active?: boolean }) => {
    const { data } = await api.post<ApiResponse<Company>>('/companies', payload);
    return data.data;
  },

  updateCompany: async (id: string, payload: Partial<{ legalName: string; tradeName: string; cnpj: string; active: boolean }>) => {
    const { data } = await api.put<ApiResponse<Company>>(`/companies/${id}`, payload);
    return data.data;
  },

  deleteCompany: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/companies/${id}`);
    return data;
  },

  getCompanyUnits: async (companyId: string) => {
    const { data } = await api.get<ApiResponse<Unit[]>>(`/companies/${companyId}/units`);
    return data.data;
  },

  // Unidades
  getUnits: async (params?: { companyId?: string; search?: string; active?: boolean }) => {
    const { data } = await api.get<ApiResponse<Unit[]>>('/units', { params });
    return data.data;
  },

  createUnit: async (payload: { companyId: string; name: string; city?: string; state?: string; address?: string; active?: boolean }) => {
    const { data } = await api.post<ApiResponse<Unit>>('/units', payload);
    return data.data;
  },

  updateUnit: async (id: string, payload: Partial<{ companyId: string; name: string; city?: string; state?: string; address?: string; active: boolean }>) => {
    const { data } = await api.put<ApiResponse<Unit>>(`/units/${id}`, payload);
    return data.data;
  },

  deleteUnit: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/units/${id}`);
    return data;
  },

  // Setores
  getDepartments: async (params?: { companyId?: string; search?: string; active?: boolean }) => {
    const { data } = await api.get<ApiResponse<Department[]>>('/departments', { params });
    return data.data;
  },

  getDepartmentTree: async (params?: { companyId?: string; active?: boolean }) => {
    const { data } = await api.get<ApiResponse<DepartmentTreeNode[]>>('/departments/tree', { params });
    return data.data;
  },

  getDepartment: async (id: string) => {
    const { data } = await api.get<ApiResponse<Department>>(`/departments/${id}`);
    return data.data;
  },

  createDepartment: async (payload: {
    companyId: string;
    name: string;
    code?: string;
    costCenter?: string;
    parentId?: string | null;
    managerId?: string | null;
    active?: boolean;
  }) => {
    const { data } = await api.post<ApiResponse<Department>>('/departments', payload);
    return data.data;
  },

  updateDepartment: async (
    id: string,
    payload: Partial<{
      companyId: string;
      name: string;
      code?: string;
      costCenter?: string;
      parentId?: string | null;
      managerId?: string | null;
      active: boolean;
    }>
  ) => {
    const { data } = await api.put<ApiResponse<Department>>(`/departments/${id}`, payload);
    return data.data;
  },

  deleteDepartment: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/departments/${id}`);
    return data;
  },

  // Cargos
  getPositions: async (params?: { departmentId?: string; level?: string; search?: string; active?: boolean; page?: number; pageSize?: number }) => {
    const { data } = await api.get<ApiResponse<Position[]>>('/positions', { params });
    return data;
  },

  getPosition: async (id: string) => {
    const { data } = await api.get<ApiResponse<Position>>(`/positions/${id}`);
    return data.data;
  },

  createPosition: async (payload: {
    departmentId?: string | null;
    title: string;
    level: string;
    description?: string;
    responsibilities?: string;
    active?: boolean;
  }) => {
    const { data } = await api.post<ApiResponse<Position>>('/positions', payload);
    return data.data;
  },

  updatePosition: async (
    id: string,
    payload: Partial<{
      departmentId?: string | null;
      title: string;
      level: string;
      description?: string;
      responsibilities?: string;
      active: boolean;
    }>
  ) => {
    const { data } = await api.put<ApiResponse<Position>>(`/positions/${id}`, payload);
    return data.data;
  },

  deletePosition: async (id: string) => {
    const { data } = await api.delete<ApiResponse>(`/positions/${id}`);
    return data;
  },

  // Organograma
  getOrgChart: async (companyId?: string) => {
    const { data } = await api.get<ApiResponse<OrgChartCompany[]>>('/organization/chart', {
      params: companyId ? { companyId } : {},
    });
    return data.data;
  },
};
