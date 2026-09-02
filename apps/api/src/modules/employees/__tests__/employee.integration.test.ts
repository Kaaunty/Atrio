import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma.js';
import { EmployeeService } from '../services/employee.service.js';

describe('Employee & Timeline Module Integration Flow', () => {
  let testCompanyId: string;
  let testDeptId1: string;
  let testDeptId2: string;
  let testPosId1: string;
  let testPosId2: string;

  before(async () => {
    // Cria empresa, departamentos e cargos para o teste
    const company = await prisma.company.create({
      data: {
        legalName: 'Colaborador Testes Ltda',
        tradeName: 'Empresa Teste Colab',
        cnpj: '45.123.456/0001-99',
      },
    });
    testCompanyId = company.id;

    const dept1 = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Tecnologia da Informação',
        code: 'TI-01',
      },
    });
    testDeptId1 = dept1.id;

    const dept2 = await prisma.department.create({
      data: {
        companyId: testCompanyId,
        name: 'Recursos Humanos',
        code: 'RH-01',
      },
    });
    testDeptId2 = dept2.id;

    const pos1 = await prisma.position.create({
      data: {
        departmentId: testDeptId1,
        title: 'Desenvolvedor Pleno',
        level: 'PLENO',
      },
    });
    testPosId1 = pos1.id;

    const pos2 = await prisma.position.create({
      data: {
        departmentId: testDeptId1,
        title: 'Tech Lead',
        level: 'ESPECIALISTA',
      },
    });
    testPosId2 = pos2.id;
  });

  after(async () => {
    // Limpeza em cascata
    if (testCompanyId) {
      await prisma.employeeHistory.deleteMany({
        where: { employee: { companyId: testCompanyId } },
      });
      await prisma.employee.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prisma.position.deleteMany({
        where: { department: { companyId: testCompanyId } },
      });
      await prisma.department.deleteMany({
        where: { companyId: testCompanyId },
      });
      await prisma.company.delete({
        where: { id: testCompanyId },
      });
    }
  });

  it('deve cadastrar gestor e liderado, gerando ADMISSAO na timeline e impedindo loops de subordinação', async () => {
    // 1. Cadastra Gestor (Tech Lead)
    const gestor = await EmployeeService.create({
      name: 'Carlos Gestor',
      cpf: '529.982.247-25',
      email: 'carlos.gestor@empresa.com.br',
      registrationNumber: 'MAT-001',
      companyId: testCompanyId,
      departmentId: testDeptId1,
      positionId: testPosId2,
      admissionDate: new Date('2024-01-15'),
      contractType: 'CLT',
      salary: 15000,
    });

    assert.ok(gestor.id);
    assert.equal(gestor.name, 'Carlos Gestor');
    assert.equal(gestor.cpf, '52998224725');

    // Verifica timeline inicial do gestor
    const timelineGestor = await EmployeeService.getTimeline(gestor.id);
    assert.equal(timelineGestor.length, 1);
    assert.equal(timelineGestor[0].eventType, 'ADMISSAO');

    // 2. Cadastra Liderado subordinado a Carlos
    const liderado = await EmployeeService.create({
      name: 'Ana Desenvolvedora',
      cpf: '123.456.789-09',
      email: 'ana.dev@empresa.com.br',
      registrationNumber: 'MAT-002',
      companyId: testCompanyId,
      departmentId: testDeptId1,
      positionId: testPosId1,
      managerId: gestor.id,
      admissionDate: new Date('2024-06-01'),
      contractType: 'CLT',
      salary: 8000,
    });

    assert.ok(liderado.id);
    assert.equal(liderado.managerId, gestor.id);

    // 3. Testa consulta de subordinados do gestor
    const subs = await EmployeeService.getSubordinates(gestor.id);
    assert.equal(subs.length, 1);
    assert.equal(subs[0].id, liderado.id);
    assert.equal(subs[0].name, 'Ana Desenvolvedora');

    // 4. Testa rejeição de ciclo hierárquico (tentar fazer Carlos ser liderado por Ana)
    await assert.rejects(
      async () => {
        await EmployeeService.update(gestor.id, {
          managerId: liderado.id,
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('ciclo hierárquico') || err.message.includes('auto-gestão'));
        return true;
      }
    );

    // 5. Testa promoção e transferência de Ana para o RH com reajuste salarial
    const updatedLiderado = await EmployeeService.update(liderado.id, {
      positionId: testPosId2,
      departmentId: testDeptId2,
      salary: 11000,
      reason: 'Promoção a Especialista e transferência para RH',
    });

    assert.equal(updatedLiderado.positionId, testPosId2);
    assert.equal(updatedLiderado.departmentId, testDeptId2);
    assert.equal(Number(updatedLiderado.salary), 11000);

    // 6. Verifica se os eventos foram gravados na Timeline imutável
    const timelineLiderado = await EmployeeService.getTimeline(liderado.id);
    // Deve conter: ADMISSAO, MUDANCA_CARGO, MUDANCA_SETOR, ALTERACAO_SALARIAL = 4 eventos
    assert.equal(timelineLiderado.length, 4);

    const eventTypes = timelineLiderado.map((e) => e.eventType);
    assert.ok(eventTypes.includes('ADMISSAO'));
    assert.ok(eventTypes.includes('MUDANCA_CARGO'));
    assert.ok(eventTypes.includes('MUDANCA_SETOR'));
    assert.ok(eventTypes.includes('ALTERACAO_SALARIAL'));

    // 7. Testa rejeição de duplicidade de CPF e de Matrícula na mesma empresa
    await assert.rejects(
      async () => {
        await EmployeeService.create({
          name: 'Clone CPF',
          cpf: '529.982.247-25', // mesmo de Carlos
          email: 'outro@empresa.com',
          registrationNumber: 'MAT-999',
          companyId: testCompanyId,
          admissionDate: new Date(),
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('CPF'));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await EmployeeService.create({
          name: 'Clone Matrícula',
          cpf: '000.000.001-91',
          email: 'novo@empresa.com',
          registrationNumber: 'MAT-001', // mesma matrícula de Carlos na mesma empresa
          companyId: testCompanyId,
          admissionDate: new Date(),
        });
      },
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('matrícula'));
        return true;
      }
    );

    // 8. Testa listagem e busca
    const listResult = await EmployeeService.list({
      companyId: testCompanyId,
      search: 'Desenvolvedora',
    });
    assert.equal(listResult.items.length, 1);
    assert.equal(listResult.items[0].id, liderado.id);

    // 9. Testa desligamento suave (Soft delete)
    const deleteResult = await EmployeeService.delete(liderado.id, 'Desligamento voluntário');
    assert.ok(deleteResult.success);

    // 10. Testa o endpoint de estatísticas agregadas por status
    const statsResult = await EmployeeService.getStats(testCompanyId);
    assert.equal(statsResult.total, 1);
    assert.equal(statsResult.active, 1);
    assert.equal(statsResult.vacation, 0);
    assert.equal(statsResult.leave, 0);
  });
});
