import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCPF, cleanCPF, formatCPF } from '../../../shared/utils/cpf.js';

describe('CPF Validator Utility', () => {
  it('deve validar corretamente CPFs válidos conhecidos', () => {
    // CPFs válidos com dígitos verificadores matematicamente corretos
    assert.equal(isValidCPF('52998224725'), true);
    assert.equal(isValidCPF('529.982.247-25'), true);
    assert.equal(isValidCPF('123.456.789-09'), true);
    assert.equal(isValidCPF('000.000.001-91'), true);
  });

  it('deve rejeitar CPFs com dígitos verificadores incorretos', () => {
    assert.equal(isValidCPF('529.982.247-00'), false);
    assert.equal(isValidCPF('123.456.789-00'), false);
    assert.equal(isValidCPF('111.222.333-44'), false);
  });

  it('deve rejeitar CPFs com todos os números repetidos', () => {
    assert.equal(isValidCPF('000.000.000-00'), false);
    assert.equal(isValidCPF('11111111111'), false);
    assert.equal(isValidCPF('222.222.222-22'), false);
    assert.equal(isValidCPF('99999999999'), false);
  });

  it('deve rejeitar CPFs com quantidade de dígitos inválida ou vazios', () => {
    assert.equal(isValidCPF('123'), false);
    assert.equal(isValidCPF(''), false);
    assert.equal(isValidCPF('529982247251'), false);
  });

  it('deve limpar e formatar CPFs corretamente', () => {
    assert.equal(cleanCPF('529.982.247-25'), '52998224725');
    assert.equal(formatCPF('52998224725'), '529.982.247-25');
  });
});
