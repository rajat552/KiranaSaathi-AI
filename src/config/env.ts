import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PREFIX: z.string().default('/api/v1'),
  MONGODB_URI: z.string().optional().default(''),
  USE_MEMORY_DB: z.string().optional().transform(val => val === 'true' || val === '1').default('true'),
  JWT_ACCESS_SECRET: z.string().default('kiranasaathi_super_secret_jwt_access_key_2026_demo'),
  JWT_REFRESH_SECRET: z.string().default('kiranasaathi_super_secret_jwt_refresh_key_2026_demo'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  GEMINI_API_KEY: z.string().optional().default(''),
  LYZR_API_KEY: z.string().optional().default('')
});

export type EnvConfig = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
