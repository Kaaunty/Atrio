import ExcelJS from 'exceljs';
import { prisma } from '../../../database/prisma.js';
import { cleanCPF, isValidCPF } from '../../../shared/utils/cpf.js';
import { EmployeeService } from './employee.service.js';
import { VacationService } from '../../vacations/services/vacation.service.js';
import {
  ConfirmImportInput,
  ImportConfirmResult,
  ImportedRowPreview,
  ImportPreviewResult,
  ManagerMatchInfo,
} from '../employee-import.dto.js';

export class EmployeeImportService {
  /**
   * Remove acentos e normaliza string para comparações
   */
  static normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  /**
   * Limpa o nome do gestor removendo anotações entre parênteses como "(DIRETOR DA EMPRESA)"
   */
  static cleanManagerName(raw: string): string {
    return raw.replace(/\s*\([^)]*\)/g, '').trim();
  }

  /**
   * Converte valor de célula de data (Excel date ou DD/MM/YYYY) para objeto Date
   */
  static parseExcelDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return val;
    }
    const str = String(val).trim();
    // Padrão DD/MM/YYYY
    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    // Padrão YYYY-MM-DD
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  /**
   * Converte valor de salário para número
   */
  static parseSalary(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    let s = String(val).trim().replace('R$', '').trim();
    if (s.includes(',') && s.includes('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
      s = s.replace(',', '.');
    }
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
  }

  /**
   * Converte valor de texto de célula
   */
  static cellString(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object' && val.text) return String(val.text).trim();
    return String(val).trim();
  }

  /**
   * Gera slug para e-mail corporativo: primeiro.ultimo@dominio
   */
  static generateEmailBase(fullName: string): string {
    const normalized = fullName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'colaborador';
    if (parts.length === 1) return parts[0];
    return `${parts[0]}.${parts[parts.length - 1]}`;
  }

  /**
   * Resolve o domínio de e-mail corporativo da empresa ou fallback
   */
  static async resolveEmailDomain(companyId: string, customDomain?: string): Promise<string> {
    if (customDomain && customDomain.trim()) {
      let d = customDomain.trim().toLowerCase();
      if (!d.startsWith('@')) d = `@${d}`;
      return d;
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { tradeName: true, legalName: true },
    });

    if (!company) {
      return '@empresa.com.br';
    }

    const name = company.tradeName || company.legalName;
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    return `@${slug || 'empresa'}.com.br`;
  }

  /**
   * Preview (Dry-Run) da importação da planilha Excel
   */
  static async preview(
    fileBuffer: Buffer,
    companyId: string,
    customEmailDomain?: string,
    updateExisting: boolean = false
  ): Promise<ImportPreviewResult> {
    // 1. Valida existência da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        departments: { where: { deletedAt: null } },
      },
    });

    if (!company) {
      const err: any = new Error('Empresa informada não foi encontrada');
      err.statusCode = 404;
      throw err;
    }

    const emailDomain = await this.resolveEmailDomain(companyId, customEmailDomain);

    // 2. Carrega planilha via ExcelJS
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount < 2) {
      const err: any = new Error('A planilha está vazia ou não contém dados de colaboradores');
      err.statusCode = 400;
      throw err;
    }

    // 3. Pré-busca dados do banco para validação de unicidade e vínculos
    const existingEmployees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        cpf: true,
        registrationNumber: true,
        email: true,
        companyId: true,
      },
    });

    // Armazena CPFs do banco limpos (apenas dígitos) e mapeamento por CPF limpo
    const dbCpfCleanSet = new Set(existingEmployees.map((e) => cleanCPF(e.cpf)));
    const dbEmployeeByCleanCpf = new Map<string, (typeof existingEmployees)[0]>();
    for (const emp of existingEmployees) {
      dbEmployeeByCleanCpf.set(cleanCPF(emp.cpf), emp);
    }
    const dbEmailSet = new Set(existingEmployees.map((e) => e.email.toLowerCase()));
    const dbCompanyRegSet = new Set(
      existingEmployees
        .filter((e) => e.companyId === companyId)
        .map((e) => e.registrationNumber)
    );

    // Mapa de colaboradores no banco indexados por nome normalizado (para verificação de duplicidade por nome)
    const dbEmployeesByName = new Map<string, { id: string; name: string; cpf: string; companyId: string }>();
    for (const emp of existingEmployees) {
      dbEmployeesByName.set(this.normalizeText(emp.name), {
        id: emp.id,
        name: emp.name,
        cpf: emp.cpf,
        companyId: emp.companyId,
      });
    }

    // Departamentos existentes no banco para esta empresa
    const existingDeptMap = new Map<string, string>();
    for (const dept of company.departments) {
      existingDeptMap.set(this.normalizeText(dept.name), dept.name);
    }

    // 4. Mapeamento dos colaboradores na planilha
    const rowsPreview: ImportedRowPreview[] = [];
    const sheetCpfs = new Set<string>();
    const sheetRegs = new Set<string>();
    const sheetNames = new Set<string>();
    const sheetEmailsCount = new Map<string, number>();
    const departmentsFound = new Set<string>();
    const rawManagersSet = new Set<string>();
    const sheetEmployeesByName = new Map<string, { name: string; rowIndex: number }>();

    // Primeira passada rápida: coletar nomes dos colaboradores da planilha para correspondência de gestores
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const name = this.cellString(row.getCell(2).value);
      if (name) {
        sheetEmployeesByName.set(this.normalizeText(name), { name, rowIndex: r });
      }
    }

    // Segunda passada: leitura linha a linha e validações
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const code = this.cellString(row.getCell(1).value) || null;
      const name = this.cellString(row.getCell(2).value);
      const birthRaw = row.getCell(3).value;
      const cpfRaw = this.cellString(row.getCell(4).value);
      const admRaw = row.getCell(5).value;
      const reg = this.cellString(row.getCell(6).value);
      // Coluna G: FUNÇÃO -> ignorada intencionalmente (positionId = null)
      const deptRaw = this.cellString(row.getCell(8).value);
      const rawMgr = this.cellString(row.getCell(9).value) || null;
      const salaryRaw = row.getCell(10).value;
      const cep = this.cellString(row.getCell(11).value);
      const rua = this.cellString(row.getCell(12).value);
      const num = this.cellString(row.getCell(13).value);
      const bairro = this.cellString(row.getCell(14).value);
      const cidade = this.cellString(row.getCell(15).value);
      const celular = this.cellString(row.getCell(16).value) || null;

      // Se a linha inteira estiver em branco, pula
      if (!name && !cpfRaw && !reg) {
        continue;
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      let action: 'CREATE' | 'UPDATE' = 'CREATE';

      // Validação de Nome e duplicidade por nome
      if (!name || name.length < 2) {
        errors.push('Nome do colaborador é obrigatório e deve ter no mínimo 2 caracteres');
      } else {
        const normName = this.normalizeText(name);
        const existingByName = dbEmployeesByName.get(normName);
        if (existingByName && existingByName.companyId === companyId) {
          if (!updateExisting) {
            errors.push(`Colaborador com o nome "${name}" já está cadastrado nesta empresa`);
          }
        }
        if (sheetNames.has(normName)) {
          errors.push(`Nome "${name}" duplicado na própria planilha`);
        }
        sheetNames.add(normName);
      }

      // Validação e limpeza de CPF (compara apenas dígitos limpos)
      const cleanedCpf = cleanCPF(cpfRaw);
      let existingEmpByCpf: (typeof existingEmployees)[0] | undefined;
      if (!cleanedCpf || !isValidCPF(cleanedCpf)) {
        errors.push(`CPF "${cpfRaw}" é inválido`);
      } else {
        if (dbCpfCleanSet.has(cleanedCpf)) {
          existingEmpByCpf = dbEmployeeByCleanCpf.get(cleanedCpf);
          if (updateExisting) {
            action = 'UPDATE';
            warnings.push('Colaborador já existente no sistema (dados serão atualizados com os da planilha)');
          } else {
            errors.push(`CPF "${cleanedCpf}" já está cadastrado no sistema`);
          }
        }
        if (sheetCpfs.has(cleanedCpf)) {
          errors.push(`CPF "${cleanedCpf}" duplicado na própria planilha`);
        }
        sheetCpfs.add(cleanedCpf);
      }

      // Validação de Matrícula
      if (!reg) {
        errors.push('Matrícula eSocial é obrigatória');
      } else {
        if (dbCompanyRegSet.has(reg)) {
          // Se for updateExisting e a matrícula pertencer ao mesmo colaborador encontrado pelo CPF, não é colisão
          if (updateExisting && existingEmpByCpf && existingEmpByCpf.registrationNumber === reg && existingEmpByCpf.companyId === companyId) {
            // Matrícula pertence ao mesmo colaborador, ok!
          } else if (updateExisting && existingEmpByCpf) {
            // Em modo sobrescrever/upsert, o colaborador já existe e a planilha traz a matrícula oficial eSocial atualizada.
            // Emitimos aviso informativo em vez de bloquear a importação.
            warnings.push(`Matrícula anterior (${existingEmpByCpf.registrationNumber}) será atualizada para "${reg}"`);
          } else {
            errors.push(`Matrícula "${reg}" já está cadastrada nesta empresa`);
          }
        }
        if (sheetRegs.has(reg)) {
          errors.push(`Matrícula "${reg}" duplicada na própria planilha`);
        }
        sheetRegs.add(reg);
      }

      // Validação de Datas
      const birthDate = this.parseExcelDate(birthRaw);
      const admissionDate = this.parseExcelDate(admRaw);

      if (!admissionDate) {
        errors.push('Data de admissão é obrigatória e deve ser uma data válida');
      }

      // Departamento
      const normalizedDept = deptRaw ? this.normalizeText(deptRaw) : '';
      if (!normalizedDept) {
        errors.push('Setor (departamento) é obrigatório');
      } else {
        departmentsFound.add(deptRaw.trim().toUpperCase());
      }

      // Salário
      const salary = this.parseSalary(salaryRaw);

      // Endereço
      const cleanedCep = cep.replace(/\D/g, '');
      const address = rua || cidade || cleanedCep ? {
        street: rua || undefined,
        number: num || undefined,
        neighborhood: bairro || undefined,
        city: cidade || undefined,
        state: 'SP',
        zipCode: cleanedCep || undefined,
      } : null;

      // Geração de E-mail Corporativo único
      let emailCandidate = '';
      if (
        updateExisting &&
        existingEmpByCpf &&
        existingEmpByCpf.email &&
        !existingEmpByCpf.email.endsWith('@atrio.rh') &&
        !existingEmpByCpf.email.endsWith('@rhid.atrio')
      ) {
        // Mantém o e-mail real existente se não for sintético/temporário
        emailCandidate = existingEmpByCpf.email;
      } else {
        // Gera o e-mail corporativo oficial da empresa (ex: adrian.conceicao@rainhadassete.com.br)
        const emailBase = this.generateEmailBase(name || 'colaborador');
        let emailIndex = (sheetEmailsCount.get(emailBase) || 0) + 1;
        emailCandidate = emailIndex === 1
          ? `${emailBase}${emailDomain}`
          : `${emailBase}${emailIndex}${emailDomain}`;

        // Garante unicidade com o que já existe no banco (exceto o próprio colaborador que está sendo atualizado)
        while (
          dbEmailSet.has(emailCandidate.toLowerCase()) &&
          (!existingEmpByCpf || existingEmpByCpf.email.toLowerCase() !== emailCandidate.toLowerCase())
        ) {
          emailIndex++;
          emailCandidate = `${emailBase}${emailIndex}${emailDomain}`;
        }
        sheetEmailsCount.set(emailBase, emailIndex);
      }

      // Gestor
      let matchedManagerId: string | null = null;
      let matchedManagerName: string | null = null;

      if (rawMgr) {
        rawManagersSet.add(rawMgr);
        const cleanedMgr = this.cleanManagerName(rawMgr);
        const normalizedMgr = this.normalizeText(cleanedMgr);

        // 1. Procura no banco
        if (dbEmployeesByName.has(normalizedMgr)) {
          const match = dbEmployeesByName.get(normalizedMgr)!;
          matchedManagerId = match.id;
          matchedManagerName = match.name;
        }
        // 2. Procura na planilha (será resolvido na 2ª passada de confirmação)
        else if (sheetEmployeesByName.has(normalizedMgr)) {
          const match = sheetEmployeesByName.get(normalizedMgr)!;
          matchedManagerName = match.name;
        } else {
          warnings.push(`Gestor "${rawMgr}" não foi identificado automaticamente no banco nem na planilha`);
        }
      }

      rowsPreview.push({
        rowIndex: r,
        action,
        code,
        name,
        birthDate: birthDate ? birthDate.toISOString().split('T')[0] : null,
        cpf: cleanedCpf,
        admissionDate: admissionDate ? admissionDate.toISOString().split('T')[0] : '',
        registrationNumber: reg,
        departmentName: deptRaw.trim().toUpperCase(),
        rawManagerName: rawMgr,
        matchedManagerId,
        matchedManagerName,
        salary,
        address,
        phone: celular,
        email: emailCandidate,
        errors,
        warnings,
      });
    }

    // 5. Categorização de Departamentos
    const newDepartments: string[] = [];
    const existingDeptsList: string[] = [];

    for (const dept of departmentsFound) {
      const norm = this.normalizeText(dept);
      if (existingDeptMap.has(norm)) {
        existingDeptsList.push(dept);
      } else {
        newDepartments.push(dept);
      }
    }

    // 6. Resolução de Gestores encontrados
    const resolvedManagers: ManagerMatchInfo[] = [];
    const unresolvedManagers: ManagerMatchInfo[] = [];

    for (const rawMgr of rawManagersSet) {
      const cleanedMgr = this.cleanManagerName(rawMgr);
      const norm = this.normalizeText(cleanedMgr);

      if (dbEmployeesByName.has(norm)) {
        const match = dbEmployeesByName.get(norm)!;
        resolvedManagers.push({
          rawName: rawMgr,
          cleanedName: cleanedMgr,
          status: 'MATCHED_DB',
          matchedEmployeeId: match.id,
          matchedEmployeeName: match.name,
        });
      } else if (sheetEmployeesByName.has(norm)) {
        const match = sheetEmployeesByName.get(norm)!;
        resolvedManagers.push({
          rawName: rawMgr,
          cleanedName: cleanedMgr,
          status: 'MATCHED_SHEET',
          matchedEmployeeId: null, // Será criado durante o import
          matchedEmployeeName: match.name,
        });
      } else {
        unresolvedManagers.push({
          rawName: rawMgr,
          cleanedName: cleanedMgr,
          status: 'UNRESOLVED',
          matchedEmployeeId: null,
          matchedEmployeeName: null,
        });
      }
    }

    const totalRows = rowsPreview.length;
    const errorRows = rowsPreview.filter((r) => r.errors.length > 0).length;
    const validRows = totalRows - errorRows;
    const toUpdateRows = rowsPreview.filter((r) => r.action === 'UPDATE' && r.errors.length === 0).length;
    const toCreateRows = rowsPreview.filter((r) => r.action === 'CREATE' && r.errors.length === 0).length;

    return {
      summary: {
        totalRows,
        validRows,
        errorRows,
        toCreateRows,
        toUpdateRows,
      },
      newDepartments: Array.from(newDepartments).sort(),
      existingDepartments: Array.from(existingDeptsList).sort(),
      managers: {
        resolved: resolvedManagers,
        unresolved: unresolvedManagers,
      },
      employees: rowsPreview,
    };
  }

  /**
   * Confirmação da importação em 2 etapas:
   * 1. Cria departamentos faltantes e cria/atualiza colaboradores
   * 2. Atualiza os gestores vinculados aos colaboradores conforme resolução
   */
  static async confirm(input: ConfirmImportInput): Promise<ImportConfirmResult> {
    const { companyId, employees, managerResolutions = {}, updateExisting = false } = input;

    // 1. Verifica existência da empresa
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        departments: { where: { deletedAt: null } },
      },
    });

    if (!company) {
      const err: any = new Error('Empresa informada não foi encontrada');
      err.statusCode = 404;
      throw err;
    }

    // 2. Garante todos os Departamentos necessários
    const departmentMap = new Map<string, string>(); // normalizedName -> departmentId
    for (const d of company.departments) {
      departmentMap.set(this.normalizeText(d.name), d.id);
    }

    let departmentsCreated = 0;
    const uniqueDeptNames = new Set(employees.map((e) => e.departmentName.trim().toUpperCase()));

    for (const deptName of uniqueDeptNames) {
      const norm = this.normalizeText(deptName);
      if (!departmentMap.has(norm)) {
        const created = await prisma.department.create({
          data: {
            companyId,
            name: deptName,
          },
        });
        departmentMap.set(norm, created.id);
        departmentsCreated++;
      }
    }

    // 3. Primeira Passada: Criação ou Atualização dos colaboradores
    const processedEmployees: Array<{
      id: string;
      name: string;
      registrationNumber: string;
      email: string;
      department: string;
      rawManagerName: string | null;
    }> = [];

    const sheetProcessedByName = new Map<string, string>(); // normalizedName -> employeeId

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const empData of employees) {
      const deptId = departmentMap.get(this.normalizeText(empData.departmentName)) || null;
      const cleanedCpf = cleanCPF(empData.cpf);

      // Checa se o colaborador já existe pelo CPF (procura tanto puro quanto formatado XXX.XXX.XXX-XX)
      const formattedCpf = empData.cpf.length === 11
        ? empData.cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
        : empData.cpf;

      const existing = await prisma.employee.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { cpf: cleanedCpf },
            { cpf: formattedCpf },
          ],
        },
      });

      if (existing && updateExisting) {
        // Se a matrícula da planilha estiver ocupada por OUTRO colaborador (ex: dados antigos do RHiD),
        // libera a matrícula desse outro colaborador alterando para um código transitório (evitando erro de unique)
        const collidingOther = await prisma.employee.findFirst({
          where: {
            companyId,
            registrationNumber: empData.registrationNumber,
            id: { not: existing.id },
            deletedAt: null,
          },
        });

        if (collidingOther) {
          await prisma.employee.update({
            where: { id: collidingOther.id },
            data: { registrationNumber: `OLD-${collidingOther.registrationNumber}-${Date.now().toString().slice(-4)}` },
          });
        }

        // Atualiza colaborador existente
        const updated = await prisma.employee.update({
          where: { id: existing.id },
          data: {
            name: empData.name,
            cpf: empData.cpf, // Salva o CPF limpo padronizado
            code: empData.code || null,
            registrationNumber: empData.registrationNumber,
            phone: empData.phone || null,
            birthDate: empData.birthDate ? new Date(empData.birthDate) : null,
            admissionDate: new Date(empData.admissionDate),
            salary: empData.salary !== undefined && empData.salary !== null ? empData.salary : null,
            departmentId: deptId,
            email: empData.email,
            address: (empData.address as any) || null,
            status: 'ATIVO',
          },
        });

        processedEmployees.push({
          id: updated.id,
          name: updated.name,
          registrationNumber: updated.registrationNumber,
          email: updated.email,
          department: empData.departmentName,
          rawManagerName: empData.rawManagerName || null,
        });

        sheetProcessedByName.set(this.normalizeText(updated.name), updated.id);
        totalUpdated++;
      } else {
        // Cria novo colaborador via EmployeeService.create
        const created = await EmployeeService.create({
          companyId,
          name: empData.name,
          cpf: empData.cpf,
          email: empData.email,
          registrationNumber: empData.registrationNumber,
          code: empData.code || null,
          phone: empData.phone || null,
          birthDate: empData.birthDate ? new Date(empData.birthDate) : undefined,
          admissionDate: new Date(empData.admissionDate),
          salary: empData.salary ?? null,
          departmentId: deptId,
          positionId: null, // Conforme alinhado: sem cargo cadastrado
          managerId: null, // Será associado na segunda passada
          contractType: 'CLT',
          address: empData.address || undefined,
          status: 'ATIVO',
        });

        processedEmployees.push({
          id: created.id,
          name: created.name,
          registrationNumber: created.registrationNumber,
          email: created.email,
          department: empData.departmentName,
          rawManagerName: empData.rawManagerName || null,
        });

        sheetProcessedByName.set(this.normalizeText(created.name), created.id);
        totalCreated++;
      }
    }

    // 4. Segunda Passada: Resolução e vinculação dos Gestores
    // Pré-busca gestores já existentes no banco para bater pelo nome limpo
    const dbExisting = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    });
    const allEmployeesByName = new Map<string, string>();
    for (const e of dbExisting) {
      allEmployeesByName.set(this.normalizeText(e.name), e.id);
    }
    // Adiciona os recém-processados
    for (const [k, v] of sheetProcessedByName.entries()) {
      allEmployeesByName.set(k, v);
    }

    let managersLinked = 0;
    const finalEmployeesResult: Array<{
      id: string;
      name: string;
      registrationNumber: string;
      email: string;
      department: string;
      managerId: string | null;
    }> = [];

    for (const emp of processedEmployees) {
      let resolvedManagerId: string | null = null;

      if (emp.rawManagerName) {
        // A) Verifica se foi fornecido de-para explícito no payload managerResolutions
        if (managerResolutions[emp.rawManagerName] !== undefined) {
          resolvedManagerId = managerResolutions[emp.rawManagerName] || null;
        } else {
          // B) Tenta correspondência automática pelo nome limpo
          const cleaned = this.cleanManagerName(emp.rawManagerName);
          const norm = this.normalizeText(cleaned);
          resolvedManagerId = allEmployeesByName.get(norm) || null;
        }
      }

      // Evita auto-referência (colaborador ser gestor de si mesmo)
      if (resolvedManagerId && resolvedManagerId === emp.id) {
        resolvedManagerId = null;
      }

      if (resolvedManagerId) {
        await prisma.employee.update({
          where: { id: emp.id },
          data: { managerId: resolvedManagerId },
        });
        managersLinked++;
      }

      finalEmployeesResult.push({
        id: emp.id,
        name: emp.name,
        registrationNumber: emp.registrationNumber,
        email: emp.email,
        department: emp.department,
        managerId: resolvedManagerId,
      });

      // Garante a geração e atualização dos períodos aquisitivos de férias do colaborador
      await VacationService.ensurePeriodsForEmployee(emp.id);
    }

    return {
      success: true,
      totalCreated,
      totalUpdated,
      managersLinked,
      departmentsCreated,
      employees: finalEmployeesResult,
    };
  }
}
