import { prisma } from '../../../database/prisma.js';
import { CreateDeviceInput, UpdateDeviceInput } from '../integrations.dto.js';
import { IntegrationRegistry } from '../registry/integration.registry.js';
import { AuditService } from '../../audit/services/audit.service.js';

export class TimeClockDeviceService {
  /**
   * Cadastra um novo relógio de ponto no sistema
   */
  static async create(
    data: CreateDeviceInput,
    auditContext?: { userId?: string | null; employeeId?: string | null; ipAddress?: string | null; userAgent?: string | null }
  ) {
    // 1. Verifica duplicidade do número de série
    const existingSerial = await prisma.timeClockDevice.findUnique({
      where: { serialNumber: data.serialNumber },
    });

    if (existingSerial && !existingSerial.deletedAt) {
      const error: any = new Error(`Já existe um relógio cadastrado com o número de série '${data.serialNumber}'`);
      error.statusCode = 400;
      throw error;
    }

    // 2. Busca ou associa a integração correspondente
    const integrationKey = data.integrationKey || 'control_id';
    const integration = await prisma.integrationConfig.findUnique({
      where: { key: integrationKey.toLowerCase() },
    });

    // 3. Valida unidade se informada
    if (data.unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: data.unitId } });
      if (!unit || unit.deletedAt) {
        const error: any = new Error('Unidade informada não encontrada');
        error.statusCode = 400;
        throw error;
      }
    }

    const device = await prisma.timeClockDevice.create({
      data: {
        name: data.name,
        serialNumber: data.serialNumber,
        model: data.model,
        ipAddress: data.ipAddress || null,
        port: data.port || 80,
        unitId: data.unitId || null,
        integrationId: integration?.id || null,
        apiEndpoint: data.apiEndpoint || null,
        authCredentials: data.authCredentials || undefined,
        active: data.active ?? true,
      },
      include: {
        unit: { select: { id: true, name: true, city: true } },
        integration: { select: { id: true, key: true, name: true } },
      },
    });

    await AuditService.log({
      userId: auditContext?.userId,
      employeeId: auditContext?.employeeId,
      action: 'CREATE_TIME_CLOCK_DEVICE',
      entity: 'TimeClockDevice',
      recordId: device.id,
      newValue: { name: device.name, serialNumber: device.serialNumber, model: device.model },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return device;
  }

  /**
   * Atualiza dados de um relógio
   */
  static async update(
    id: string,
    data: UpdateDeviceInput,
    auditContext?: { userId?: string | null; employeeId?: string | null; ipAddress?: string | null; userAgent?: string | null }
  ) {
    const existing = await prisma.timeClockDevice.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      const error: any = new Error('Dispositivo de ponto não encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (data.serialNumber && data.serialNumber !== existing.serialNumber) {
      const duplicate = await prisma.timeClockDevice.findUnique({
        where: { serialNumber: data.serialNumber },
      });
      if (duplicate && duplicate.id !== id && !duplicate.deletedAt) {
        const error: any = new Error(`Já existe outro relógio com o número de série '${data.serialNumber}'`);
        error.statusCode = 400;
        throw error;
      }
    }

    const updated = await prisma.timeClockDevice.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.serialNumber ? { serialNumber: data.serialNumber } : {}),
        ...(data.model ? { model: data.model } : {}),
        ...(data.ipAddress !== undefined ? { ipAddress: data.ipAddress } : {}),
        ...(data.port !== undefined ? { port: data.port } : {}),
        ...(data.apiEndpoint !== undefined ? { apiEndpoint: data.apiEndpoint } : {}),
        ...(data.authCredentials !== undefined
          ? { authCredentials: data.authCredentials ? (data.authCredentials as any) : undefined }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.unitId !== undefined
          ? data.unitId
            ? { unit: { connect: { id: data.unitId } } }
            : { unit: { disconnect: true } }
          : {}),
      },
      include: {
        unit: { select: { id: true, name: true, city: true } },
        integration: { select: { id: true, key: true, name: true } },
      },
    });

    await AuditService.log({
      userId: auditContext?.userId,
      employeeId: auditContext?.employeeId,
      action: 'UPDATE_TIME_CLOCK_DEVICE',
      entity: 'TimeClockDevice',
      recordId: updated.id,
      previousValue: { name: existing.name, serialNumber: existing.serialNumber, active: existing.active },
      newValue: { name: updated.name, serialNumber: updated.serialNumber, active: updated.active },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return updated;
  }

  /**
   * Exclui suavemente (Soft delete) um relógio
   */
  static async delete(
    id: string,
    auditContext?: { userId?: string | null; employeeId?: string | null; ipAddress?: string | null; userAgent?: string | null }
  ) {
    const existing = await prisma.timeClockDevice.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      const error: any = new Error('Dispositivo de ponto não encontrado');
      error.statusCode = 404;
      throw error;
    }

    await prisma.timeClockDevice.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    await AuditService.log({
      userId: auditContext?.userId,
      employeeId: auditContext?.employeeId,
      action: 'DELETE_TIME_CLOCK_DEVICE',
      entity: 'TimeClockDevice',
      recordId: id,
      previousValue: { name: existing.name, serialNumber: existing.serialNumber },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return { success: true, message: 'Dispositivo removido com sucesso' };
  }

  /**
   * Lista relógios com filtros
   */
  static async list(params?: {
    integrationId?: string;
    unitId?: string;
    active?: boolean;
    search?: string;
  }) {
    const where: any = { deletedAt: null };

    if (params?.integrationId) where.integrationId = params.integrationId;
    if (params?.unitId) where.unitId = params.unitId;
    if (params?.active !== undefined) where.active = params.active;

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { serialNumber: { contains: params.search, mode: 'insensitive' } },
        { model: { contains: params.search, mode: 'insensitive' } },
        { ipAddress: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.timeClockDevice.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        unit: { select: { id: true, name: true, city: true } },
        integration: { select: { id: true, key: true, name: true, enabled: true } },
        _count: {
          select: {
            entries: true,
            syncLogs: true,
          },
        },
      },
    });
  }

  /**
   * Testa comunicação com um dispositivo específico cadastrado
   */
  static async testConnection(id: string) {
    const device = await prisma.timeClockDevice.findUnique({
      where: { id },
      include: { integration: true },
    });

    if (!device || device.deletedAt) {
      const error: any = new Error('Dispositivo não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const providerKey = device.integration?.key || 'control_id';
    const provider = IntegrationRegistry.get(providerKey);

    if (!provider) {
      const error: any = new Error(`Provedor de integração '${providerKey}' não suportado`);
      error.statusCode = 400;
      throw error;
    }

    return await provider.testConnection({
      ipAddress: device.ipAddress,
      port: device.port,
      serialNumber: device.serialNumber,
      authCredentials: device.authCredentials,
      apiEndpoint: device.apiEndpoint,
    });
  }
}
