import { z } from 'zod';

/**
 * Server Environment Variables Schema with strict Zod validation.
 * Validates required keys at boot to prevent running with incomplete configuration.
 */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),

  // Firebase Admin SDK (Server side)
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1, 'FIREBASE_ADMIN_PROJECT_ID is required'),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().optional(),

  // Financial Integration: Asaas (Server side)
  ASAAS_API_URL: z.string().url().optional().default('https://api.asaas.com/v3'),
  ASAAS_API_KEY: z.string().optional(),
  ASAAS_WEBHOOK_SECRET: z.string().optional(),

  // Accounting Integration: Conta Azul (Server side)
  CONTA_AZUL_CLIENT_ID: z.string().optional(),
  CONTA_AZUL_CLIENT_SECRET: z.string().optional(),
  CONTA_AZUL_REDIRECT_URI: z.string().url().optional(),

  // Communication: WhatsApp / Evolution Gateway (Server side)
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().optional(),
  EVOLUTION_INSTANCE_NAME: z.string().optional(),

  // Security Secrets
  ENCRYPTION_SECRET_KEY: z.string().min(16, 'ENCRYPTION_SECRET_KEY must be at least 16 chars').optional(),
  JOB_CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates environment variables on application startup.
 * Throws a clear error if critical configuration is missing.
 */
export function validateEnvironment(): ServerEnv {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ CRITICAL ENVIRONMENT CONFIGURATION ERROR:');
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error('Environment configuration validation failed. Check server logs.');
  }

  return result.data;
}
