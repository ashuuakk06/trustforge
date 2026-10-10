import 'dotenv/config'

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1).default('postgres://trustforge:trustforge@localhost:5432/trustforge'),
  REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32).default('trustforge-development-secret-change-me-please-32chars'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  SEED_DEMO: z.string().default('true').transform((value) => value.toLowerCase() === 'true'),
  LOG_LEVEL: z.string().default('info')
})

export const config = envSchema.parse(process.env)
