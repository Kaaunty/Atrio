export interface RhidLoginCredentials {
  email: string;
  password: string;
  domain?: string;
}

export interface RhidLoginResult {
  accessToken: string;
  customerDomain?: string;
  customerId?: string;
  name?: string;
  email?: string;
  maxUsers?: string | number;
  expiredPassword?: boolean;
  customerBlocked?: boolean;
  revendaInadimplente?: boolean;
}

export interface RhidPersonDTO {
  id?: number;
  name: string;
  cpf?: number | string | null;
  pis?: number | string | null;
  registration?: string | null;
  idCompany?: number | null;
  idDepartment?: number | null;
  rfid?: number | null;
  barCode?: number | null;
  code?: number | null;
  password?: number | null;
  isAdmin?: boolean;
  numberOfTemplates?: number;
  status?: number; // 0 = ativo
  linkedDeviceIds?: number[];
  templates?: string[];
  socialName?: string | null;
  photo?: string | null;
}

export interface RhidTestConnectionResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  data?: {
    customerDomain?: string;
    customerId?: string;
    operatorName?: string;
    operatorEmail?: string;
    maxUsers?: number | string;
    totalEmployeesInRhid?: number;
    connectedDevicesCount?: number;
  };
  error?: string;
}

export class RhidClient {
  private static readonly BASE_URL = 'https://www.rhid.com.br/v2/api.svc';

  /**
   * Executa autenticação na API do RHiD e retorna token JWT
   */
  static async login(credentials: RhidLoginCredentials): Promise<RhidLoginResult> {
    const { email, password, domain } = credentials;

    if (!email || !password) {
      throw new Error('E-mail e senha são obrigatórios para autenticação no RHiD.');
    }

    const payload: any = { email, password };
    if (domain) {
      payload.domain = domain;
    }

    const response = await fetch(`${this.BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let parsedError = errorText;
      try {
        const json = JSON.parse(errorText);
        parsedError = json.error || json.message || errorText;
      } catch {}
      throw new Error(`Falha na autenticação RHiD (${response.status}): ${parsedError}`);
    }

    const data: any = await response.json();

    if (!data.accessToken) {
      throw new Error(data.error || 'RHiD não retornou token de acesso válido.');
    }

    // Decodifica payload JWT para extrair metadados do cliente
    let customerDomain = '';
    let customerId = '';
    let operatorName = '';
    let maxUsers: any = null;

    try {
      const parts = data.accessToken.split('.');
      if (parts.length >= 2) {
        const tokenPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        customerDomain = tokenPayload.cidCustomerDomain || '';
        customerId = tokenPayload.cidCustomerId || '';
        operatorName = tokenPayload.name || '';
        maxUsers = tokenPayload.maxUsers || null;
      }
    } catch {}

    return {
      accessToken: data.accessToken,
      customerDomain,
      customerId,
      name: operatorName,
      email,
      maxUsers,
      expiredPassword: data.expiredPassword,
      customerBlocked: data.customerBlocked,
      revendaInadimplente: data.revendaInadimplente,
    };
  }

  /**
   * Testa a conectividade com a API RHiD e valida credenciais
   */
  static async testConnection(credentials: RhidLoginCredentials): Promise<RhidTestConnectionResult> {
    const startTime = Date.now();
    try {
      const loginResult = await this.login(credentials);
      const latencyMs = Date.now() - startTime;

      // Obtém contagem de pessoas cadastradas para diagnóstico completo
      let totalPersons = 0;
      try {
        const persons = await this.listPersons(loginResult.accessToken);
        totalPersons = persons.length;
      } catch {}

      return {
        success: true,
        message: `Conexão com RHiD Cloud estabelecida com sucesso em ${latencyMs}ms.`,
        latencyMs,
        data: {
          customerDomain: loginResult.customerDomain,
          customerId: loginResult.customerId,
          operatorName: loginResult.name,
          operatorEmail: credentials.email,
          maxUsers: loginResult.maxUsers,
          totalEmployeesInRhid: totalPersons,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Erro ao conectar com RHiD Cloud',
        latencyMs: Date.now() - startTime,
        error: err.message,
      };
    }
  }

  /**
   * Lista todos os relógios / dispositivos cadastrados no RHiD
   */
  static async listDevices(accessToken: string): Promise<any[]> {
    const res = await fetch(`${this.BASE_URL.replace('/api.svc', '')}/customerdb/device.svc/a`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Falha ao listar relógios do RHiD: HTTP ${res.status}`);
    }

    const json: any = await res.json();
    return json.data || [];
  }

  /**
   * Lista todos os colaboradores cadastrados no RHiD
   */
  static async listPersons(accessToken: string): Promise<RhidPersonDTO[]> {
    const response = await fetch(`${this.BASE_URL}/person`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao listar colaboradores no RHiD (${response.status}): ${errText.substring(0, 100)}`);
    }

    const data: any = await response.json();
    return data.records || [];
  }

  /**
   * Obtém detalhes de um colaborador específico no RHiD
   */
  static async getPerson(accessToken: string, personId: number, getPicture = false): Promise<RhidPersonDTO> {
    const url = new URL(`${this.BASE_URL}/person/${personId}`);
    if (getPicture) {
      url.searchParams.set('getpicture', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Falha ao buscar colaborador ${personId} no RHiD (${response.status})`);
    }

    return (await response.json()) as RhidPersonDTO;
  }

  /**
   * Cria um novo colaborador no RHiD
   */
  static async createPerson(accessToken: string, person: RhidPersonDTO): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/person`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify([person]), // RHiD espera array de colaboradores
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao cadastrar colaborador no RHiD (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Atualiza os dados de um colaborador no RHiD
   */
  static async updatePerson(accessToken: string, person: RhidPersonDTO): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/person`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(person),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao atualizar colaborador no RHiD (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Atualização parcial (PATCH) de colaborador no RHiD (ex: inativar ou alterar status)
   */
  static async patchPerson(accessToken: string, person: Partial<RhidPersonDTO> & { id: number }): Promise<any> {
    const response = await fetch(`${this.BASE_URL}/person`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(person),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Falha ao alterar status do colaborador no RHiD (${response.status}): ${errText}`);
    }

    return await response.json();
  }

  /**
   * Obtém marcações de ponto (AFD) registradas na nuvem do RHiD
   */
  static async fetchAfdPunches(accessToken: string, options?: { start?: number; length?: number }): Promise<any[]> {
    const length = options?.length || 20000;
    const baseUrl = `${this.BASE_URL.replace('/api.svc', '')}/customerdb/afd.svc/a`;

    let start = options?.start;
    if (start === undefined) {
      // 1. Consulta metadados para obter total de registros no banco do RHiD
      const metaRes = await fetch(`${baseUrl}?draw=1&start=0&length=1`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (metaRes.ok) {
        const metaJson: any = await metaRes.json();
        const total = metaJson.recordsFiltered || metaJson.recordsInDB || 0;
        start = Math.max(0, total - length);
      } else {
        start = 0;
      }
    }

    const url = `${baseUrl}?draw=1&start=${start}&length=${length}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Falha ao consultar batidas de ponto no RHiD: HTTP ${res.status}`);
    }

    const json: any = await res.json();
    return json.data || [];
  }
}
