import ExcelJS from 'exceljs';
import { prisma } from '../../../database/prisma.js';
import { VacationService } from './vacation.service.js';

export interface VacationImportResult {
  success: boolean;
  totalRowsProcessed: number;
  employeesCreated: number;
  employeesUpdated: number;
  departmentsCreated: number;
  managersLinked: number;
  periodsCreated: number;
  periodsUpdated: number;
  requestsCreated: number;
  warnings: string[];
}

export class VacationImportService {
  /**
   * Mapa de aliases para reconciliar pequenas divergências de grafia entre a planilha de férias
   * e o cadastro de colaboradores / lideranças.
   */
  private static readonly NAME_ALIASES: Record<string, string> = {
    'CRISTIANE VIANA NOVAIS': 'CRISTIANE VIANA NOVAIS LIBARINO',
    'MARCELO MANEGHETTE MACHADO': 'MARCELO MENEGHETTE MACHADO',
    'RENATA DE FATIMA ALMEIDA': 'RENATA DE FATIMA ALMEIDA DE ARRUDA',
    'DEOLINDA MENDOZA BAPTISTELLA': 'DEOLINDA MENDOZA BAPTSTELLA',
    'CINTIA LIMA DS SANTOS': 'CINTIA LIMA DOS SANTOS',
    'CINTIA SUELEN ROMAO DE SIQUEIRA': 'CINTIA SUELEN ROMAO SIQUEIRA',
    'PATRICIA DE SOUSA PEREIRA': 'PATRICIA DE SOUZA PEREIRA',
    'FERNANDA JENNIFER GONZAGA DA S S COSTA': 'FERNANDA JENIFFER GONZAFA DA S COSTA',
    'LUIZ FELIPE': 'LUIZ FELIPE GOMES DE OLIVEIRA',
    'LUIZ FELIPE OLIVEIRA': 'LUIZ FELIPE GOMES DE OLIVEIRA',
  };

  /**
   * Normaliza string removendo acentos, espaços múltiplos e anotações entre parênteses
   */
  static normalizeName(raw: string, stripParentheses: boolean = false): string {
    let text = raw || '';
    if (stripParentheses) {
      text = text.replace(/\s*\([^)]*\)/g, '');
    }
    const clean = text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

    return this.NAME_ALIASES[clean] || clean;
  }

  /**
   * Extrai string limpa de uma célula do ExcelJS
   */
  static cellString(val: any): string {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (val.result !== undefined && val.result !== null) return String(val.result).trim();
      if (val.text !== undefined) return String(val.text).trim();
    }
    return String(val).trim();
  }

  /**
   * Extrai número (incluindo decimais como 27.5) de uma célula do ExcelJS
   */
  static cellNumber(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (typeof val === 'object' && val.result !== undefined) {
      const n = Number(val.result);
      return isNaN(n) ? 0 : n;
    }
    const s = String(val).replace(',', '.').trim();
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Converte célula de data do Excel (Date, DD/MM/YYYY ou YYYY-MM-DD) para Date UTC meia-noite
   */
  static parseExcelDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null;
      return new Date(Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()));
    }
    if (typeof val === 'object' && val.result instanceof Date) {
      const d = val.result;
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    const str = this.cellString(val);
    if (!str) return null;

    const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      const year = parseInt(brMatch[3], 10);
      return new Date(Date.UTC(year, month, day));
    }

    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      return new Date(Date.UTC(year, month, day));
    }

    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return null;
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  }

  /**
   * Gera um CPF sintético único de 11 dígitos quando o colaborador/gestor ainda não possui CPF cadastrado
   */
  private static generateSyntheticCpf(seedIndex: number, usedCpfs: Set<string>): string {
    let idx = seedIndex;
    while (true) {
      const candidate = `999888${String(idx).padStart(5, '0')}`;
      if (!usedCpfs.has(candidate)) {
        usedCpfs.add(candidate);
        return candidate;
      }
      idx++;
    }
  }

  /**
   * Gera um e-mail corporativo único para colaboradores criados durante a importação
   */
  private static generateUniqueEmail(
    name: string,
    domain: string,
    usedEmails: Set<string>
  ): string {
    const clean = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const base =
      parts.length === 0
        ? 'colaborador'
        : parts.length === 1
        ? parts[0]
        : `${parts[0]}.${parts[parts.length - 1]}`;

    let counter = 1;
    let candidate = `${base}${domain}`;
    while (usedEmails.has(candidate.toLowerCase())) {
      counter++;
      candidate = `${base}${counter}${domain}`;
    }
    usedEmails.add(candidate.toLowerCase());
    return candidate;
  }

  /**
   * Importa a planilha Excel de Controle de Férias (.xlsx), reconciliando setores, líderes,
   * colaboradores e lançando todos os períodos aquisitivos, concessivos e saldos.
   */
  static async importFromExcel(
    fileBuffer: Buffer,
    companyId: string,
    actorUserId?: string
  ): Promise<VacationImportResult> {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        departments: { where: { deletedAt: null } },
      },
    });

    if (!company) {
      const error: any = new Error('Empresa não encontrada para importação de férias');
      error.statusCode = 404;
      throw error;
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    const worksheet = workbook.worksheets[0];

    if (!worksheet || worksheet.rowCount < 2) {
      const error: any = new Error('A planilha de férias está vazia ou sem linhas de dados');
      error.statusCode = 400;
      throw error;
    }

    // 1. Lê todas as linhas válidas da planilha
    interface ParsedVacationRow {
      rowIndex: number;
      contractCode: string;
      rawEmployeeName: string;
      rawDepartment: string;
      rawManagerName: string;
      vestingStart: Date;
      vestingEnd: Date;
      daysTaken: number;
      sellDays: number;
      balanceSheet: number;
      concessiveStart: Date | null;
      deadlineDate: Date;
      scheduledStart: Date | null;
      scheduledEnd: Date | null;
      returnDate: Date | null;
      situation: string;
      checkStatus: string;
    }

    const parsedRows: ParsedVacationRow[] = [];
    const warnings: string[] = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const contractCode = this.cellString(row.getCell(1).value);
      const rawEmployeeName = this.cellString(row.getCell(2).value);
      const rawDepartment = this.cellString(row.getCell(3).value);
      const rawManagerName = this.cellString(row.getCell(4).value);
      const vestingStart = this.parseExcelDate(row.getCell(5).value);
      const vestingEnd = this.parseExcelDate(row.getCell(6).value);
      const daysTaken = Math.round(this.cellNumber(row.getCell(7).value));
      const sellDays = Math.round(this.cellNumber(row.getCell(8).value));
      const balanceSheet = this.cellNumber(row.getCell(9).value);
      const concessiveStart = this.parseExcelDate(row.getCell(10).value);
      const deadlineDate = this.parseExcelDate(row.getCell(11).value);
      const scheduledStart = this.parseExcelDate(row.getCell(12).value);
      const scheduledEnd = this.parseExcelDate(row.getCell(13).value);
      const returnDate = this.parseExcelDate(row.getCell(14).value);
      const situation = this.cellString(row.getCell(15).value);
      const checkStatus = this.cellString(row.getCell(16).value);

      if (!rawEmployeeName && !vestingStart) continue;

      if (!rawEmployeeName || !vestingStart || !vestingEnd) {
        warnings.push(`Linha ${r}: ignorada por falta de nome ou período aquisitivo.`);
        continue;
      }

      const effectiveDeadline =
        deadlineDate ||
        new Date(
          Date.UTC(
            vestingEnd.getUTCFullYear() + 1,
            vestingEnd.getUTCMonth(),
            vestingEnd.getUTCDate() - 29
          )
        );

      parsedRows.push({
        rowIndex: r,
        contractCode,
        rawEmployeeName,
        rawDepartment,
        rawManagerName,
        vestingStart,
        vestingEnd,
        daysTaken,
        sellDays,
        balanceSheet,
        concessiveStart,
        deadlineDate: effectiveDeadline,
        scheduledStart,
        scheduledEnd,
        returnDate,
        situation,
        checkStatus,
      });
    }

    // 2. Garante a criação dos setores (departamentos) presentes na planilha
    const departmentByNorm = new Map<string, string>();
    for (const dept of company.departments) {
      departmentByNorm.set(this.normalizeName(dept.name), dept.id);
    }

    let departmentsCreated = 0;
    const uniqueDepts = new Set(
      parsedRows
        .map((r) => r.rawDepartment.trim().toUpperCase())
        .filter((d) => d && d !== 'NÃO IDENTIFICADO' && d !== 'NAO IDENTIFICADO')
    );

    for (const deptName of uniqueDepts) {
      const normDept = this.normalizeName(deptName);
      if (!departmentByNorm.has(normDept)) {
        const created = await prisma.department.create({
          data: {
            companyId,
            name: deptName,
          },
        });
        departmentByNorm.set(normDept, created.id);
        departmentsCreated++;
      }
    }

    // 3. Carrega todos os colaboradores do banco para reconciliação
    const allDbEmployees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        code: true,
        registrationNumber: true,
        admissionDate: true,
        departmentId: true,
        managerId: true,
        companyId: true,
      },
    });

    const usedCpfs = new Set(allDbEmployees.map((e) => e.cpf.replace(/\D/g, '')));
    const usedEmails = new Set(allDbEmployees.map((e) => e.email.toLowerCase()));
    const usedCompanyRegs = new Set(
      allDbEmployees
        .filter((e) => e.companyId === companyId)
        .map((e) => String(e.registrationNumber).trim())
    );

    const empByNormName = new Map<string, (typeof allDbEmployees)[0]>();
    for (const emp of allDbEmployees) {
      if (emp.companyId === companyId) {
        empByNormName.set(this.normalizeName(emp.name), emp);
      }
    }

    // 4. Garante que todos os Líderes/Gestores mencionados na planilha existam como Employee
    let employeesCreated = 0;
    let syntheticSeed = 1001;

    const uniqueRawManagers = new Set(
      parsedRows
        .map((r) => r.rawManagerName.trim())
        .filter((m) => m && this.normalizeName(m, true) !== 'NAO IDENTIFICADO')
    );

    for (const rawMgr of uniqueRawManagers) {
      const normMgr = this.normalizeName(rawMgr, true);
      if (!empByNormName.has(normMgr)) {
        // Verifica se este gestor não é um colaborador que está nas linhas da planilha (será criado no passo 5 com seus dados completos)
        const isAlsoInSheetRows = parsedRows.some(
          (r) => this.normalizeName(r.rawEmployeeName) === normMgr
        );
        if (isAlsoInSheetRows) continue;

        const cleanDisplayName = rawMgr.replace(/\s*\([^)]*\)/g, '').trim().toUpperCase();
        const cpf = this.generateSyntheticCpf(syntheticSeed++, usedCpfs);
        const email = this.generateUniqueEmail(cleanDisplayName, '@rainhadassete.com.br', usedEmails);
        let reg = `LID-${syntheticSeed}`;
        while (usedCompanyRegs.has(reg)) {
          syntheticSeed++;
          reg = `LID-${syntheticSeed}`;
        }
        usedCompanyRegs.add(reg);

        const createdMgr = await prisma.employee.create({
          data: {
            companyId,
            name: cleanDisplayName,
            cpf,
            email,
            registrationNumber: reg,
            admissionDate: new Date(Date.UTC(2020, 0, 1)),
            contractType: 'PJ',
            status: 'ATIVO',
          },
        });

        empByNormName.set(normMgr, createdMgr);
        empByNormName.set(this.normalizeName(createdMgr.name), createdMgr);
        employeesCreated++;
      }
    }

    // 5. Agrupa linhas por colaborador (normName) para determinar a menor data de início aquisitivo (como admissionDate caso precise criar)
    const earliestStartByEmp = new Map<string, Date>();
    for (const row of parsedRows) {
      const normEmp = this.normalizeName(row.rawEmployeeName);
      const prev = earliestStartByEmp.get(normEmp);
      if (!prev || row.vestingStart < prev) {
        earliestStartByEmp.set(normEmp, row.vestingStart);
      }
    }

    // Cria os colaboradores da planilha que ainda não existem no banco
    for (const row of parsedRows) {
      const normEmp = this.normalizeName(row.rawEmployeeName);
      if (!empByNormName.has(normEmp)) {
        const deptNorm = this.normalizeName(row.rawDepartment);
        const deptId =
          deptNorm !== 'NAO IDENTIFICADO' ? departmentByNorm.get(deptNorm) || null : null;
        const isAprendiz = deptNorm === 'APRENDIZES';

        const cpf = this.generateSyntheticCpf(syntheticSeed++, usedCpfs);
        const email = this.generateUniqueEmail(
          row.rawEmployeeName,
          '@rainhadassete.com.br',
          usedEmails
        );

        let reg = row.contractCode || `FER-${syntheticSeed}`;
        if (usedCompanyRegs.has(reg)) {
          reg = `FER-${row.contractCode}-${syntheticSeed++}`;
        }
        usedCompanyRegs.add(reg);

        const admissionDate = earliestStartByEmp.get(normEmp) || row.vestingStart;

        const createdEmp = await prisma.employee.create({
          data: {
            companyId,
            code: row.contractCode || null,
            registrationNumber: reg,
            name: row.rawEmployeeName.trim().toUpperCase(),
            cpf,
            email,
            departmentId: deptId,
            admissionDate,
            contractType: isAprendiz ? 'APRENDIZ' : 'CLT',
            status: 'ATIVO',
          },
        });

        empByNormName.set(normEmp, createdEmp);
        empByNormName.set(this.normalizeName(createdEmp.name), createdEmp);
        employeesCreated++;
      }
    }

    // 6. Atualiza Setor, Líder/Gestor e Código de Contrato dos colaboradores da planilha
    let employeesUpdated = 0;
    let managersLinked = 0;
    const updatedEmpIds = new Set<string>();

    for (const row of parsedRows) {
      const normEmp = this.normalizeName(row.rawEmployeeName);
      const emp = empByNormName.get(normEmp);
      if (!emp || updatedEmpIds.has(emp.id)) continue;

      const deptNorm = this.normalizeName(row.rawDepartment);
      const targetDeptId =
        deptNorm && deptNorm !== 'NAO IDENTIFICADO'
          ? departmentByNorm.get(deptNorm) || emp.departmentId
          : emp.departmentId;

      const normMgr = this.normalizeName(row.rawManagerName, true);
      let targetManagerId = emp.managerId;
      if (normMgr && normMgr !== 'NAO IDENTIFICADO') {
        const mgrEmp = empByNormName.get(normMgr);
        if (mgrEmp && mgrEmp.id !== emp.id) {
          targetManagerId = mgrEmp.id;
        }
      }

      const targetCode = row.contractCode || emp.code || null;
      const earliestStart = earliestStartByEmp.get(normEmp);
      // Se a data de admissão no banco for posterior ao início do período aquisitivo da planilha, recua a data de admissão
      const currentAdm = new Date(emp.admissionDate);
      const shouldUpdateAdmission =
        earliestStart && earliestStart.getTime() < currentAdm.getTime();

      await prisma.employee.update({
        where: { id: emp.id },
        data: {
          code: targetCode,
          departmentId: targetDeptId,
          managerId: targetManagerId,
          status: 'ATIVO',
          terminationDate: null,
          ...(shouldUpdateAdmission ? { admissionDate: earliestStart } : {}),
        },
      });

      updatedEmpIds.add(emp.id);
      employeesUpdated++;
      if (targetManagerId) managersLinked++;
    }

    // 7. Upsert dos 246 Períodos Aquisitivos e eventuais Férias Programadas
    let periodsCreated = 0;
    let periodsUpdated = 0;
    let requestsCreated = 0;
    const now = new Date();

    for (const row of parsedRows) {
      const normEmp = this.normalizeName(row.rawEmployeeName);
      const emp = empByNormName.get(normEmp);
      if (!emp) continue;

      const isCompletedVesting = now >= row.vestingEnd;

      let daysEntitled = 30;
      let daysTaken = row.daysTaken;
      let daysRemaining = 30;
      let status: 'EM_AQUISICAO' | 'ADQUIRIDO' | 'CONCLUIDO' | 'VENCIDO' = 'EM_AQUISICAO';

      if (isCompletedVesting) {
        daysTaken = Math.max(0, Math.round(row.daysTaken));
        daysRemaining = Math.max(0, Math.round(row.balanceSheet));
        const totalFromSheet = Math.round(row.daysTaken + row.sellDays + row.balanceSheet);
        daysEntitled = totalFromSheet > 0 ? totalFromSheet : 30;

        if (daysRemaining <= 0) {
          status = 'CONCLUIDO';
        } else if (now > row.deadlineDate) {
          status = 'VENCIDO';
        } else {
          status = 'ADQUIRIDO';
        }
      } else {
        // Período em aquisição: direito base é 30 dias; o saldo proporcional (ex: 27.5, 25, 2.5) é calculado dinamicamente
        daysEntitled = 30;
        daysTaken = Math.max(0, Math.round(row.daysTaken));
        daysRemaining = Math.max(0, 30 - daysTaken);
        status = 'EM_AQUISICAO';
      }

      // Procura se já existe período para este colaborador com a mesma data de início (ignorando hora/timezone)
      const startKey = row.vestingStart.toISOString().split('T')[0];
      const existingPeriods = await prisma.vacationPeriod.findMany({
        where: { employeeId: emp.id },
      });
      const existingPeriod = existingPeriods.find(
        (ep) => new Date(ep.vestingStartDate).toISOString().split('T')[0] === startKey
      );

      let savedPeriodId: string;

      if (existingPeriod) {
        const updated = await prisma.vacationPeriod.update({
          where: { id: existingPeriod.id },
          data: {
            vestingStartDate: row.vestingStart,
            vestingEndDate: row.vestingEnd,
            deadlineDate: row.deadlineDate,
            daysEntitled,
            daysTaken,
            daysRemaining,
            status,
          },
        });
        savedPeriodId = updated.id;
        periodsUpdated++;
      } else {
        const created = await prisma.vacationPeriod.create({
          data: {
            employeeId: emp.id,
            vestingStartDate: row.vestingStart,
            vestingEndDate: row.vestingEnd,
            deadlineDate: row.deadlineDate,
            daysEntitled,
            daysTaken,
            daysScheduled: 0,
            daysRemaining,
            status,
          },
        });
        savedPeriodId = created.id;
        periodsCreated++;
      }

      // Se a linha trouxer férias programadas (colunas L e M)
      if (row.scheduledStart && row.scheduledEnd && row.scheduledEnd >= row.scheduledStart) {
        const diffDays =
          Math.ceil(
            Math.abs(row.scheduledEnd.getTime() - row.scheduledStart.getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1;

        const existingReq = await prisma.vacationRequest.findFirst({
          where: {
            vacationPeriodId: savedPeriodId,
            startDate: row.scheduledStart,
          },
        });

        if (!existingReq) {
          await prisma.vacationRequest.create({
            data: {
              employeeId: emp.id,
              vacationPeriodId: savedPeriodId,
              startDate: row.scheduledStart,
              endDate: row.scheduledEnd,
              daysCount: diffDays,
              sellDaysCount: row.sellDays,
              status: 'APROVADO',
              rhUserId: actorUserId || null,
              rhActionAt: new Date(),
              notes: 'Importado da planilha de controle de férias.',
            },
          });
          requestsCreated++;
        }
      }
    }

    // 8. Sincroniza os períodos aquisitivos para todos os colaboradores da empresa
    for (const empId of updatedEmpIds) {
      await VacationService.ensurePeriodsForEmployee(empId);
    }

    if (actorUserId) {
      await prisma.auditLog.create({
        data: {
          userId: actorUserId,
          action: 'IMPORTACAO_PLANILHA_FERIAS',
          entity: 'VacationPeriod',
          recordId: companyId,
          newValue: {
            totalRowsProcessed: parsedRows.length,
            employeesCreated,
            employeesUpdated,
            departmentsCreated,
            managersLinked,
            periodsCreated,
            periodsUpdated,
            requestsCreated,
          },
        },
      });
    }

    return {
      success: true,
      totalRowsProcessed: parsedRows.length,
      employeesCreated,
      employeesUpdated,
      departmentsCreated,
      managersLinked,
      periodsCreated,
      periodsUpdated,
      requestsCreated,
      warnings,
    };
  }
}
