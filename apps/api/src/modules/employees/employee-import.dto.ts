import { z } from 'zod';
import { addressSchema } from './employee.dto.js';

export const previewImportQuerySchema = z.object({
  companyId: z.string().uuid('ID da empresa inválido'),
  emailDomain: z.string().optional(),
  updateExisting: z.coerce.boolean().default(false),
});

export const employeeImportItemSchema = z.object({
  code: z.string().nullable().optional(),
  name: z.string().min(2, 'Nome inválido'),
  cpf: z.string().min(11, 'CPF inválido'),
  email: z.string().email('E-mail corporativo inválido'),
  registrationNumber: z.string().min(1, 'Matrícula obrigatória'),
  phone: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  admissionDate: z.string(),
  salary: z.number().nullable().optional(),
  departmentName: z.string().min(1, 'Setor é obrigatório'),
  rawManagerName: z.string().nullable().optional(),
  address: addressSchema.nullable().optional(),
  contractType: z.literal('CLT').default('CLT'),
});

export type EmployeeImportItem = z.infer<typeof employeeImportItemSchema>;

export const confirmImportBodySchema = z.object({
  companyId: z.string().uuid('ID da empresa inválido'),
  emailDomain: z.string().optional(),
  updateExisting: z.boolean().default(false),
  managerResolutions: z.record(z.string().nullable().optional()).optional().default({}),
  employees: z.array(employeeImportItemSchema).min(1, 'A lista de colaboradores não pode ser vazia'),
});

export type ConfirmImportInput = {
  companyId: string;
  emailDomain?: string;
  updateExisting?: boolean;
  managerResolutions?: Record<string, string | null | undefined>;
  employees: EmployeeImportItem[];
};

export interface ImportedRowPreview {
  rowIndex: number;
  action: 'CREATE' | 'UPDATE';
  code: string | null;
  name: string;
  birthDate: string | null;
  cpf: string;
  admissionDate: string;
  registrationNumber: string;
  departmentName: string;
  rawManagerName: string | null;
  matchedManagerId: string | null;
  matchedManagerName: string | null;
  salary: number | null;
  address: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state: string;
    zipCode?: string;
  } | null;
  phone: string | null;
  email: string;
  errors: string[];
  warnings: string[];
}

export interface ManagerMatchInfo {
  rawName: string;
  cleanedName: string;
  status: 'MATCHED_DB' | 'MATCHED_SHEET' | 'UNRESOLVED';
  matchedEmployeeId: string | null;
  matchedEmployeeName: string | null;
}

export interface ImportPreviewResult {
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    toCreateRows: number;
    toUpdateRows: number;
  };
  newDepartments: string[];
  existingDepartments: string[];
  managers: {
    resolved: ManagerMatchInfo[];
    unresolved: ManagerMatchInfo[];
  };
  employees: ImportedRowPreview[];
}

export interface ImportConfirmResult {
  success: boolean;
  totalCreated: number;
  totalUpdated: number;
  managersLinked: number;
  departmentsCreated: number;
  employees: Array<{
    id: string;
    name: string;
    registrationNumber: string;
    email: string;
    department: string;
    managerId: string | null;
  }>;
}
