import { z } from 'zod';

export const ExportFormatEnum = z.enum(['XLSX', 'CSV', 'PDF']);

export const BaseReportFilterSchema = z.object({
  format: ExportFormatEnum.default('XLSX'),
  companyId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional(), // YYYY-MM-DD
});

export const MonthlyMirrorPdfSchema = z.object({
  employeeId: z.string().uuid(),
  yearMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Formato deve ser YYYY-MM'),
});

export type BaseReportFilterDto = z.infer<typeof BaseReportFilterSchema>;
export type MonthlyMirrorPdfDto = z.infer<typeof MonthlyMirrorPdfSchema>;
