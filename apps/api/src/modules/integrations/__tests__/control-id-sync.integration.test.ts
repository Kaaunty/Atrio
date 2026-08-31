import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { IntegrationService } from '../services/integration.service.js';
import { TimeClockDeviceService } from '../services/time-clock-device.service.js';
import { TimeClockSyncService } from '../services/time-clock-sync.service.js';
import { TimeClockEntryService } from '../services/time-clock-entry.service.js';

describe('Control iD Integration & Idempotent Sync Flow', () => {
  let testCompanyId: string;
  let testUnitId: string;
  let testEmp1Id: string;
  let testEmp2Id: string;
  let testDeviceId: string;

  before(async () => {
    // Garante integrações semeadas
    await IntegrationService.ensureDefaultIntegrations();
    await IntegrationService.toggle('control_id', true);

    // 1. Cria empresa e unidade de teste
    const company = await prisma.company.create({
      data: {
        legalName: 'Atrio Ponto Testes S.A.',
        tradeName: 'Atrio Ponto Teste',
        cnpj: '78.910.111/0001-22',
      },
    });
    testCompanyId = company.id;

    const unit = await prisma.unit.create({
      data: {
        companyId: testCompanyId,
        name: 'Matriz - São Paulo',
        city: 'São Paulo',
        state: 'SP',
      },
    });
    testUnitId = unit.id;

    // 2. Cadastra 2 colaboradores com matrículas conhecidas
    const emp1 = await prisma.employee.create({
      data: {
        name: 'Lucas Operador Ponto',
        cpf: '111.222.333-44',
        email: 'lucas.ponto@empresa.com.br',
        registrationNumber: 'MAT-1001',
        companyId: testCompanyId,
        unitId: testUnitId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    testEmp1Id = emp1.id;

    const emp2 = await prisma.employee.create({
      data: {
        name: 'Beatriz Analista',
        cpf: '555.666.777-88',
        email: 'beatriz.analista@empresa.com.br',
        registrationNumber: 'MAT-1002',
        companyId: testCompanyId,
        unitId: testUnitId,
        admissionDate: new Date('2024-01-01'),
      },
    });
    testEmp2Id = emp2.id;

    // 3. Cadastra dispositivo de ponto
    const device = await TimeClockDeviceService.create({
      name: 'Relógio Portaria Principal',
      serialNumber: 'CID-REP-998877',
      model: 'iDClass REP-C',
      ipAddress: '192.168.1.200',
      port: 80,
      unitId: testUnitId,
      integrationKey: 'control_id',
      active: true,
    });
    testDeviceId = device.id;
  });

  after(async () => {
    // Limpeza de testes
    if (testCompanyId) {
      await prisma.timeClockSyncLog.deleteMany({
        where: { deviceId: testDeviceId },
      });
      await prisma.timeClockEntry.deleteMany({
        where: {
          OR: [
            { employeeId: testEmp1Id },
            { employeeId: testEmp2Id },
            { deviceId: testDeviceId },
            { registrationNumber: 'MAT-UNKNOWN-999' },
          ],
        },
      });
      await prisma.timeClockDevice.deleteMany({
        where: { id: testDeviceId },
      });
      await prisma.employee.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prisma.unit.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prisma.company.delete({
        where: { id: testCompanyId },
      });
    }
  });

  it('deve testar a comunicação com o dispositivo Control iD cadastrado e reportar diagnóstico real de rede', async () => {
    const conn = await TimeClockDeviceService.testConnection(testDeviceId);
    assert.equal(conn.success, false);
    assert.equal(conn.details?.status, 'OFFLINE / INACESSÍVEL');
    assert.ok(conn.details?.diagnostics);
  });

  it('deve sincronizar marcações brutas de ponto, associar a colaboradores e garantir IDEMPOTÊNCIA', async () => {
    const punchDate = new Date('2024-06-10T08:00:00.000Z');
    const punchDateOut = new Date('2024-06-10T12:00:00.000Z');

    // Simula credenciais / batidas no dispositivo de teste
    await prisma.timeClockDevice.update({
      where: { id: testDeviceId },
      data: {
        authCredentials: {
          mockRecords: [
            { nsr: 501, registrationNumber: 'MAT-1001', timestamp: punchDate },
            { nsr: 502, registrationNumber: 'MAT-1002', timestamp: punchDate },
            { nsr: 503, registrationNumber: 'MAT-1001', timestamp: punchDateOut },
          ],
        },
      },
    });

    // 1ª Execução do Sync
    const sync1 = await TimeClockSyncService.executeSync({
      integrationKey: 'control_id',
      deviceId: testDeviceId,
    });

    assert.equal(sync1.status, 'SUCCESS');
    assert.equal(sync1.totalRecords, 3);
    assert.equal(sync1.importedRecords, 3);
    assert.equal(sync1.ignoredRecords, 0);

    // Verifica se as batidas foram salvas no banco
    const entriesEmp1 = await prisma.timeClockEntry.findMany({
      where: { employeeId: testEmp1Id },
    });
    assert.equal(entriesEmp1.length, 2);

    const entriesEmp2 = await prisma.timeClockEntry.findMany({
      where: { employeeId: testEmp2Id },
    });
    assert.equal(entriesEmp2.length, 1);

    // 2ª Execução do Sync com OS MESMOS DADOS -> IDEMPOTÊNCIA
    const sync2 = await TimeClockSyncService.executeSync({
      integrationKey: 'control_id',
      deviceId: testDeviceId,
    });

    assert.equal(sync2.status, 'SUCCESS');
    assert.equal(sync2.totalRecords, 3);
    assert.equal(sync2.importedRecords, 0); // 0 novas inserções
    assert.equal(sync2.ignoredRecords, 3); // Todas 3 foram ignoradas por idempotência de hash

    // Quantidade no banco de dados deve permanecer exatamente a mesma
    const totalEntriesAfter = await prisma.timeClockEntry.count({
      where: { deviceId: testDeviceId },
    });
    assert.equal(totalEntriesAfter, 3);
  });

  it('deve salvar marcação de colaborador não mapeado sem quebrar o sync', async () => {
    const unmappedDate = new Date('2024-06-11T09:00:00.000Z');

    await prisma.timeClockDevice.update({
      where: { id: testDeviceId },
      data: {
        authCredentials: {
          mockRecords: [
            { nsr: 601, registrationNumber: 'MAT-UNKNOWN-999', timestamp: unmappedDate },
          ],
        },
      },
    });

    const syncUnmapped = await TimeClockSyncService.executeSync({
      integrationKey: 'control_id',
      deviceId: testDeviceId,
    });

    assert.equal(syncUnmapped.status, 'PARTIAL_SUCCESS');
    assert.equal(syncUnmapped.totalRecords, 1);
    assert.equal(syncUnmapped.importedRecords, 1);
    assert.equal(syncUnmapped.unmappedRecords, 1);

    // Verifica que o registro existe com employeeId nulo
    const rawEntry = await prisma.timeClockEntry.findFirst({
      where: { registrationNumber: 'MAT-UNKNOWN-999' },
    });
    assert.ok(rawEntry);
    assert.equal(rawEntry?.employeeId, null);
  });

  it('deve processar upload de arquivo AFD e listar na consulta paginada', async () => {
    const afdContent = `00000000011178910111000122000000000000ATRIO PONTO TESTES                                                                                                                    000000000000000010106202430062024010620240800
0000007013150620240800MAT-1001
0000007023150620241700MAT-1001`;

    const afdSync = await TimeClockSyncService.executeSync({
      integrationKey: 'control_id',
      deviceId: testDeviceId,
      afdContent,
    });

    assert.equal(afdSync.totalRecords, 2);
    assert.equal(afdSync.importedRecords, 2);

    // Consulta registros via TimeClockEntryService
    const list = await TimeClockEntryService.list({
      employeeId: testEmp1Id,
    });
    assert.ok(list.items.length >= 2);
  });
});
