import { api, ApiResponse } from './api';

export interface ImportPreviewRecord {
  rowIndex: number;
  row?: number;
  code?: string | null;
  name: string;
  birthDate?: string | null;
  cpf: string;
  admissionDate?: string;
  registrationNumber: string;
  departmentName: string;
  rawManagerName?: string | null;
  managerRawName?: string | null;
  matchedManagerId?: string | null;
  matchedManagerName?: string | null;
  salary?: number | null;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | null;
  phone?: string | null;
  email: string;
  action?: 'CREATE' | 'UPDATE';
  errors: string[];
  warnings?: string[];
  isValid?: boolean;
}

export interface ManagerMatchInfo {
  rawName: string;
  cleanedName: string;
  status: 'MATCHED_DB' | 'MATCHED_SHEET' | 'UNRESOLVED';
  matchedEmployeeId: string | null;
  matchedEmployeeName: string | null;
  count?: number;
}

export interface ImportPreviewResponse {
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    validCount: number;
    errorCount: number;
    toCreateRows?: number;
    toUpdateRows?: number;
  };
  newDepartments: string[];
  existingDepartments: string[];
  departments: {
    existing: string[];
    toCreate: string[];
  };
  managers: {
    resolved: ManagerMatchInfo[];
    unresolved: ManagerMatchInfo[];
  };
  employees: ImportPreviewRecord[];
  records: ImportPreviewRecord[];
  suggestedDomain?: string;
}

export interface ImportConfirmPayload {
  companyId: string;
  emailDomain?: string;
  updateExisting?: boolean;
  managerResolutions?: Record<string, string | null>;
  employees?: any[];
  records?: any[];
}

export interface ImportConfirmResponse {
  totalCreated: number;
  totalUpdated?: number;
  importedCount: number;
  managersLinked?: number;
  departmentsCreated?: number;
  employees?: Array<{
    id: string;
    name: string;
    registrationNumber: string;
    email: string;
  }>;
  errors?: Array<{
    row?: number;
    name?: string;
    message: string;
  }>;
}

export const employeeImportService = {
  previewImport: async (
    file: File,
    companyId: string,
    emailDomain?: string,
    updateExisting?: boolean
  ): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyId', companyId);
    if (emailDomain) {
      formData.append('emailDomain', emailDomain);
    }
    if (updateExisting !== undefined) {
      formData.append('updateExisting', String(updateExisting));
    }

    const { data } = await api.post<ApiResponse<ImportPreviewResponse>>(
      '/employees/import/preview',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    const raw = data.data as any;
    const records = (raw.employees || raw.records || []).map((r: any) => ({
      ...r,
      row: r.row || r.rowIndex,
      managerRawName: r.managerRawName || r.rawManagerName,
      rawManagerName: r.rawManagerName || r.managerRawName,
      isValid: r.errors ? r.errors.length === 0 : true,
      action: r.action || 'CREATE',
    }));

    const allManagers: ManagerMatchInfo[] = [];
    if (Array.isArray(raw.managers)) {
      allManagers.push(...raw.managers);
    } else if (raw.managers) {
      if (Array.isArray(raw.managers.resolved)) allManagers.push(...raw.managers.resolved);
      if (Array.isArray(raw.managers.unresolved)) allManagers.push(...raw.managers.unresolved);
    }

    const newDepts = raw.newDepartments || raw.departments?.toCreate || [];
    const existingDepts = raw.existingDepartments || raw.departments?.existing || [];

    const toCreateCount = raw.summary?.toCreateRows ?? records.filter((r: any) => r.isValid && r.action !== 'UPDATE').length;
    const toUpdateCount = raw.summary?.toUpdateRows ?? records.filter((r: any) => r.isValid && r.action === 'UPDATE').length;

    return {
      summary: {
        totalRows: raw.summary?.totalRows ?? records.length,
        validRows: raw.summary?.validRows ?? records.filter((r: any) => r.isValid).length,
        errorRows: raw.summary?.errorRows ?? records.filter((r: any) => !r.isValid).length,
        validCount: raw.summary?.validRows ?? records.filter((r: any) => r.isValid).length,
        errorCount: raw.summary?.errorRows ?? records.filter((r: any) => !r.isValid).length,
        toCreateRows: toCreateCount,
        toUpdateRows: toUpdateCount,
      },
      newDepartments: newDepts,
      existingDepartments: existingDepts,
      departments: {
        existing: existingDepts,
        toCreate: newDepts,
      },
      managers: {
        resolved: raw.managers?.resolved || allManagers.filter((m) => m.matchedEmployeeId),
        unresolved: raw.managers?.unresolved || allManagers.filter((m) => !m.matchedEmployeeId),
      },
      employees: records,
      records: records,
      suggestedDomain: raw.suggestedDomain,
    };
  },

  confirmImport: async (payload: ImportConfirmPayload): Promise<ImportConfirmResponse> => {
    const list = payload.employees && payload.employees.length > 0 ? payload.employees : (payload.records || []);
    const formattedPayload = {
      companyId: payload.companyId,
      emailDomain: payload.emailDomain,
      updateExisting: Boolean(payload.updateExisting),
      managerResolutions: payload.managerResolutions || {},
      employees: list.map((e: any) => ({
        code: e.code || null,
        name: e.name,
        cpf: e.cpf,
        email: e.email,
        registrationNumber: e.registrationNumber,
        phone: e.phone || null,
        birthDate: e.birthDate || null,
        admissionDate: e.admissionDate,
        salary: typeof e.salary === 'number' ? e.salary : (e.salary ? Number(e.salary) : null),
        departmentName: e.departmentName,
        rawManagerName: e.rawManagerName || e.managerRawName || null,
        address: e.address || null,
        contractType: 'CLT' as const,
      })),
    };

    const { data } = await api.post<ApiResponse<any>>(
      '/employees/import/confirm',
      formattedPayload
    );

    const res = data.data || {};
    return {
      totalCreated: res.totalCreated ?? 0,
      totalUpdated: res.totalUpdated ?? 0,
      importedCount: (res.totalCreated ?? 0) + (res.totalUpdated ?? 0),
      managersLinked: res.managersLinked ?? 0,
      departmentsCreated: res.departmentsCreated ?? 0,
      employees: res.employees || [],
      errors: res.errors || [],
    };
  },
};
