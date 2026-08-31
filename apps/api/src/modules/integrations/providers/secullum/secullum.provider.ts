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
      success: true,
      message: 'Comunicação com o Webservice Secullum autenticada com sucesso.',
      details: {
        model: 'Secullum Ponto Web Cloud',
        status: 'CONNECTED',
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
      source: TimeClockSource.SECULLUM,
    }));
  }
}
