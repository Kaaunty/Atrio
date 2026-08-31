import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isValidCNPJ, cleanCNPJ, formatCNPJ } from '../../../shared/utils/cnpj.js';
import { DepartmentService } from '../services/department.service.js';

describe('CNPJ Validator Utility', () => {
  it('deve validar corretamente CNPJs válidos conhecidos', () => {
    // Exemplos de CNPJs válidos de teste
    assert.equal(isValidCNPJ('04.252.011/0001-10'), true);
    assert.equal(isValidCNPJ('04252011000110'), true);
    assert.equal(isValidCNPJ('11.222.333/0001-81'), true);
  });

  it('deve rejeitar CNPJs com dígitos verificadores incorretos', () => {
    assert.equal(isValidCNPJ('04.252.011/0001-99'), false);
    assert.equal(isValidCNPJ('11.222.333/0001-00'), false);
  });

  it('deve rejeitar CNPJs com todos os números repetidos', () => {
    assert.equal(isValidCNPJ('00000000000000'), false);
    assert.equal(isValidCNPJ('11111111111111'), false);
    assert.equal(isValidCNPJ('99999999999999'), false);
  });

  it('deve rejeitar CNPJs com quantidade de dígitos inválida', () => {
    assert.equal(isValidCNPJ('123'), false);
    assert.equal(isValidCNPJ(''), false);
    assert.equal(isValidCNPJ('042520110001101'), false);
  });

  it('deve limpar e formatar CNPJs corretamente', () => {
    assert.equal(cleanCNPJ('04.252.011/0001-10'), '04252011000110');
    assert.equal(formatCNPJ('04252011000110'), '04.252.011/0001-10');
  });
});

describe('Department Tree & Hierarchy Builder', () => {
  it('deve montar a árvore hierárquica corretamente com pais e filhos arbitrários', () => {
    const mockDepartments = [
      {
        id: 'dept-1',
        companyId: 'comp-1',
        name: 'Diretoria Geral',
        code: 'DIR-01',
        costCenter: 'CC-01',
        parentId: null,
        managerId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { positions: 2 },
      },
      {
        id: 'dept-2',
        companyId: 'comp-1',
        name: 'Gerência de Tecnologia',
        code: 'TEC-01',
        costCenter: 'CC-02',
        parentId: 'dept-1',
        managerId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { positions: 5 },
      },
      {
        id: 'dept-3',
        companyId: 'comp-1',
        name: 'Desenvolvimento de Software',
        code: 'DEV-01',
        costCenter: 'CC-03',
        parentId: 'dept-2',
        managerId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { positions: 10 },
      },
      {
        id: 'dept-4',
        companyId: 'comp-1',
        name: 'Gerência de Recursos Humanos',
        code: 'RH-01',
        costCenter: 'CC-04',
        parentId: 'dept-1',
        managerId: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { positions: 3 },
      },
    ];

    const tree = DepartmentService.buildTreeNodes(mockDepartments);

    assert.equal(tree.length, 1); // 1 raiz: Diretoria Geral
    assert.equal(tree[0].name, 'Diretoria Geral');
    assert.equal(tree[0].children.length, 2); // Tecnologia e RH

    const techDept = tree[0].children.find((c) => c.id === 'dept-2');
    assert.ok(techDept);
    assert.equal(techDept.name, 'Gerência de Tecnologia');
    assert.equal(techDept.children.length, 1);
    assert.equal(techDept.children[0].name, 'Desenvolvimento de Software');

    const rhDept = tree[0].children.find((c) => c.id === 'dept-4');
    assert.ok(rhDept);
    assert.equal(rhDept.name, 'Gerência de Recursos Humanos');
    assert.equal(rhDept.children.length, 0);
  });
});
