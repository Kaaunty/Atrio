import crypto from 'node:crypto';
import { prisma } from '../../../database/prisma.js';
import { SyncStatus, SyncTrigger, TimeClockSource } from '@prisma/client';
import { IntegrationRegistry } from '../registry/integration.registry.js';
import { RawPunchRecord } from '../interfaces/integration-provider.interface.js';
import { AuditService } from '../../audit/services/audit.service.js';

export interface SyncExecutionOptions {
  integrationKey?: string;
  deviceId?: string | null;
  startDate?: Date;
  endDate?: Date;
  triggeredBy?: SyncTrigger;
  afdContent?: string;
  webhookPayload?: any;
  auditContext?: {
    userId?: string | null;
    employeeId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
}

export interface SyncExecutionResult {
  syncLogId: string;
  status: SyncStatus;
  totalRecords: number;
  importedRecords: number;
  ignoredRecords: number;
  unmappedRecords: number;
  errorCount: number;
  durationMs: number;
  message: string;
  errorDetails?: any;
}

export class TimeClockSyncService {
  /**
   * Gera o hash SHA-256 único para garantir idempotência matemática
   */
  static generateHash(registrationNumber: string, timestamp: Date, deviceId?: string | null): string {
    const cleanReg = String(registrationNumber).trim().replace(/^0+/, '');
    const isoTime = timestamp.toISOString();
    const dev = deviceId || 'NODEVICE';
    return crypto.createHash('sha256').update(`${cleanReg}_${isoTime}_${dev}`).digest('hex');
  }

  /**
   * Executa o processo completo de sincronização de ponto
   */
  static async executeSync(options: SyncExecutionOptions): Promise<SyncExecutionResult> {
    const startTime = Date.now();
    const startedAt = new Date();
    const integrationKey = options.integrationKey || 'control_id';
    const triggeredBy = options.triggeredBy || SyncTrigger.MANUAL_TRIGGER;

    // 1. Verifica se a integração existe e está HABILITADA
    const integration = await prisma.integrationConfig.findUnique({
      where: { key: integrationKey.toLowerCase() },
    });

    if (!integration) {
      const error: any = new Error(`Integração '${integrationKey}' não encontrada no sistema`);
      error.statusCode = 404;
      throw error;
    }

    if (!integration.enabled) {
      const error: any = new Error(
        `A integração '${integration.name}' está DESATIVADA. Ative-a no painel de integrações antes de sincronizar.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 2. Obtém o provedor registrado
    const provider = IntegrationRegistry.get(integration.key);
    if (!provider) {
      const error: any = new Error(`Provedor '${integration.key}' não possui implementação de driver registrada`);
      error.statusCode = 400;
      throw error;
    }

    // 3. Coleta os registros brutos (via Dispositivo, AFD ou Webhook)
    let rawPunches: RawPunchRecord[] = [];
    let targetDeviceId: string | null = options.deviceId || null;
    let targetDevice: any = null;

    try {
      if (options.afdContent) {
        // Modo Importação de Arquivo AFD
        if (!provider.parseAfdContent) {
          throw new Error(`O provedor '${provider.displayName}' não suporta importação de arquivo AFD`);
        }
        rawPunches = provider.parseAfdContent(options.afdContent);
      } else if (options.webhookPayload) {
        // Modo Recepção Push Webhook
        if (!provider.processWebhookPayload) {
          throw new Error(`O provedor '${provider.displayName}' não suporta recebimento de Webhook`);
        }
        const webhookRes = await provider.processWebhookPayload(options.webhookPayload);
        rawPunches = webhookRes.records;
      } else {
        // Modo Sincronização direta com dispositivo(s)
        if (targetDeviceId) {
          targetDevice = await prisma.timeClockDevice.findUnique({
            where: { id: targetDeviceId },
          });

          if (!targetDevice || targetDevice.deletedAt) {
            throw new Error('Dispositivo de ponto selecionado não encontrado');
          }
          if (!targetDevice.active) {
            throw new Error(`O relógio '${targetDevice.name}' está desativado`);
          }

          rawPunches = await provider.fetchPunches({
            deviceId: targetDevice.id,
            device: targetDevice,
            startDate: options.startDate,
            endDate: options.endDate,
            settings: integration.settings,
          });
        } else {
          // Busca todos os relógios ativos da integração
          const devices = await prisma.timeClockDevice.findMany({
            where: {
              integrationId: integration.id,
              active: true,
              deletedAt: null,
            },
          });

          for (const dev of devices) {
            const devPunches = await provider.fetchPunches({
              deviceId: dev.id,
              device: dev,
              startDate: options.startDate,
              endDate: options.endDate,
              settings: integration.settings,
            });
            // Associa o deviceId a cada marcação lida do coletor
            for (const p of devPunches) {
              rawPunches.push(p);
            }
          }
        }
      }
    } catch (fetchErr: any) {
      // Registra log com status de falha
      const finishedAt = new Date();
      const syncLog = await prisma.timeClockSyncLog.create({
        data: {
          integrationId: integration.id,
          deviceId: targetDeviceId,
          startedAt,
          finishedAt,
          totalRecords: 0,
          importedRecords: 0,
          ignoredRecords: 0,
          unmappedRecords: 0,
          errorCount: 1,
          status: SyncStatus.FAILED,
          errorDetails: { error: fetchErr.message || 'Erro de comunicação' },
          triggeredBy,
        },
      });

      return {
        syncLogId: syncLog.id,
        status: SyncStatus.FAILED,
        totalRecords: 0,
        importedRecords: 0,
        ignoredRecords: 0,
        unmappedRecords: 0,
        errorCount: 1,
        durationMs: Date.now() - startTime,
        message: fetchErr.message || 'Falha na coleta de marcações',
        errorDetails: { error: fetchErr.message },
      };
    }

    // 4. Se nenhuma marcação foi retornada
    if (rawPunches.length === 0) {
      const finishedAt = new Date();
      const syncLog = await prisma.timeClockSyncLog.create({
        data: {
          integrationId: integration.id,
          deviceId: targetDeviceId,
          startedAt,
          finishedAt,
          totalRecords: 0,
          importedRecords: 0,
          ignoredRecords: 0,
          unmappedRecords: 0,
          errorCount: 0,
          status: SyncStatus.SUCCESS,
          triggeredBy,
        },
      });

      // Atualiza lastSyncAt
      await prisma.integrationConfig.update({
        where: { id: integration.id },
        data: { lastSyncAt: finishedAt },
      });

      if (targetDeviceId) {
        await prisma.timeClockDevice.update({
          where: { id: targetDeviceId },
          data: { lastSyncAt: finishedAt },
        });
      }

      return {
        syncLogId: syncLog.id,
        status: SyncStatus.SUCCESS,
        totalRecords: 0,
        importedRecords: 0,
        ignoredRecords: 0,
        unmappedRecords: 0,
        errorCount: 0,
        durationMs: Date.now() - startTime,
        message: 'Sincronização concluída: nenhuma nova marcação encontrada no período.',
      };
    }

    // 5. Mapeia colaboradores no banco de dados para vincular as batidas
    // Carrega mapa de colaboradores ativos por matrícula / código / CPF limpo
    const allEmployees = await prisma.employee.findMany({
      where: { deletedAt: null },
      select: { id: true, registrationNumber: true, code: true, cpf: true },
    });

    const employeeMap = new Map<string, string>(); // Registration/Clean -> EmployeeId
    for (const emp of allEmployees) {
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

    // 6. Calcula os hashes e busca duplicados existentes no banco
    const calculatedEntries = rawPunches.map((punch) => {
      const reg = String(punch.registrationNumber).trim();
      const cleanReg = reg.replace(/^0+/, '');
      const hash = this.generateHash(reg, punch.timestamp, targetDeviceId);
      const employeeId = employeeMap.get(reg) || employeeMap.get(cleanReg) || null;

      return {
        hash,
        registrationNumber: reg,
        timestamp: punch.timestamp,
        deviceId: targetDeviceId,
        source: punch.source || TimeClockSource.CONTROL_ID_API,
        nsr: punch.nsr ? BigInt(punch.nsr.toString()) : null,
        rawPayload: punch.rawPayload ? (punch.rawPayload as any) : undefined,
        employeeId,
      };
    });

    const allHashes = calculatedEntries.map((e) => e.hash);

    // Consulta quais hashes já estão gravados no banco (em lotes de 2.000 para performance e limites de parâmetros)
    const existingHashSet = new Set<string>();
    const HASH_CHUNK_SIZE = 2000;
    for (let i = 0; i < allHashes.length; i += HASH_CHUNK_SIZE) {
      const hashChunk = allHashes.slice(i, i + HASH_CHUNK_SIZE);
      const existingEntries = await prisma.timeClockEntry.findMany({
        where: { hash: { in: hashChunk } },
        select: { hash: true },
      });
      for (const e of existingEntries) {
        existingHashSet.add(e.hash);
      }
    }

    // Filtra apenas registros inéditos para inserção
    const toInsert = calculatedEntries.filter((e) => !existingHashSet.has(e.hash));

    let unmappedRecords = 0;
    for (const entry of toInsert) {
      if (!entry.employeeId) {
        unmappedRecords++;
      }
    }

    const importedRecords = toInsert.length;
    const ignoredRecords = rawPunches.length - importedRecords;

    // 7. Insere as novas marcações no banco em lotes seguros de 1.000 registros
    if (toInsert.length > 0) {
      const INSERT_CHUNK_SIZE = 1000;
      for (let i = 0; i < toInsert.length; i += INSERT_CHUNK_SIZE) {
        const insertChunk = toInsert.slice(i, i + INSERT_CHUNK_SIZE);
        await prisma.timeClockEntry.createMany({
          data: insertChunk,
          skipDuplicates: true,
        });
      }
    }

    const finishedAt = new Date();
    const finalStatus =
      unmappedRecords > 0 && importedRecords > 0
        ? SyncStatus.PARTIAL_SUCCESS
        : SyncStatus.SUCCESS;

    const errorDetails = unmappedRecords > 0
      ? { unmappedNotice: `${unmappedRecords} marcações foram salvas sem vínculo de colaborador (matrícula não encontrada).` }
      : undefined;

    // 8. Grava o registro em TimeClockSyncLog
    const syncLog = await prisma.timeClockSyncLog.create({
      data: {
        integrationId: integration.id,
        deviceId: targetDeviceId,
        startedAt,
        finishedAt,
        totalRecords: rawPunches.length,
        importedRecords,
        ignoredRecords,
        unmappedRecords,
        errorCount: 0,
        status: finalStatus,
        errorDetails: errorDetails || undefined,
        triggeredBy,
      },
    });

    // 9. Atualiza data da última sincronização
    await prisma.integrationConfig.update({
      where: { id: integration.id },
      data: { lastSyncAt: finishedAt },
    });

    if (targetDeviceId) {
      await prisma.timeClockDevice.update({
        where: { id: targetDeviceId },
        data: { lastSyncAt: finishedAt },
      });
    }

    // 10. Grava trilha de auditoria
    await AuditService.log({
      userId: options.auditContext?.userId,
      employeeId: options.auditContext?.employeeId,
      action: 'SYNC_TIME_CLOCK_ENTRIES',
      entity: 'TimeClockSyncLog',
      recordId: syncLog.id,
      newValue: {
        integration: integration.key,
        totalRecords: rawPunches.length,
        importedRecords,
        ignoredRecords,
        unmappedRecords,
        status: finalStatus,
        triggeredBy,
      },
      ipAddress: options.auditContext?.ipAddress,
      userAgent: options.auditContext?.userAgent,
    });

    return {
      syncLogId: syncLog.id,
      status: finalStatus,
      totalRecords: rawPunches.length,
      importedRecords,
      ignoredRecords,
      unmappedRecords,
      errorCount: 0,
      durationMs: Date.now() - startTime,
      message: `Sincronização concluída com sucesso: ${importedRecords} importadas, ${ignoredRecords} duplicadas ignoradas.`,
      errorDetails,
    };
  }
}
