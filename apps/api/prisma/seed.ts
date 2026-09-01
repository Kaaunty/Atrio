import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/modules/auth/services/auth.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed de mock desabilitado.');
  console.log('🔐 Garantindo existência do usuário Administrador e Roles...');
  await AuthService.seedAdminUser();
  console.log('✅ Inicialização de sistema concluída sem dados de mock.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
