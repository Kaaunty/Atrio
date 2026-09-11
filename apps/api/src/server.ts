import { app } from './app.js';
import { env } from './config/env.js';
import { RbacService } from './modules/rbac/services/rbac.service.js';

const PORT = env.PORT;

async function start() {
  await RbacService.seedPermissionsAndRoles();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor RH Digital rodando na porta ${PORT}`);
    console.log(`📡 Health Check disponível em: http://localhost:${PORT}/api/v1/health`);
  });
}

start().catch((error) => {
  console.error('❌ Falha ao inicializar dados padrão:', error);
  process.exit(1);
});
