import { TimeClockSource } from '@prisma/client';
import {
  ITimeClockProvider,
  RawPunchRecord,
  TestConnectionOptions,
  TestConnectionResult,
  FetchPunchesOptions,
} from '../../interfaces/integration-provider.interface.js';
import { ControlIdAfdParser } from '../control-id/control-id.afd-parser.js';

export class DimepProvider implements ITimeClockProvider {
  readonly providerKey = 'dimep';
  readonly displayName = 'Dimep (PrintPoint III / Kairos / MiniPrint)';
  readonly defaultCategory = 'TIME_CLOCK';

  async testConnection(options: TestConnectionOptions): Promise<TestConnectionResult> {
    if (!options.ipAddress && !options.apiEndpoint) {
      return {
        success: false,
        message: 'Endereço IP ou Endpoint da API Dimep não informado.',
      };
    }
    return {
      success: true,
      message: 'Comunicação com o relógio Dimep simulada com sucesso.',
      details: {
        model: 'Dimep PrintPoint III',
        status: 'ONLINE',
      },
    };
  }

  async fetchPunches(options: FetchPunchesOptions): Promise<RawPunchRecord[]> {
    return [];
  }

  parseAfdContent(content: string): RawPunchRecord[] {
    const result = ControlIdAfdParser.parse(content);
    return result.records.map((r) => ({
      ...r,
      source: TimeClockSource.DIMEP,
    }));
  }
}
