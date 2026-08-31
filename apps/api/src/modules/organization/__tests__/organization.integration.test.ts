import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CompanyService } from '../services/company.service.js';
import { UnitService } from '../services/unit.service.js';
import { DepartmentService } from '../services/department.service.js';
import { PositionService } from '../services/position.service.js';
import { ChartService } from '../services/chart.service.js';
import { prisma } from '../../../database/prisma.js';

describe('Organization Module End-to-End Flow', () => {
  it('deve executar o fluxo completo de cadastro corporativo, validações e organograma', async () => {
    const testCnpj = '04.252.011/0001-10';

    // 0. Limpeza prévia
    const existing = await prisma.company.findFirst({ where: { cnpj: '04252011000110' } });
    if (existing) {
      await prisma.position.deleteMany({ where: { department: { companyId: existing.id } } });
      await prisma.department.deleteMany({ where: { companyId: existing.id } });
      await prisma.unit.deleteMany({ where: { companyId: existing.id } });
      await prisma.company.deleteMany({ where: { id: existing.id } });
    }

    try {
      // 1. Criação de Empresa
      const company = await CompanyService.create({
        legalName: 'Átrio Soluções Tecnológicas S.A.',
        tradeName: 'Átrio Matriz Teste',
        cnpj: testCnpj,
        active: true,
      });
      assert.ok(company.id);
      assert.equal(company.tradeName, 'Átrio Matriz Teste');
      assert.equal(company.cnpj, '04252011000110');

      // 2. Validação de CNPJ Duplicado
      await assert.rejects(
        async () => {
          await CompanyService.create({
            legalName: 'Outra Empresa Teste',
            tradeName: 'Outra Empresa Teste',
            cnpj: testCnpj,
            active: true,
          });
        },
        (err: any) => {
          assert.equal(err.statusCode, 400);
          return true;
        }
      );

      // 3. Criação de Unidade
      const unit = await UnitService.create({
        companyId: company.id,
        name: 'Polo Tecnológico São Paulo',
        city: 'São Paulo',
        state: 'SP',
        address: 'Av. Paulista, 1000',
        active: true,
      });
      assert.ok(unit.id);
      assert.equal(unit.companyId, company.id);

      // 4. Criação de Setores (Pai e Filho)
      const rootDept = await DepartmentService.create({
        companyId: company.id,
        name: 'Diretoria de Tecnologia',
        code: 'DIR-TEC',
        costCenter: 'CC-001',
        active: true,
      });
      assert.ok(rootDept.id);
      assert.equal(rootDept.parentId, null);

      const subDept = await DepartmentService.create({
        companyId: company.id,
        name: 'Engenharia de Software',
        code: 'ENG-SOFT',
        costCenter: 'CC-002',
        parentId: rootDept.id,
        active: true,
      });
      assert.ok(subDept.id);
      assert.equal(subDept.parentId, rootDept.id);

      // 5. Tentativa de Ciclo de Hierarquia (Setor Pai -> Filho de seu próprio Subsetor)
      await assert.rejects(
        async () => {
          await DepartmentService.update(rootDept.id, {
            parentId: subDept.id,
          });
        },
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Referência circular detectada/);
          return true;
        }
      );

      // 6. Criação de Cargo no Subsetor
      const position = await PositionService.create({
        departmentId: subDept.id,
        title: 'Engenheiro de Software Sênior',
        level: 'Sênior',
        description: 'Liderança técnica e arquitetura de sistemas',
        responsibilities: 'Projetar soluções escaláveis e mentorar a equipe',
        active: true,
      });
      assert.ok(position.id);
      assert.equal(position.level, 'Sênior');
      assert.equal(position.departmentId, subDept.id);

      // 7. Validação da Árvore do Organograma
      const chart = await ChartService.getChart(company.id);
      assert.equal(chart.length, 1);
      assert.equal(chart[0].tradeName, 'Átrio Matriz Teste');
      assert.equal(chart[0].departmentsTree.length, 1); // 1 setor raiz

      const rootNode = chart[0].departmentsTree[0];
      assert.equal(rootNode.name, 'Diretoria de Tecnologia');
      assert.equal(rootNode.children.length, 1);

      const subNode = rootNode.children[0];
      assert.equal(subNode.name, 'Engenharia de Software');
      assert.equal(subNode.positions.length, 1);
      assert.equal(subNode.positions[0].title, 'Engenheiro de Software Sênior');
      assert.equal(subNode.totalPositions, 1);
      assert.equal(rootNode.totalPositions, 1); // Acumulado do subsetor

      // 8. Teste de Bloqueio de Exclusão de Setor com Filhos
      await assert.rejects(
        async () => {
          await DepartmentService.delete(rootDept.id);
        },
        (err: any) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /possui 1 subsetor/);
          return true;
        }
      );
    } finally {
      // Limpeza final
      if (existing || testCnpj) {
        const comp = await prisma.company.findFirst({ where: { cnpj: '04252011000110' } });
        if (comp) {
          await prisma.position.deleteMany({ where: { department: { companyId: comp.id } } });
          await prisma.department.deleteMany({ where: { companyId: comp.id } });
          await prisma.unit.deleteMany({ where: { companyId: comp.id } });
          await prisma.company.deleteMany({ where: { id: comp.id } });
        }
      }
    }
  });
});
