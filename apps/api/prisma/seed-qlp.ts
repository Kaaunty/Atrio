import { PrismaClient, LaborClassification } from '@prisma/client';

const prisma = new PrismaClient();

function readQuantity(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} deve ser um inteiro maior ou igual a zero`);
  }

  return value;
}

async function main() {
  const minQuantity = readQuantity('QLP_SEED_MIN', 0);
  const plannedQuantity = readQuantity('QLP_SEED_PLANNED', 1);
  const maxQuantity = readQuantity('QLP_SEED_MAX', 2);

  if (minQuantity > plannedQuantity || plannedQuantity > maxQuantity) {
    throw new Error('Os defaults do seed QLP devem respeitar mínimo <= ideal <= máximo');
  }

  const effectiveFrom = new Date();
  effectiveFrom.setHours(0, 0, 0, 0);

  const departments = await prisma.department.findMany({
    where: { active: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  let created = 0;
  let skipped = 0;

  for (const department of departments) {
    const existing = await prisma.workforceParameter.findFirst({
      where: {
        departmentId: department.id,
        positionId: null,
        shiftType: null,
        laborClassification: LaborClassification.DIRETA,
        active: true,
        effectiveFrom: { lte: effectiveFrom },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: effectiveFrom } }],
      },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.workforceParameter.create({
      data: {
        departmentId: department.id,
        positionId: null,
        shiftType: null,
        laborClassification: LaborClassification.DIRETA,
        minQuantity,
        plannedQuantity,
        maxQuantity,
        allowedContractTypes: ['CLT'],
        effectiveFrom,
        effectiveTo: null,
        active: true,
      },
    });

    created += 1;
    console.log(`✅ QLP criado: ${department.name}`);
  }

  console.log(`QLP concluído: ${created} criado(s), ${skipped} já existente(s), ${departments.length} setor(es) processado(s).`);
}

main()
  .catch((error) => {
    console.error('❌ Falha no seed de parâmetros QLP:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
