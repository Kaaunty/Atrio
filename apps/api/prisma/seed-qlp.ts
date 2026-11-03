import { PrismaClient, LaborClassification, ShiftType } from '@prisma/client';

const prisma = new PrismaClient();

interface QlpEntry {
  label: string;
  departmentName: string;
  positionTitle?: string;
  shiftType?: ShiftType;
  minQuantity: number; // Ponto de emergência
  plannedQuantity: number; // Número aprovado
  maxQuantity: number; // Número aprovado
}

// Dados oficiais da planilha "QLP Setores.xlsx"
const QLP_ENTRIES: QlpEntry[] = [
  // Setor Logístico
  {
    label: 'Logística 1º turno',
    departmentName: 'LOGÍSTICA',
    shiftType: ShiftType.MANHA,
    minQuantity: 24,
    plannedQuantity: 26,
    maxQuantity: 26,
  },
  {
    label: 'Logística 2º turno',
    departmentName: 'LOGÍSTICA',
    shiftType: ShiftType.TARDE,
    minQuantity: 5,
    plannedQuantity: 6,
    maxQuantity: 6,
  },
  {
    label: 'Motorista',
    departmentName: 'LOGÍSTICA',
    positionTitle: 'MOTORISTA DE CAMINHÃO | VAN',
    minQuantity: 2,
    plannedQuantity: 2,
    maxQuantity: 2,
  },

  // Setor Fabril
  {
    label: 'Gerência (Fabril)',
    departmentName: 'ENGENHARIA',
    positionTitle: 'GERENTE INDUSTRIAL',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Engenharia',
    departmentName: 'ENGENHARIA',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Ferramentaria',
    departmentName: 'FERRAMENTARIA',
    minQuantity: 3,
    plannedQuantity: 5,
    maxQuantity: 5,
  },
  {
    label: 'Injetora',
    departmentName: 'INJETORAS',
    minQuantity: 18,
    plannedQuantity: 20,
    maxQuantity: 20,
  },
  {
    label: 'Bicos injetores',
    departmentName: 'BICO INJETOR',
    minQuantity: 14,
    plannedQuantity: 16,
    maxQuantity: 16,
  },
  {
    label: 'Sensores',
    departmentName: 'SENSORES',
    minQuantity: 7,
    plannedQuantity: 8,
    maxQuantity: 8,
  },
  {
    label: 'Recebimento',
    departmentName: 'RECEBIMENTO',
    minQuantity: 2,
    plannedQuantity: 2,
    maxQuantity: 2,
  },
  {
    label: 'PCP',
    departmentName: 'PCP',
    minQuantity: 2,
    plannedQuantity: 4,
    maxQuantity: 4,
  },
  {
    label: 'Chicote',
    departmentName: 'CHICOTES',
    minQuantity: 44,
    plannedQuantity: 50,
    maxQuantity: 50,
  },
  {
    label: 'Embalagem',
    departmentName: 'EMBALAGEM',
    minQuantity: 22,
    plannedQuantity: 24,
    maxQuantity: 24,
  },
  {
    label: 'Montagem',
    departmentName: 'MONTAGEM',
    minQuantity: 13,
    plannedQuantity: 15,
    maxQuantity: 15,
  },
  {
    label: 'Mola',
    departmentName: 'MOLA',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Usinagem',
    departmentName: 'USINAGEM',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Ultrason + Termo fusão',
    departmentName: 'TERMOFUSAO ULTRASSOM',
    minQuantity: 7,
    plannedQuantity: 9,
    maxQuantity: 9,
  },
  {
    label: 'Estamparia',
    departmentName: 'ESTAMPARIA',
    minQuantity: 1,
    plannedQuantity: 3,
    maxQuantity: 3,
  },
  {
    label: 'Jardim',
    departmentName: 'JARDINAGEM',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Manutenção',
    departmentName: 'MANUTENÇÃO',
    minQuantity: 1,
    plannedQuantity: 2,
    maxQuantity: 2,
  },
  {
    label: 'Limpeza',
    departmentName: 'LIMPEZA',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Qualidade',
    departmentName: 'QUALIDADE',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },

  // Setor ADM
  {
    label: 'Fiscal',
    departmentName: 'FISCAL',
    minQuantity: 2,
    plannedQuantity: 3,
    maxQuantity: 3,
  },
  {
    label: 'Financeiro',
    departmentName: 'FINANCEIRO',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Pós Venda',
    departmentName: 'POS VENDAS',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'T.I',
    departmentName: 'TI',
    minQuantity: 1,
    plannedQuantity: 2,
    maxQuantity: 2,
  },
  {
    label: 'Compras',
    departmentName: 'COMPRAS',
    minQuantity: 1,
    plannedQuantity: 2,
    maxQuantity: 2,
  },
  {
    label: 'Atendimento',
    departmentName: 'ATENDIMENTO',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'RH',
    departmentName: 'RECURSOS HUMANOS',
    minQuantity: 2,
    plannedQuantity: 3,
    maxQuantity: 3,
  },
  {
    label: 'Segurança Trabalho',
    departmentName: 'SEGURANÇA DO TRABALHO',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
  {
    label: 'Marketing',
    departmentName: 'MARKETING',
    minQuantity: 2,
    plannedQuantity: 3,
    maxQuantity: 3,
  },
  {
    label: 'Vendas',
    departmentName: 'VENDAS',
    minQuantity: 3,
    plannedQuantity: 4,
    maxQuantity: 4,
  },
  {
    label: 'Recepção',
    departmentName: 'RECEPÇÃO',
    minQuantity: 1,
    plannedQuantity: 1,
    maxQuantity: 1,
  },
];

async function main() {
  const effectiveFrom = new Date('2026-01-01T00:00:00.000Z');

  const departments = await prisma.department.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  const deptByName = new Map(departments.map((d) => [d.name.trim().toUpperCase(), d]));

  const positions = await prisma.position.findMany({
    where: { deletedAt: null },
    select: { id: true, title: true, departmentId: true },
  });

  // Limpa parâmetros antigos de setores deletados ou placeholders antigos
  await prisma.workforceParameter.deleteMany({});

  let created = 0;

  for (const entry of QLP_ENTRIES) {
    const dept = deptByName.get(entry.departmentName.trim().toUpperCase());
    if (!dept) {
      throw new Error(`Setor não encontrado no banco: ${entry.departmentName}`);
    }

    let positionId: string | null = null;
    if (entry.positionTitle) {
      const pos = positions.find(
        (p) =>
          p.departmentId === dept.id &&
          p.title.trim().toUpperCase() === entry.positionTitle!.trim().toUpperCase()
      );
      if (!pos) {
        throw new Error(`Cargo "${entry.positionTitle}" não encontrado no setor "${entry.departmentName}"`);
      }
      positionId = pos.id;
    }

    await prisma.workforceParameter.create({
      data: {
        departmentId: dept.id,
        positionId,
        shiftType: entry.shiftType ?? null,
        laborClassification: LaborClassification.DIRETA,
        minQuantity: entry.minQuantity,
        plannedQuantity: entry.plannedQuantity,
        maxQuantity: entry.maxQuantity,
        allowedContractTypes: ['CLT'],
        effectiveFrom,
        effectiveTo: null,
        active: true,
      },
    });

    created += 1;
    console.log(
      `✅ QLP [${entry.label}] -> Setor: ${dept.name}${entry.positionTitle ? ` | Função: ${entry.positionTitle}` : ''}${entry.shiftType ? ` | Turno: ${entry.shiftType}` : ''} | Mín: ${entry.minQuantity} | Ideal/Aprovado: ${entry.plannedQuantity}`
    );
  }

  // Garante que colaboradores sem laborClassification tenham DIRETA para contabilizar no QLP
  const updatedLabor = await prisma.employee.updateMany({
    where: { deletedAt: null, laborClassification: null },
    data: { laborClassification: LaborClassification.DIRETA },
  });

  // Atualiza turnos dos colaboradores da Logística conforme a escala de trabalho / cargo
  const logisticaDept = deptByName.get('LOGÍSTICA');
  if (logisticaDept) {
    const motoristaPos = positions.find(
      (p) => p.departmentId === logisticaDept.id && p.title.trim().toUpperCase() === 'MOTORISTA DE CAMINHÃO | VAN'
    );
    const segundoTurnoSchedule = await prisma.workSchedule.findFirst({
      where: { deletedAt: null, name: { contains: 'SEGUNDO TURNO', mode: 'insensitive' } },
      select: { id: true },
    });

    if (segundoTurnoSchedule) {
      await prisma.employee.updateMany({
        where: {
          deletedAt: null,
          departmentId: logisticaDept.id,
          workScheduleId: segundoTurnoSchedule.id,
        },
        data: { shiftType: ShiftType.TARDE },
      });
    }

    if (motoristaPos) {
      await prisma.employee.updateMany({
        where: {
          deletedAt: null,
          departmentId: logisticaDept.id,
          positionId: motoristaPos.id,
        },
        data: { shiftType: ShiftType.INTEGRAL },
      });
    }

    await prisma.employee.updateMany({
      where: {
        deletedAt: null,
        departmentId: logisticaDept.id,
        shiftType: null,
      },
      data: { shiftType: ShiftType.MANHA },
    });
  }

  console.log(
    `\n🎉 QLP concluído: ${created} parâmetro(s) cadastrado(s), ${updatedLabor.count} colaborador(es) atualizado(s) com classificação DIRETA.`
  );
}

main()
  .catch((error) => {
    console.error('❌ Falha no seed de parâmetros QLP:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
