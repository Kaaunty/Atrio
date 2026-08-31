import { api, ApiResponse } from './api';

export type ContractType = 'CLT' | 'PJ' | 'ESTAGIO' | 'APRENDIZ' | 'TEMPORARIO';

export type EmployeeStatus = 'ATIVO' | 'FERIAS' | 'AFASTADO' | 'DESLIGADO';

export type TimelineEventType =
  | 'ADMISSAO'
  | 'MUDANCA_CARGO'
  | 'MUDANCA_SETOR'
  | 'MUDANCA_GESTOR'
  | 'ALTERACAO_SALARIAL'
  | 'FERIAS'
  | 'AFASTAMENTO'
  | 'DESLIGAMENTO'
  | 'OUTRO';

export interface EmployeeAddress {
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  complement?: string;
}

export interface EmployeeEmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface Employee {
  id: string;
  code: string | null;
  registrationNumber: string;
  name: string;
  cpf: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  address: EmployeeAddress | null;
  emergencyContact: EmployeeEmergencyContact | null;
  avatarUrl: string | null;
  salary: number | string | null;

  companyId: string;
  unitId: string | null;
  departmentId: string | null;
  positionId: string | null;
  managerId: string | null;
  userId: string | null;

  admissionDate: string;
  contractType: ContractType;
  workScheduleId: string | null;
  status: EmployeeStatus;
  terminationDate: string | null;

  createdAt: string;
  updatedAt: string;

  company?: {
    id: string;
    tradeName: string;
    legalName: string;
  };
  unit?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  position?: {
    id: string;
    title: string;
    level: string;
  } | null;
  manager?: {
    id: string;
    name: string;
    registrationNumber: string;
    email?: string;
    position?: { title: string; level: string } | null;
    department?: { name: string } | null;
  } | null;
  subordinates?: Employee[];
  history?: EmployeeHistory[];
  _count?: {
    subordinates: number;
    history?: number;
  };
}

export interface EmployeeHistory {
  id: string;
  employeeId: string;
  eventType: TimelineEventType;
  description: string;
  eventDate: string;
  previousData: Record<string, any> | null;
  newData: Record<string, any> | null;
  registeredBy: string | null;
  createdAt: string;
  author?: {
    id: string;
    email: string;
  } | null;
}

export interface CreateEmployeePayload {
  name: string;
  cpf: string;
  email: string;
  registrationNumber: string;
  code?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: EmployeeAddress | null;
  emergencyContact?: EmployeeEmergencyContact | null;
  avatarUrl?: string | null;
  salary?: number | null;

  companyId: string;
  unitId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  userId?: string | null;

  admissionDate: string;
  contractType?: ContractType;
  workScheduleId?: string | null;
  status?: EmployeeStatus;
}

export interface UpdateEmployeePayload {
  name?: string;
  cpf?: string;
  email?: string;
  registrationNumber?: string;
  code?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  address?: EmployeeAddress | null;
  emergencyContact?: EmployeeEmergencyContact | null;
  avatarUrl?: string | null;
  salary?: number | null;

  companyId?: string;
  unitId?: string | null;
  departmentId?: string | null;
  positionId?: string | null;
  managerId?: string | null;
  userId?: string | null;

  admissionDate?: string;
  contractType?: ContractType;
  workScheduleId?: string | null;
  status?: EmployeeStatus;
  terminationDate?: string | null;

  reason?: string;
  eventDate?: string;
}

export interface CreateTimelineEventPayload {
  eventType: TimelineEventType;
  description: string;
  eventDate: string;
  previousData?: Record<string, any> | null;
  newData?: Record<string, any> | null;
}

export const employeeService = {
  getEmployees: async (params?: {
    search?: string;
    companyId?: string;
    unitId?: string;
    departmentId?: string;
    positionId?: string;
    managerId?: string;
    status?: EmployeeStatus;
    contractType?: ContractType;
    page?: number;
    pageSize?: number;
  }) => {
    const { data } = await api.get<ApiResponse<Employee[]>>('/employees', { params });
    return data;
  },

  getEmployee: async (id: string) => {
    const { data } = await api.get<ApiResponse<Employee>>(`/employees/${id}`);
    return data.data;
  },

  createEmployee: async (payload: CreateEmployeePayload) => {
    const { data } = await api.post<ApiResponse<Employee>>('/employees', payload);
    return data.data;
  },

  updateEmployee: async (id: string, payload: UpdateEmployeePayload) => {
    const { data } = await api.put<ApiResponse<Employee>>(`/employees/${id}`, payload);
    return data.data;
  },

  deleteEmployee: async (id: string, reason?: string) => {
    const { data } = await api.delete<ApiResponse>(`/employees/${id}`, {
      data: { reason },
    });
    return data;
  },

  getSubordinates: async (id: string) => {
    const { data } = await api.get<ApiResponse<Employee[]>>(`/employees/${id}/subordinates`);
    return data.data;
  },

  getTimeline: async (id: string) => {
    const { data } = await api.get<ApiResponse<EmployeeHistory[]>>(`/employees/${id}/timeline`);
    return data.data;
  },

  createTimelineEvent: async (id: string, payload: CreateTimelineEventPayload) => {
    const { data } = await api.post<ApiResponse<EmployeeHistory>>(
      `/employees/${id}/timeline`,
      payload
    );
    return data.data;
  },
};
