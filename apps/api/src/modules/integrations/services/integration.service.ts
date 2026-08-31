import { prisma } from '../../../database/prisma.js';
import { IntegrationCategory, IntegrationStatus } from '@prisma/client';
import { IntegrationRegistry } from '../registry/integration.registry.js';
import { AuditService } from '../../audit/services/audit.service.js';

export interface DefaultIntegrationSeed {
  key: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  enabled: boolean;
  status: IntegrationStatus;
  settings?: any;
}

const DEFAULT_CATALOG: DefaultIntegrationSeed[] = [
  {
    key: 'control_id',
    name: 'Control iD (iDClass / iDFit / iDAccess / iDSecure)',
    category: IntegrationCategory.TIME_CLOCK,
    description: 'Integração completa com coletores de ponto Control iD via API HTTP, push Webhook e AFD.',
    enabled: true, // Habilitado por padrão como solicitado
    status: IntegrationStatus.ACTIVE,
    settings: {
      syncIntervalMinutes: 15,
      autoSync: true,
      afdFormat: 'PORTARIA_1510_671',
      webhookEnabled: true,
    },
  },
  {
    key: 'dimep',
    name: 'Dimep (PrintPoint III / Kairos / MiniPrint)',
    category: IntegrationCategory.TIME_CLOCK,
    description: 'Integração com relógios e webservices Dimep via nuvem Kairos ou AFD direto.',
    enabled: false,
    status: IntegrationStatus.INACTIVE,
    settings: {
      syncIntervalMinutes: 30,
      autoSync: false,
    },
  },
  {
    key: 'secullum',
    name: 'Secullum (Ponto Web Cloud)',
    category: IntegrationCategory.TIME_CLOCK,
    description: 'Sincronização com o portal Secullum Ponto Web e concentradores de ponto.',
    enabled: false,
    status: IntegrationStatus.INACTIVE,
    settings: {
      syncIntervalMinutes: 60,
      autoSync: false,
    },
  },
  {
    key: 'ahgora',
    name: 'Ahgora / Senior Ponto',
    category: IntegrationCategory.TIME_CLOCK,
    description: 'Conector com API Ahgora / Senior para importação de batidas e espelho.',
    enabled: false,
    status: IntegrationStatus.INACTIVE,
    settings: {
      syncIntervalMinutes: 60,
      autoSync: false,
    },
  },
];

export class IntegrationService {
  /**
   * Garante que as integrações padrão estejam semeadas no banco de dados
   */
  static async ensureDefaultIntegrations(): Promise<void> {
    for (const item of DEFAULT_CATALOG) {
      const existing = await prisma.integrationConfig.findUnique({
        where: { key: item.key },
      });

      if (!existing) {
        await prisma.integrationConfig.create({
          data: {
            key: item.key,
            name: item.name,
            category: item.category,
            description: item.description,
            enabled: item.enabled,
            status: item.status,
            settings: item.settings || {},
          },
        });
      }
    }
  }

  /**
   * Lista todas as integrações cadastradas e seus status
   */
  static async list() {
    await this.ensureDefaultIntegrations();

    const configs = await prisma.integrationConfig.findMany({
      orderBy: [{ enabled: 'desc' }, { key: 'asc' }],
      include: {
        _count: {
          select: {
            devices: true,
            syncLogs: true,
          },
        },
      },
    });

    return configs.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      category: c.category,
      description: c.description,
      enabled: c.enabled,
      status: c.status,
      settings: c.settings,
      lastSyncAt: c.lastSyncAt,
      deviceCount: c._count.devices,
      syncLogCount: c._count.syncLogs,
      hasProviderImplementation: IntegrationRegistry.has(c.key),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Obtém detalhes de uma integração específica por key (ex: 'control_id')
   */
  static async getByKey(key: string) {
    await this.ensureDefaultIntegrations();

    const config = await prisma.integrationConfig.findUnique({
      where: { key: key.toLowerCase() },
      include: {
        devices: {
          where: { deletedAt: null },
          include: {
            unit: { select: { id: true, name: true, city: true } },
          },
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            syncLogs: true,
          },
        },
      },
    });

    if (!config) {
      const error: any = new Error(`Integração '${key}' não encontrada`);
      error.statusCode = 404;
      throw error;
    }

    return {
      ...config,
      hasProviderImplementation: IntegrationRegistry.has(config.key),
    };
  }

  /**
   * Ativa ou Desativa uma integração no sistema
   */
  static async toggle(
    key: string,
    enabled: boolean,
    auditContext?: { userId?: string | null; employeeId?: string | null; ipAddress?: string | null; userAgent?: string | null }
  ) {
    const config = await this.getByKey(key);

    const updated = await prisma.integrationConfig.update({
      where: { key: key.toLowerCase() },
      data: {
        enabled,
        status: enabled ? IntegrationStatus.ACTIVE : IntegrationStatus.INACTIVE,
      },
    });

    await AuditService.log({
      userId: auditContext?.userId,
      employeeId: auditContext?.employeeId,
      action: enabled ? 'ENABLE_INTEGRATION' : 'DISABLE_INTEGRATION',
      entity: 'IntegrationConfig',
      recordId: updated.id,
      previousValue: { enabled: config.enabled, status: config.status },
      newValue: { enabled: updated.enabled, status: updated.status },
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return updated;
  }

  /**
   * Atualiza as configurações e credenciais de uma integração
   */
  static async updateSettings(
    key: string,
    data: { name?: string; description?: string; settings?: any; status?: IntegrationStatus },
    auditContext?: { userId?: string | null; employeeId?: string | null; ipAddress?: string | null; userAgent?: string | null }
  ) {
    const config = await this.getByKey(key);

    const updated = await prisma.integrationConfig.update({
      where: { key: key.toLowerCase() },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.settings ? { settings: data.settings } : {}),
        ...(data.status ? { status: data.status } : {}),
      },
    });

    await AuditService.log({
      userId: auditContext?.userId,
      employeeId: auditContext?.employeeId,
      action: 'UPDATE_INTEGRATION_SETTINGS',
      entity: 'IntegrationConfig',
      recordId: updated.id,
      previousValue: config.settings,
      newValue: updated.settings,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    });

    return updated;
  }
}
