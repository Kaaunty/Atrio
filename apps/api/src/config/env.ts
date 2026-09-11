import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3333').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must have at least 32 characters').default('development-jwt-secret-change-before-production'),
  ADMIN_EMAIL: z.string().email().default('admin@localhost.invalid'),
  ADMIN_PASSWORD: z.string().min(12, 'ADMIN_PASSWORD must have at least 12 characters').default('development-admin-password-change-before-production'),
  DEFAULT_USER_PASSWORD: z.string().min(6, 'DEFAULT_USER_PASSWORD must have at least 6 characters').default('development-user-password-change-before-production'),
  TIMEZONE: z.string().default('America/Sao_Paulo'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Variáveis de ambiente inválidas:', _env.error.format());
  throw new Error('Configuração de ambiente inválida');
}

if (_env.data.NODE_ENV === 'production') {
  const requiredProductionVariables = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'DEFAULT_USER_PASSWORD'];
  const missingVariables = requiredProductionVariables.filter((name) => !process.env[name]);

  if (missingVariables.length > 0) {
    throw new Error(`Variáveis obrigatórias para produção ausentes: ${missingVariables.join(', ')}`);
  }
}

export const env = _env.data;
