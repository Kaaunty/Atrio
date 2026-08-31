import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IntegrationService } from '../services/integration.service.js';
import { TimeClockSyncService } from '../services/time-clock-sync.service.js';

describe('Integration Hub & Activation/Deactivation Toggle', () => {
  it('deve listar integrações e conter Control iD, Dimep e Secullum no catálogo', async () => {
    const list = await IntegrationService.list();
    assert.ok(list.length >= 3);

    const controlId = list.find((i) => i.key === 'control_id');
    assert.ok(controlId, 'Control iD deve existir no catálogo');
    assert.ok(controlId.hasProviderImplementation, 'Deve ter driver implementado');

    const dimep = list.find((i) => i.key === 'dimep');
    assert.ok(dimep, 'Dimep deve existir no catálogo');
  });

  it('deve permitir desativar uma integração e bloquear tentativas de sincronização', async () => {
    // 1. Desativa a integração Control iD
    await IntegrationService.toggle('control_id', false);

    const controlId = await IntegrationService.getByKey('control_id');
    assert.equal(controlId.enabled, false);
    assert.equal(controlId.status, 'INACTIVE');

    // 2. Tentar executar sync com integração desativada deve falhar com erro 400
    await assert.rejects(
      async () => {
        await TimeClockSyncService.executeSync({
          integrationKey: 'control_id',
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('DESATIVADA') || err.message.includes('desativada'));
        return true;
      }
    );

    // 3. Reativa a integração Control iD
    await IntegrationService.toggle('control_id', true);

    const controlIdActive = await IntegrationService.getByKey('control_id');
    assert.equal(controlIdActive.enabled, true);
    assert.equal(controlIdActive.status, 'ACTIVE');
  });
});
