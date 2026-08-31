import { prisma } from '../../../database/prisma.js';
import { SyncTrigger } from '@prisma/client';
import { TimeClockSyncService } from './time-clock-sync.service.js';

export class SyncSchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Inicia o agendador periódico de sincronização de ponto
   */
  static start(intervalMs: number = 15 * 60 * 1000): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(async () => {
      await this.runScheduledSync();
    }, intervalMs);

    console.log(`⏱️  Agendador de sincronização de ponto ativado (intervalo: ${intervalMs / 1000}s)`);
  }

  /**
   * Para o agendador
   */
  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Executa a sincronização para todas as integrações e relógios habilitados
   */
  static async runScheduledSync(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const activeConfigs = await prisma.integrationConfig.findMany({
        where: { enabled: true },
      });

      for (const cfg of activeConfigs) {
        const autoSync = (cfg.settings as any)?.autoSync ?? true;
        if (autoSync) {
          try {
            await TimeClockSyncService.executeSync({
              integrationKey: cfg.key,
              triggeredBy: SyncTrigger.CRON_SCHEDULE,
            });
          } catch (err: any) {
            console.error(`⚠️ Erro no sync agendado da integração '${cfg.key}':`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Falha geral no agendador de sincronização:', err);
    } finally {
      this.isRunning = false;
    }
  }
}
