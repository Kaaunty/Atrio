import { app } from './app.js';
import { env } from './config/env.js';

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`🚀 Servidor RH Digital rodando na porta ${PORT}`);
  console.log(`📡 Health Check disponível em: http://localhost:${PORT}/api/v1/health`);
});
