import { TimeClockSource } from '@prisma/client';
import {
  ITimeClockProvider,
  RawPunchRecord,
  TestConnectionOptions,
  TestConnectionResult,
  FetchPunchesOptions,
} from '../../interfaces/integration-provider.interface.js';
import { ControlIdAfdParser } from '../control-id/control-id.afd-parser.js';

export class SecullumProvider implements ITimeClockProvider {
  readonly providerKey = 'secullum';
  readonly displayName = 'Secullum (Ponto Web / Ponto Secullum 4)';
  readonly defaultCategory = 'TIME_CLOCK';

  async testConnection(options: TestConnectionOptions): Promise<TestConnectionResult> {
    if (!options.apiEndpoint && !options.authCredentials?.token) {
      return {
        success: false,
        message: 'Endpoint da API ou Token Secullum Web não informado.',
      };
    }
    return {
      success: false,
      message: 'A comunicação Secullum ainda não possui um provedor operacional configurado.',
    };
  }

  async fetchPunches(_options: FetchPunchesOptions): Promise<RawPunchRecord[]> {
    throw new Error('A busca de marcações Secullum ainda não está implementada.');
  }

  parseAfdContent(content: string): RawPunchRecord[] {
    const result = ControlIdAfdParser.parse(content);
    return result.records.map((r) => ({
      ...r,
      source: TimeClockSource.SECULLUM,
    }));
  }
}
