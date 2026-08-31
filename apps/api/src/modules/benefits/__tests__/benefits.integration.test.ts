import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../../database/prisma';
import { BenefitsService } from '../services/benefits.service';

describe('Gestão de Benefícios Integration Flow', () => {
  let companyId: string;
  let employeeId: string;
  let benefitId: string;

  before(async () => {
    // 1. Empresa e Colaborador
    const company = await prisma.company.create({
      data: {
        legalName: 'Átrio Benefícios S.A.',
        tradeName: 'Átrio Benefícios',
        cnpj: `88.${Math.floor(100 + Math.random() * 900)}.000/0001-01`,
      },
    });
    companyId = company.id;

    const employee = await prisma.employee.create({
      data: {
        companyId,
        name: 'Beneficiário Teste',
        registrationNumber: `BEN-${Date.now()}`,
        cpf: `${Math.floor(10000000000 + Math.random() * 89999999999)}`,
        email: `ben_${Date.now()}@atrio.com.br`,
        admissionDate: new Date('2024-01-01'),
        contractType: 'CLT',
        status: 'ATIVO',
      },
    });
    employeeId = employee.id;
  });

  after(async () => {
    if (companyId) {
      await prisma.employeeBenefit.deleteMany({ where: { employeeId } });
      await prisma.benefit.deleteMany({ where: { id: benefitId } });
      await prisma.employee.deleteMany({ where: { companyId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
  });

  it('deve cadastrar novo benefício no catálogo', async () => {
    const benefit = await BenefitsService.createBenefit({
      name: 'Vale Refeição Flash',
      provider: 'Flash Benefícios',
      category: 'ALIMENTACAO',
      description: 'Cartão de alimentação aceito em mais de 2 milhões de estabelecimentos',
      deductionRule: 'Desconto fixo de R$ 1,00 em folha',
      active: true,
    });

    assert.ok(benefit.id);
    assert.equal(benefit.name, 'Vale Refeição Flash');
    benefitId = benefit.id;
  });

  it('deve associar o benefício ao colaborador com dependentes cobertos', async () => {
    const empBenefit = await BenefitsService.assignBenefitToEmployee(employeeId, {
      benefitId,
      startDate: '2026-01-01',
      monthlyValue: 800,
      employeeDeductionValue: 1,
      cardNumberLast4: '4321',
      dependentsIncluded: [
        { name: 'Maria Silva', relationship: 'Cônjuge', birthDate: '1995-05-10' },
      ],
    });

    assert.ok(empBenefit.id);
    assert.equal(empBenefit.monthlyValue.toString(), '800');
    assert.equal(empBenefit.status, 'ATIVO');
    assert.equal(empBenefit.cardNumberLast4, '4321');
  });

  it('deve consultar os benefícios ativos do colaborador (GET /benefits/me)', async () => {
    const myBenefits = await BenefitsService.getMyBenefits(employeeId);
    assert.equal(myBenefits.length, 1);
    assert.equal(myBenefits[0].benefit.name, 'Vale Refeição Flash');
  });

  it('deve suspender/cancelar o benefício de um colaborador', async () => {
    const myBenefits = await BenefitsService.getMyBenefits(employeeId);
    const empBenefitId = myBenefits[0].id;

    const updated = await BenefitsService.updateEmployeeBenefit(empBenefitId, {
      status: 'CANCELADO',
      endDate: '2026-08-31',
    });

    assert.equal(updated.status, 'CANCELADO');

    const myBenefitsAfter = await BenefitsService.getMyBenefits(employeeId);
    assert.equal(myBenefitsAfter.length, 0); // Apenas ativos são retornados em getMyBenefits
  });
});
