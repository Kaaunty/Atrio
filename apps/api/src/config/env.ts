import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3333').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().default('super-secret-jwt-key'),
  ADMIN_PASSWORD: z.string().default('Atrio@2026'),
  DEMO_PASSWORD: z.string().default('Demo@2026'),
  TIMEZONE: z.string().default('America/Sao_Paulo'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Variáveis de ambiente inválidas:', _env.error.format());
  throw new Error('Configuração de ambiente inválida');
}

export const env = _env.data;
