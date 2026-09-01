import { prisma } from '../../../database/prisma.js';
import { RhidClient, RhidLoginCredentials, RhidPersonDTO, RhidTestConnectionResult } from '../providers/control-id/rhid.client.js';
import { AuditService } from '../../audit/services/audit.service.js';

export interface EmployeeSyncItem {
  key: string;
  name: string;
  cpf: string;
  registrationNumber?: string | null;
  email?: string | null;
  status: 'SYNCED' | 'ATRIO_ONLY' | 'RHID_ONLY';
  atrioId?: string | null;
  rhidId?: number | null;
  atrioStatus?: string | null;
  rhidStatus?: number | null;
  templatesCount?: number;
  hasPhoto?: boolean;
}

export interface EmployeeSyncOverview {
  totalAtrio: number;
  totalRhid: number;
  totalSynced: number;
  totalAtrioOnly: number;
  totalRhidOnly: number;
  items: EmployeeSyncItem[];
}

export class RhidService {
  /**
   * Obtém as configurações e credenciais do RHiD salvas na integração Control iD
   */
  static async getStoredCredentials(): Promise<RhidLoginCredentials & { enabled: boolean; autoSync: boolean }> {
    const config = await prisma.integrationConfig.findUnique({
      where: { key: 'control_id' },
    });

    const settings: any = config?.settings || {};
    return {
      email: settings.rhidEmail || '',
      password: settings.rhidPassword || '',
      domain: settings.rhidDomain || '',
      enabled: Boolean(settings.rhidEnabled),
      autoSync: Boolean(settings.rhidAutoSyncEmployees),
    };
  }

  /**
   * Atualiza as configurações de acesso ao RHiD Cloud
   */
  static async updateSettings(data: {
    email: string;
    password?: string;
    domain?: string;
    enabled?: boolean;
    autoSync?: boolean;
  }) {
    const current = await prisma.integrationConfig.findUnique({
      where: { key: 'control_id' },
    });

    if (!current) {
      throw new Error('Configuração da integração Control iD não encontrada.');
    }

    const currentSettings: any = current.settings || {};
    const newSettings = {
      ...currentSettings,
      rhidEmail: data.email,
      rhidDomain: data.domain || '',
      rhidEnabled: data.enabled !== undefined ? data.enabled : currentSettings.rhidEnabled,
      rhidAutoSyncEmployees: data.autoSync !== undefined ? data.autoSync : currentSettings.rhidAutoSyncEmployees,
    };

    if (data.password) {
      newSettings.rhidPassword = data.password;
    }

    return await prisma.integrationConfig.update({
      where: { key: 'control_id' },
      data: {
        settings: newSettings,
      },
    });
  }

  /**
   * Testa a conexão com o RHiD Cloud usando credenciais fornecidas ou armazenadas
   */
  static async testConnection(customCredentials?: RhidLoginCredentials): Promise<RhidTestConnectionResult> {
    const credentials = customCredentials?.email
      ? customCredentials
      : await this.getStoredCredentials();

    if (!credentials.email || !credentials.password) {
      return {
        success: false,
        message: 'Credenciais do RHiD não configuradas (E-mail e Senha são necessários).',
      };
    }

    return await RhidClient.testConnection(credentials);
  }

  /**
   * Compara a base do Átrio com os colaboradores do RHiD
   */
  static async getSyncOverview(): Promise<EmployeeSyncOverview> {
    const credentials = await this.getStoredCredentials();
    if (!credentials.email || !credentials.password) {
      throw new Error('Configure o E-mail e Senha do RHiD nas configurações da integração antes de sincronizar.');
    }

    // 1. Autentica e lista pessoas no RHiD
    const loginRes = await RhidClient.login(credentials);
    const rhidPersons = await RhidClient.listPersons(loginRes.accessToken);

    // 2. Busca todos os colaboradores cadastrados no Átrio
    const atrioEmployees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        cpf: true,
        email: true,
        registrationNumber: true,
        status: true,
      },
      orderBy: { name: 'asc' },
    });

    // 3. Monta mapas por CPF e Matrícula limpos
    const cleanDigits = (val?: string | number | null) => (val ? String(val).replace(/\D/g, '') : '');

    const atrioByCpf = new Map<string, typeof atrioEmployees[0]>();
    const atrioByReg = new Map<string, typeof atrioEmployees[0]>();
    for (const emp of atrioEmployees) {
      const cleanCpf = cleanDigits(emp.cpf);
      if (cleanCpf) atrioByCpf.set(cleanCpf, emp);
      if (emp.registrationNumber) {
        atrioByReg.set(emp.registrationNumber.trim(), emp);
        atrioByReg.set(cleanDigits(emp.registrationNumber), emp);
      }
    }

    const items: EmployeeSyncItem[] = [];
    const matchedAtrioIds = new Set<string>();
    const matchedRhidIds = new Set<number>();

    // 4. Analisa cada pessoa do RHiD
    for (const p of rhidPersons) {
      const cleanCpf = p.cpf ? String(p.cpf).padStart(11, '0') : '';
      const cleanReg = p.registration ? String(p.registration).trim() : '';

      const matchedEmployee = (cleanCpf && atrioByCpf.get(cleanCpf)) || (cleanReg && atrioByReg.get(cleanReg));

      if (matchedEmployee) {
        matchedAtrioIds.add(matchedEmployee.id);
        if (p.id) matchedRhidIds.add(p.id);

        items.push({
          key: `matched_${matchedEmployee.id}_${p.id}`,
          name: matchedEmployee.name || p.name,
          cpf: matchedEmployee.cpf || cleanCpf,
          registrationNumber: matchedEmployee.registrationNumber || cleanReg,
          email: matchedEmployee.email,
          status: 'SYNCED',
          atrioId: matchedEmployee.id,
          rhidId: p.id,
          atrioStatus: matchedEmployee.status,
          rhidStatus: p.status,
          templatesCount: p.numberOfTemplates || (p.templates ? p.templates.length : 0),
          hasPhoto: Boolean(p.photo),
        });
      } else {
        if (p.id) matchedRhidIds.add(p.id);
        items.push({
          key: `rhid_${p.id}`,
          name: p.name,
          cpf: cleanCpf,
          registrationNumber: cleanReg,
          email: null,
          status: 'RHID_ONLY',
          atrioId: null,
          rhidId: p.id,
          atrioStatus: null,
          rhidStatus: p.status,
          templatesCount: p.numberOfTemplates || (p.templates ? p.templates.length : 0),
          hasPhoto: Boolean(p.photo),
        });
      }
    }

    // 5. Analisa colaboradores do Átrio que ainda não estão no RHiD
    for (const emp of atrioEmployees) {
      if (!matchedAtrioIds.has(emp.id)) {
        items.push({
          key: `atrio_${emp.id}`,
          name: emp.name,
          cpf: emp.cpf,
          registrationNumber: emp.registrationNumber,
          email: emp.email,
          status: 'ATRIO_ONLY',
          atrioId: emp.id,
          rhidId: null,
          atrioStatus: emp.status,
          rhidStatus: null,
          templatesCount: 0,
          hasPhoto: false,
        });
      }
    }

    const totalSynced = items.filter((i) => i.status === 'SYNCED').length;
    const totalAtrioOnly = items.filter((i) => i.status === 'ATRIO_ONLY').length;
    const totalRhidOnly = items.filter((i) => i.status === 'RHID_ONLY').length;

    return {
      totalAtrio: atrioEmployees.length,
      totalRhid: rhidPersons.length,
      totalSynced,
      totalAtrioOnly,
      totalRhidOnly,
      items,
    };
  }

  /**
   * Importa colaboradores do RHiD para o Átrio
   */
  static async importFromRhid(options: { rhidPersonIds?: number[]; auditContext?: any }) {
    const credentials = await this.getStoredCredentials();
    const loginRes = await RhidClient.login(credentials);
    const rhidPersons = await RhidClient.listPersons(loginRes.accessToken);

    // Obtém empresa padrão do Átrio
    const defaultCompany = await prisma.company.findFirst();
    if (!defaultCompany) {
      throw new Error('Nenhuma empresa cadastrada no Átrio para vincular os colaboradores importados.');
    }

    const selectedFilter = options.rhidPersonIds && options.rhidPersonIds.length > 0
      ? new Set(options.rhidPersonIds)
      : null;

    let importedCount = 0;
    let linkedCount = 0;
    let skippedCount = 0;

    for (const p of rhidPersons) {
      if (selectedFilter && p.id && !selectedFilter.has(p.id)) {
        continue;
      }

      const rawCpf = p.cpf ? String(p.cpf).padStart(11, '0') : '';
      if (!rawCpf) {
        skippedCount++;
        continue;
      }

      try {
        // Formata CPF com pontuação padrão (XXX.XXX.XXX-XX)
        const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        const cleanDigitsCpf = rawCpf.replace(/\D/g, '');

        // Verifica se já existe colaborador com esse CPF
        const existing = await prisma.employee.findFirst({
          where: {
            OR: [
              { cpf: formattedCpf },
              { cpf: cleanDigitsCpf },
            ],
          },
        });

        if (existing) {
          // Atualiza matrícula ou código se estiver em branco
          if (!existing.registrationNumber && p.registration) {
            await prisma.employee.update({
              where: { id: existing.id },
              data: { registrationNumber: String(p.registration).trim() },
            });
          }
          linkedCount++;
        } else {
          // Cria novo colaborador no Átrio garantindo e-mail único
          const registration = p.registration ? String(p.registration).trim() : `RHiD-${p.id || Date.now()}`;
          
          let generatedEmail = `colaborador.${cleanDigitsCpf}@rhid.atrio`;
          let existingEmail = await prisma.employee.findUnique({ where: { email: generatedEmail } });
          let suffix = 1;
          while (existingEmail) {
            generatedEmail = `colaborador.${cleanDigitsCpf}.${p.id || suffix}@rhid.atrio`;
            existingEmail = await prisma.employee.findUnique({ where: { email: generatedEmail } });
            suffix++;
          }

          await prisma.employee.create({
            data: {
              name: p.name ? p.name.trim() : 'Colaborador RHiD',
              cpf: formattedCpf,
              registrationNumber: registration,
              email: generatedEmail,
              companyId: defaultCompany.id,
              admissionDate: new Date(),
              status: p.status === 1 ? 'DESLIGADO' : 'ATIVO',
            },
          });
          importedCount++;
        }
      } catch (itemErr: any) {
        console.error(`Erro ao importar colaborador ${p.name} (CPF: ${rawCpf}):`, itemErr.message);
        skippedCount++;
      }
    }

    return {
      success: true,
      importedCount,
      linkedCount,
      skippedCount,
      message: `Processamento concluído: ${importedCount} novo(s) colaborador(es) cadastrado(s) e ${linkedCount} já existente(s) vinculado(s).`,
    };
  }

  /**
   * Envia colaboradores do Átrio para a nuvem do RHiD
   */
  static async pushToRhid(options: { employeeIds?: string[]; auditContext?: any }) {
    const credentials = await this.getStoredCredentials();
    const loginRes = await RhidClient.login(credentials);

    const whereClause: any = { deletedAt: null };
    if (options.employeeIds && options.employeeIds.length > 0) {
      whereClause.id = { in: options.employeeIds };
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: { company: true, department: true },
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const emp of employees) {
      try {
        const cleanCpf = emp.cpf ? Number(emp.cpf.replace(/\D/g, '')) : null;
        const regNumber = emp.registrationNumber || emp.code || undefined;

        const personDto: RhidPersonDTO = {
          name: emp.name,
          cpf: cleanCpf,
          registration: regNumber,
          status: emp.status === 'DESLIGADO' ? 1 : 0,
        };

        await RhidClient.createPerson(loginRes.accessToken, personDto);
        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`${emp.name}: ${err.message}`);
      }
    }

    return {
      success: errorCount === 0,
      total: employees.length,
      successCount,
      errorCount,
      errors: errors.slice(0, 10),
      message: `${successCount} colaborador(es) enviado(s) para o RHiD com sucesso.`,
    };
  }

  /**
   * Exporta a lista de colaboradores no formato CSV padrão do RHiD
   */
  static async exportCsv(): Promise<string> {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      include: { department: true, company: true },
      orderBy: { name: 'asc' },
    });

    const header = 'Nome;CPF;PIS;Matrícula;Código Crachá;Departamento;Empresa;Status\n';
    const rows = employees.map((e) => {
      const cleanCpf = e.cpf ? e.cpf.replace(/\D/g, '') : '';
      const reg = e.registrationNumber || '';
      const code = e.code || '';
      const dept = e.department?.name || '';
      const comp = e.company?.tradeName || e.company?.legalName || '';
      const status = e.status === 'ATIVO' ? 'Ativo' : 'Inativo';

      return `"${e.name}";"${cleanCpf}";"";"${reg}";"${code}";"${dept}";"${comp}";"${status}"`;
    });

    return header + rows.join('\n');
  }

  /**
   * Sincroniza e cadastra automaticamente os relógios físicos do RHiD no Átrio
   */
  static async syncDevicesFromRhid() {
    const credentials = await this.getStoredCredentials();
    const loginRes = await RhidClient.login(credentials);
    const rhidDevices = await RhidClient.listDevices(loginRes.accessToken);

    const integration = await prisma.integrationConfig.findUnique({
      where: { key: 'control_id' },
    });

    if (!integration) {
      throw new Error('Configuração de integração Control iD não encontrada.');
    }

    const defaultUnit = await prisma.unit.findFirst();

    let createdCount = 0;
    let updatedCount = 0;

    for (const dev of rhidDevices) {
      const serial = dev.serial || `RHID-DEV-${dev.id}`;
      const name = dev.name || `Relógio RHiD ${dev.id}`;
      const host = dev.host || undefined;
      const port = dev.port === 443 ? 80 : (dev.port || 80);
      const modelName = dev.model === 5 ? 'iDFace' : 'iDClass';

      const existing = await prisma.timeClockDevice.findFirst({
        where: {
          OR: [
            { serialNumber: serial },
            { name: name },
          ],
        },
      });

      if (existing) {
        await prisma.timeClockDevice.update({
          where: { id: existing.id },
          data: {
            name,
            serialNumber: serial,
            ipAddress: host,
            port: port,
            model: modelName,
            active: !dev.excluded,
            authCredentials: {
              username: dev.user || 'admin',
              password: dev.password || 'admin',
              deviceCode: dev.deviceCode,
              rhidDeviceId: dev.id,
            },
          },
        });
        updatedCount++;
      } else {
        await prisma.timeClockDevice.create({
          data: {
            integrationId: integration.id,
            name,
            serialNumber: serial,
            ipAddress: host,
            port: port,
            model: modelName,
            active: !dev.excluded,
            unitId: null,
            authCredentials: {
              username: dev.user || 'admin',
              password: dev.password || 'admin',
              deviceCode: dev.deviceCode,
              rhidDeviceId: dev.id,
            },
          },
        });
        createdCount++;
      }
    }

    return {
      success: true,
      total: rhidDevices.length,
      createdCount,
      updatedCount,
      message: `${createdCount} novo(s) relógio(s) importado(s) e ${updatedCount} atualizado(s) a partir do RHiD Cloud.`,
    };
  }

  /**
   * Sincroniza Departamentos, Cargos e Escalas a partir do RHiD
   */
  static async syncOrganizationalStructure(): Promise<{
    departmentsCount: number;
    positionsCount: number;
    schedulesCount: number;
    employeesUpdated: number;
  }> {
    const creds = await this.getStoredCredentials();
    const login = await RhidClient.login(creds);

    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          legalName: 'Rainha das Sete Indústria e Comércio de Autopeças Ltda',
          tradeName: 'Rainha das Sete',
          cnpj: '61.033.155/0001-19',
        },
      });
    }

    // 1. Departamentos
    const depRes = await fetch('https://www.rhid.com.br/v2/customerdb/department.svc/a?draw=1&start=0&length=200', {
      headers: { Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' },
    });
    const depJson: any = await depRes.json();
    const rhidDepts = depJson.data || [];
    const deptMap = new Map<number, string>();
    for (const d of rhidDepts) {
      if (!d.name) continue;
      const cleanName = d.name.trim();
      let dept = await prisma.department.findFirst({
        where: { companyId: company.id, name: cleanName },
      });
      if (!dept) {
        dept = await prisma.department.create({
          data: {
            companyId: company.id,
            name: cleanName,
            code: `DEP-${d.id}`,
          },
        });
      }
      deptMap.set(d.id, dept.id);
    }

    // 2. Cargos
    const roleRes = await fetch('https://www.rhid.com.br/v2/customerdb/personrole.svc/a?draw=1&start=0&length=300', {
      headers: { Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' },
    });
    const roleJson: any = await roleRes.json();
    const rhidRoles = roleJson.data || [];
    const roleMap = new Map<number, string>();
    for (const r of rhidRoles) {
      if (!r.name) continue;
      const cleanName = r.name.trim();
      let pos = await prisma.position.findFirst({
        where: { title: cleanName },
      });
      if (!pos) {
        pos = await prisma.position.create({
          data: {
            title: cleanName,
            level: 'Operacional',
            description: `Importado do RHiD (ID: ${r.id})`,
          },
        });
      }
      roleMap.set(r.id, pos.id);
    }

    // 3. Escalas / Horários
    const shiftRes = await fetch('https://www.rhid.com.br/v2/customerdb/shift.svc/a?draw=1&start=0&length=100', {
      headers: { Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' },
    });
    const shiftJson: any = await shiftRes.json();
    const rhidShifts = shiftJson.data || [];
    const shiftMap = new Map<number, string>();
    for (const s of rhidShifts) {
      if (!s.name) continue;
      const cleanName = s.name.trim();
      let sched = await prisma.workSchedule.findFirst({
        where: { name: cleanName },
      });
      if (!sched) {
        sched = await prisma.workSchedule.create({
          data: {
            name: cleanName,
            description: s.strHorarioContratualSimples || 'Horário importado do RHiD',
            weeklyHours: 44,
            toleranceMinutes: 10,
            lunchIntervalMinutes: 60,
            flexibleInterval: true,
            scheduleRules: {
              raw: s.strHorarioContratualSimples,
              rhidShiftId: s.id,
            },
          },
        });
      }
      shiftMap.set(s.id, sched.id);
    }

    // 4. Mapeamento de histórico de cargos e escalas
    const roleHistRes = await fetch('https://www.rhid.com.br/v2/customerdb/personrolehistory.svc/a?draw=1&start=0&length=5000', {
      headers: { Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' },
    });
    const roleHistList = ((await roleHistRes.json()) as any).data || [];
    const personToRole = new Map<number, number>();
    for (const rh of roleHistList) {
      if (rh.idPerson && rh.idPersonRole) personToRole.set(rh.idPerson, rh.idPersonRole);
    }

    const personShiftRes = await fetch('https://www.rhid.com.br/v2/customerdb/personshift.svc/a?draw=1&start=0&length=5000', {
      headers: { Authorization: `Bearer ${login.accessToken}`, 'Content-Type': 'application/json' },
    });
    const personShiftList = ((await personShiftRes.json()) as any).data || [];
    const personToShift = new Map<number, number>();
    for (const ps of personShiftList) {
      if (ps.idPerson && ps.idShift) personToShift.set(ps.idPerson, ps.idShift);
    }

    // 5. Atualiza todos os colaboradores
    const persons = await RhidClient.listPersons(login.accessToken);
    let updatedCount = 0;

    for (const p of persons) {
      const rawCpf = p.cpf ? String(p.cpf).replace(/\D/g, '').padStart(11, '0') : '';
      const formattedCpf = rawCpf ? rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : null;
      if (!formattedCpf) continue;

      const emp = await prisma.employee.findFirst({
        where: {
          OR: [{ cpf: formattedCpf }, { email: `colaborador.${rawCpf}@rhid.atrio` }],
        },
      });

      if (emp) {
        const deptId = p.idDepartment ? deptMap.get(p.idDepartment) : undefined;
        const rhidRoleId = personToRole.get(p.id);
        const rhidShiftId = personToShift.get(p.id);

        const positionId = rhidRoleId ? roleMap.get(rhidRoleId) : undefined;
        const workScheduleId = rhidShiftId ? shiftMap.get(rhidShiftId) : undefined;

        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            departmentId: deptId || emp.departmentId,
            positionId: positionId || emp.positionId,
            workScheduleId: workScheduleId || emp.workScheduleId,
          },
        });
        updatedCount++;
      }
    }

    return {
      departmentsCount: deptMap.size,
      positionsCount: roleMap.size,
      schedulesCount: shiftMap.size,
      employeesUpdated: updatedCount,
    };
  }
}
