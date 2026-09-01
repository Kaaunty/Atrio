import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RhidClient } from '../providers/control-id/rhid.client.js';
import { RhidService } from '../services/rhid.service.js';

describe('RHiD Cloud Integration & Sync Tests', () => {
  it('deve validar credenciais obrigatórias ao testar conexão', async () => {
    const result = await RhidClient.testConnection({ email: '', password: '' });
    assert.equal(result.success, false);
    assert.match(result.message, /obrigatórios/i);
  });

  it('deve formatar layout de exportação CSV do RHiD corretamente', async () => {
    const csv = await RhidService.exportCsv();
    assert.ok(csv.startsWith('Nome;CPF;PIS;Matrícula;Código Crachá;Departamento;Empresa;Status'));
  });
});
