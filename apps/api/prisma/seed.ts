import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/modules/auth/services/auth.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Provisionando o usuário administrador e os perfis do sistema...');
  await AuthService.provisionAdminUser();
  console.log('✅ Provisionamento concluído sem dados de demonstração.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
