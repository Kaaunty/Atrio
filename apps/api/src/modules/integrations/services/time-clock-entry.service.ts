import { prisma } from '../../../database/prisma.js';

export interface QueryEntriesParams {
  employeeId?: string;
  deviceId?: string;
  registrationNumber?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  source?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export class TimeClockEntryService {
  /**
   * Consulta paginada e filtrada de registros brutos imutáveis de ponto
   */
  static async list(params: QueryEntriesParams) {
    const {
      employeeId,
      deviceId,
      registrationNumber,
      startDate,
      endDate,
      source,
      search,
      page = 1,
      pageSize = 20,
    } = params;

    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (employeeId) where.employeeId = employeeId;
    if (deviceId) where.deviceId = deviceId;
    if (registrationNumber) where.registrationNumber = { contains: registrationNumber };
    if (source) where.source = source;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate instanceof Date ? startDate : new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = endDate instanceof Date ? endDate : new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { registrationNumber: { contains: search, mode: 'insensitive' } },
        { hash: { contains: search, mode: 'insensitive' } },
        { employee: { name: { contains: search, mode: 'insensitive' } } },
        { employee: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, rawItems] = await Promise.all([
      prisma.timeClockEntry.count({ where }),
      prisma.timeClockEntry.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { timestamp: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              registrationNumber: true,
              avatarUrl: true,
              department: { select: { name: true } },
            },
          },
          device: {
            select: {
              id: true,
              name: true,
              model: true,
              serialNumber: true,
              unit: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Trata BigInt para serialização JSON limpa
    const items = rawItems.map((item) => ({
      ...item,
      nsr: item.nsr ? item.nsr.toString() : null,
    }));

    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Estatísticas gerais das batidas brutas
   */
  static async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalEntries, todayEntries, unmappedEntries] = await Promise.all([
      prisma.timeClockEntry.count(),
      prisma.timeClockEntry.count({ where: { timestamp: { gte: today } } }),
      prisma.timeClockEntry.count({ where: { employeeId: null } }),
    ]);

    return {
      totalEntries,
      todayEntries,
      unmappedEntries,
    };
  }

  /**
   * Reconcilia e vincula retroativamente marcações sem colaborador aos novos registros
   */
  static async remapUnmappedEntries() {
    const unmapped = await prisma.timeClockEntry.findMany({
      where: { employeeId: null },
      select: { id: true, registrationNumber: true },
    });

    if (unmapped.length === 0) {
      return { totalUnmapped: 0, remappedCount: 0, message: 'Nenhuma marcação pendente de vínculo.' };
    }

    const employees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, registrationNumber: true, code: true, cpf: true },
    });

    const employeeMap = new Map<string, string>();
    for (const emp of employees) {
      if (emp.registrationNumber) {
        employeeMap.set(emp.registrationNumber.trim(), emp.id);
        employeeMap.set(emp.registrationNumber.trim().replace(/^0+/, ''), emp.id);
      }
      if (emp.code) {
        employeeMap.set(emp.code.trim(), emp.id);
        employeeMap.set(emp.code.trim().replace(/^0+/, ''), emp.id);
      }
      if (emp.cpf) {
        employeeMap.set(emp.cpf.trim().replace(/\D/g, ''), emp.id);
      }
    }

    let remappedCount = 0;
    const updatesByEmployee = new Map<string, string[]>();

    for (const entry of unmapped) {
      const reg = entry.registrationNumber.trim();
      const cleanReg = reg.replace(/^0+/, '');
      const empId = employeeMap.get(reg) || employeeMap.get(cleanReg);

      if (empId) {
        remappedCount++;
        const list = updatesByEmployee.get(empId) || [];
        list.push(entry.id);
        updatesByEmployee.set(empId, list);
      }
    }

    for (const [empId, entryIds] of updatesByEmployee.entries()) {
      await prisma.timeClockEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { employeeId: empId },
      });
    }

    return {
      totalUnmapped: unmapped.length,
      remappedCount,
      remainingUnmapped: unmapped.length - remappedCount,
      message: `${remappedCount} marcações foram vinculadas com sucesso aos colaboradores cadastrados.`,
    };
  }
}
