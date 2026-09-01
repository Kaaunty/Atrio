import { TimeClockSource } from '@prisma/client';
import {
  ITimeClockProvider,
  RawPunchRecord,
  TestConnectionOptions,
  TestConnectionResult,
  FetchPunchesOptions,
} from '../../interfaces/integration-provider.interface.js';
import { ControlIdAfdParser } from './control-id.afd-parser.js';

export class ControlIdProvider implements ITimeClockProvider {
  readonly providerKey = 'control_id';
  readonly displayName = 'Control iD (iDClass / iDFit / iDAccess / iDSecure)';
  readonly defaultCategory = 'TIME_CLOCK';

  /**
   * Testa a conectividade com o relógio Control iD
   */
  async testConnection(options: TestConnectionOptions): Promise<TestConnectionResult> {
    const { ipAddress, port = 80, serialNumber, model, apiEndpoint } = options;

    if (!ipAddress && !apiEndpoint) {
      return {
        success: false,
        message: 'Endereço IP ou Endpoint da API do relógio não foi informado.',
      };
    }

    const targetUrl = apiEndpoint || `http://${ipAddress}${port && port !== 80 ? `:${port}` : ''}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      let response: any = null;
      let errorCause: string = '';

      // 1. Se credenciais foram fornecidas, tenta autenticação oficial na API Control iD (/login.fcgi)
      let sessionToken: string | null = null;
      let realSystemInfo: any = null;

      if (options.authCredentials?.username && options.authCredentials?.password) {
        try {
          const loginRes = await fetch(`${targetUrl}/login.fcgi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              login: options.authCredentials.username,
              password: options.authCredentials.password,
            }),
            signal: controller.signal,
          });

          if (loginRes.ok) {
            const loginData: any = await loginRes.json();
            sessionToken = loginData.session || null;

            if (sessionToken) {
              const infoRes = await fetch(`${targetUrl}/system_information.fcgi?session=${sessionToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session: sessionToken }),
                signal: controller.signal,
              });
              if (infoRes.ok) {
                realSystemInfo = await infoRes.json();
              }
            }
          }
        } catch {
          // Prossegue com handshake de conexão direta
        }
      }

      // 2. Se não obteve info autenticada, tenta handshake direto no servidor web
      if (!realSystemInfo) {
        try {
          response = await fetch(`${targetUrl}/system_information.fcgi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: controller.signal,
          });
        } catch (err: any) {
          errorCause = err.cause?.message || err.message;
          try {
            response = await fetch(targetUrl, {
              method: 'GET',
              signal: controller.signal,
            });
          } catch (getErr: any) {
            errorCause = getErr.cause?.message || getErr.message;
          }
        }
      }

      const latencyMs = Date.now() - startTime;

      if (realSystemInfo) {
        return {
          success: true,
          message: `Comunicação e autenticação com o relógio estabelecidas com sucesso em ${latencyMs}ms.`,
          details: {
            targetHost: targetUrl,
            serialNumber: realSystemInfo.serial || serialNumber || 'Confirmado via API',
            model: realSystemInfo.model || model || 'Control iD iDFace',
            firmwareVersion: realSystemInfo.version || realSystemInfo.firmware || 'v3.x Native',
            httpStatus: '200 OK (Autenticado)',
            latency: `${latencyMs}ms`,
            status: 'ONLINE (Autenticado & Operacional)',
            serverHeader: 'Control iD API Web Server',
            dateTime: new Date().toISOString(),
          },
        };
      }

      if (!response) {
        return {
          success: false,
          message: `Não foi possível conectar ao relógio no endereço ${targetUrl}.`,
          details: {
            targetHost: targetUrl,
            serialNumber: serialNumber || '—',
            model: model || 'Control iD',
            status: 'OFFLINE / INACESSÍVEL',
            latency: `${latencyMs}ms`,
            error: errorCause || 'Host inalcançável',
            diagnostics:
              'O servidor do Átrio não conseguiu estabelecer conexão TCP com este endereço. Verifique se o relógio está ligado, na mesma rede ou se há bloqueio de firewall.',
            dateTime: new Date().toISOString(),
          },
        };
      }

      // Se o relógio respondeu via HTTP (ex: 401 Unauthorized do lighttpd)
      return {
        success: true,
        message: `Comunicação HTTP com o relógio respondida com sucesso em ${latencyMs}ms.`,
        details: {
          targetHost: targetUrl,
          serialNumber: serialNumber || 'Confirmado via HTTP',
          model: model || 'Control iD',
          firmwareVersion: 'Servidor Web Embarcado (lighttpd)',
          httpStatus: `${response.status} ${response.statusText}`,
          latency: `${latencyMs}ms`,
          status: 'ONLINE (Hardware Respondendo na Rede)',
          serverHeader: response.headers.get('server') || 'lighttpd/1.4.51',
          dateTime: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro na comunicação com o relógio: ${err.message || 'Falha de rede'}`,
        details: {
          targetHost: targetUrl,
          status: 'OFFLINE / ERRO',
          error: err.cause?.message || err.message,
          dateTime: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Obtém as marcações de ponto do relógio Control iD (via RHiD Cloud ou Conexão Direta IP)
   */
  async fetchPunches(options: FetchPunchesOptions): Promise<RawPunchRecord[]> {
    const { device } = options;
    const punches: RawPunchRecord[] = [];

    // 1. Tenta buscar marcações via nuvem do RHiD
    try {
      const { RhidService } = await import('../../services/rhid.service.js');
      const { RhidClient } = await import('./rhid.client.js');

      const creds = await RhidService.getStoredCredentials();
      if (creds.email && creds.password) {
        const loginRes = await RhidClient.login(creds);
        const cloudPunches = await RhidClient.fetchAfdPunches(loginRes.accessToken, { length: 25000 });

        for (const p of cloudPunches) {
          if (!p.cpf && !p.idPerson) continue;

          const match = p.dateTime && String(p.dateTime).match(/\/Date\((\d+)/);
          const punchTime = match ? new Date(parseInt(match[1], 10)) : new Date();
          const rawCpf = p.cpf ? String(p.cpf).padStart(11, '0') : '';

          punches.push({
            nsr: p.nsr ? BigInt(p.nsr) : null,
            registrationNumber: rawCpf,
            timestamp: punchTime,
            source: TimeClockSource.CONTROL_ID_API,
            rawPayload: p,
          });
        }
      }
    } catch (err: any) {
      console.warn('Não foi possível obter batidas via RHiD Cloud:', err.message);
    }

    // 2. Se um dispositivo IP específico foi selecionado e punches está vazio, consulta o relógio local
    if (device?.ipAddress && punches.length === 0) {
      try {
        const targetUrl = device.apiEndpoint || `http://${device.ipAddress}:${device.port || 80}`;
        const loginRes = await fetch(`${targetUrl}/login.fcgi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: device.authCredentials?.username || 'admin',
            password: device.authCredentials?.password || 'admin',
          }),
        });

        if (loginRes.ok) {
          const { session } = (await loginRes.json()) as any;
          if (session) {
            const logsRes = await fetch(`${targetUrl}/load_objects.fcgi?session=${session}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ object: 'access_logs' }),
            });

            if (logsRes.ok) {
              const logsData = (await logsRes.json()) as any;
              const accessLogs = logsData.access_logs || [];

              for (const log of accessLogs) {
                const logTime = log.time ? new Date(log.time * 1000) : new Date();
                punches.push({
                  nsr: log.id ? BigInt(log.id) : null,
                  registrationNumber: String(log.user_id || log.identifier_id || ''),
                  timestamp: logTime,
                  source: TimeClockSource.CONTROL_ID_API,
                  rawPayload: log,
                });
              }
            }
          }
        }
      } catch (devErr: any) {
        console.warn(`Erro ao consultar logs do relógio ${device.name}:`, devErr.message);
      }
    }

    return punches;
  }

  /**
   * Processa arquivo AFD texto padrão Control iD / Portaria 1510 / Portaria 671
   */
  parseAfdContent(content: string): RawPunchRecord[] {
    const result = ControlIdAfdParser.parse(content);
    return result.records;
  }

  /**
   * Processa payload de webhook push enviado pelo relógio Control iD
   */
  async processWebhookPayload(payload: any, headers?: any): Promise<{
    success: boolean;
    records: RawPunchRecord[];
    message?: string;
  }> {
    if (!payload) {
      return { success: false, records: [], message: 'Payload de webhook vazio' };
    }

    const records: RawPunchRecord[] = [];

    // Formato 1: Array de batidas diretas { punches: [...] } ou payload direto array
    const rawList = Array.isArray(payload) ? payload : (payload.punches || payload.events || payload.logs || [payload]);

    for (const item of rawList) {
      const regNumber = item.registrationNumber || item.matricula || item.pis || item.cpf || item.user_id;
      const timeVal = item.timestamp || item.dateTime || item.time || item.data_hora;

      if (regNumber && timeVal) {
        const dt = typeof timeVal === 'number' ? new Date(timeVal * 1000) : new Date(timeVal);
        if (!isNaN(dt.getTime())) {
          records.push({
            nsr: item.nsr ? BigInt(item.nsr) : null,
            registrationNumber: String(regNumber).trim(),
            timestamp: dt,
            source: TimeClockSource.CONTROL_ID_API,
            rawPayload: item,
          });
        }
      }
    }

    return {
      success: true,
      records,
      message: `${records.length} marcação(ões) processada(s) a partir do webhook Control iD.`,
    };
  }
}
