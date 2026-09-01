import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ControlIdAfdParser } from '../providers/control-id/control-id.afd-parser.js';

describe('Control iD AFD Parser (Portarias 1510 & 671)', () => {
  it('deve parsear cabeçalho e marcações tipo 3 de arquivo AFD padrão Portaria 1510', () => {
    // Exemplo real de arquivo AFD:
    // Linha 1: 000000000 1 1 12345678000199 000000000000 ATRIO TECNOLOGIA LTDA 00000000000000001 01062024 30062024 010620240800
    // Linha 2 (Tipo 3): 000000001 3 01062024 0800 000123456789 (NSR=1, Tipo=3, Data=01/06/2024, Hora=08:00, PIS=123456789)
    // Linha 3 (Tipo 3): 000000002 3 01062024 1200 000123456789
    // Linha 4 (Tipo 3): 000000003 3 01062024 1300 000987654321
    // Linha 5 (Tipo 9): 000000004 9 00000001 00000000 00000003 00000000
    const companyNamePadded = 'ATRIO TECNOLOGIA LTDA'.padEnd(150, ' ');
    const repSerialPadded = '00000000000000101'.padEnd(17, ' ');
    const headerLine = `0000000001112345678000199000000000000${companyNamePadded}${repSerialPadded}0106202430062024010620240800`;
    
    const afdSample = `${headerLine}
0000000013010620240800000123456789
0000000023010620241200000123456789
0000000033010620241300000987654321
000000004900000001000000000000000300000000`;

    const result = ControlIdAfdParser.parse(afdSample);

    assert.equal(result.validPunches, 3);
    assert.equal(result.records.length, 3);
    assert.ok(result.header);
    assert.equal(result.header?.companyName, 'ATRIO TECNOLOGIA LTDA');
    assert.equal(result.header?.repSerialNumber, '00000000000000101');

    // Primeira marcação
    const p1 = result.records[0];
    assert.equal(p1.nsr, 1n);
    assert.equal(p1.registrationNumber, '123456789');
    assert.equal(p1.timestamp.getUTCFullYear(), 2024);
    assert.equal(p1.timestamp.getUTCMonth(), 5); // Junho = 5 (0-indexed)
    assert.equal(p1.timestamp.getUTCDate(), 1);
    assert.equal(p1.timestamp.getUTCHours(), 8);
    assert.equal(p1.timestamp.getUTCMinutes(), 0);

    // Terceira marcação com outro colaborador
    const p3 = result.records[2];
    assert.equal(p3.nsr, 3n);
    assert.equal(p3.registrationNumber, '987654321');
  });

  it('deve parsear linhas em formato simplificado/delimitado', () => {
    const csvContent = `MAT-100;2024-06-01T08:00:00Z\nMAT-200;2024-06-01;12:30`;
    const result = ControlIdAfdParser.parse(csvContent);

    assert.equal(result.validPunches, 2);
    assert.equal(result.records[0].registrationNumber, 'MAT-100');
    assert.equal(result.records[1].registrationNumber, 'MAT-200');
  });

  it('deve parsear registros de ponto Tipo 5 (REP-P Portaria 671 / AFDR)', () => {
    // Registro Tipo 5: [NSR 9][Tipo '5'][Data 8 DDMMAAAA][Hora 4 HHMM][CPF 11][Hash SHA-256...]
    const repPLine1 = '000000001501062024080012345678901e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const repPLine2 = '000000002501062024120012345678901e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const sample = `${repPLine1}\n${repPLine2}`;

    const result = ControlIdAfdParser.parse(sample);
    assert.equal(result.validPunches, 2);
    assert.equal(result.records[0].nsr, 1n);
    assert.equal(result.records[0].registrationNumber, '12345678901');
    assert.equal(result.records[0].timestamp.getUTCHours(), 8);
    assert.equal(result.records[1].nsr, 2n);
    assert.equal(result.records[1].registrationNumber, '12345678901');
    assert.equal(result.records[1].timestamp.getUTCHours(), 12);
  });

  it('deve parsear registros reais do coletor Control iD com data ISO (Portaria 671 REP-C / REP-P)', () => {
    const header = '000000000110000000000000000000000000000ControliD                                                                                                                                             032064851442800112025-05-212026-09-012026-09-01T15:41:00-0300003108238299000129                              4CE3';
    const line1 = '00000000132025-05-21T16:39:00-0300021394413442C1AC';
    const line2 = '00000000832025-05-22T06:42:00-0300026963870525F707';
    const line3 = '00000001232025-05-22T13:01:00-03000160478826775824';
    const sample = `${header}\n${line1}\n${line2}\n${line3}`;

    const result = ControlIdAfdParser.parse(sample);
    assert.equal(result.validPunches, 3);
    assert.equal(result.records[0].registrationNumber, '21394413442');
    assert.equal(result.records[0].timestamp.getUTCFullYear(), 2025);
    assert.equal(result.records[0].timestamp.getUTCMonth(), 4); // Maio = 4 (0-indexed)
    assert.equal(result.records[0].timestamp.getUTCDate(), 21);
    assert.equal(result.records[0].timestamp.getUTCHours(), 19); // 16:39 -0300 = 19:39 UTC
    assert.equal(result.records[0].timestamp.getUTCMinutes(), 39);

    assert.equal(result.records[1].registrationNumber, '26963870525');
    assert.equal(result.records[2].registrationNumber, '16047882677');
  });

  it('deve lidar com arquivo vazio ou linhas corrompidas graciosamente', () => {
    const emptyResult = ControlIdAfdParser.parse('');
    assert.equal(emptyResult.validPunches, 0);

    const corruptResult = ControlIdAfdParser.parse('LINHA INVALIDA\nOUTRA LINHA CORROMPIDA');
    assert.equal(corruptResult.validPunches, 0);
    assert.equal(corruptResult.ignoredLines, 2);
  });
});
