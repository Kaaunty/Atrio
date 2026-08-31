import { TimeClockSource, SyncStatus, SyncTrigger } from '@prisma/client';

export interface RawPunchRecord {
  nsr?: bigint | number | string | null;
  registrationNumber: string; // PIS ou Matrícula lida no relógio
  timestamp: Date;
  rawPayload?: any;
  source?: TimeClockSource;
}

export interface TestConnectionOptions {
  ipAddress?: string | null;
  port?: number | null;
  serialNumber?: string | null;
  model?: string | null;
  authCredentials?: any;
  apiEndpoint?: string | null;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  details?: {
    firmwareVersion?: string;
    model?: string;
    serialNumber?: string;
    dateTime?: string;
    totalRecords?: number;
    [key: string]: any;
  };
}

export interface FetchPunchesOptions {
  deviceId?: string;
  device?: {
    id: string;
    name: string;
    serialNumber: string;
    ipAddress?: string | null;
    port?: number | null;
    model: string;
    authCredentials?: any;
    apiEndpoint?: string | null;
    lastSyncAt?: Date | null;
  };
  startDate?: Date;
  endDate?: Date;
  settings?: any;
}

export interface ITimeClockProvider {
  readonly providerKey: string;
  readonly displayName: string;
  readonly defaultCategory: string;

  /**
   * Testa a comunicação com um relógio específico ou API central do provedor
   */
  testConnection(options: TestConnectionOptions): Promise<TestConnectionResult>;

  /**
   * Busca as marcações de ponto do dispositivo ou nuvem
   */
  fetchPunches(options: FetchPunchesOptions): Promise<RawPunchRecord[]>;

  /**
   * Faz o parse de arquivo AFD (Arquivo de Fonte de Dados - Portaria 1510/671)
   */
  parseAfdContent?(content: string): RawPunchRecord[];

  /**
   * Processa webhook push recebido diretamente do relógio ou nuvem
   */
  processWebhookPayload?(payload: any, headers?: any): Promise<{
    success: boolean;
    records: RawPunchRecord[];
    message?: string;
  }>;
}
