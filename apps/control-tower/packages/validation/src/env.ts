import { z } from 'zod';

/**
 * Validación de entorno en el boundary (doc 4 §12: Zod valida env config).
 * Falla rápido y claro si falta algo. Los campos de auth/integraciones se añaden
 * en sus milestones (M03/M12) manteniendo este esquema como fuente única.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:4270'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /**
   * Secreto con el que Better Auth firma las cookies de sesión. Opcional AQUÍ porque el worker no lo usa
   * (comparte el `.env`, pero fallar por una variable que no necesita sería absurdo); la web lo exige con
   * `webEnvSchema`. Si está, se valida la longitud: un secreto corto es tan malo como no tenerlo.
   */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres (genera uno con `openssl rand -base64 32`)')
    .optional(),
});

/**
 * Entorno de la **web**: lo mismo que arriba pero con `BETTER_AUTH_SECRET` **obligatorio**.
 *
 * Sin él la aplicación **arrancaba igual** —`/api/health` respondía 200— y sólo fallaba al iniciar sesión, con
 * un 500 opaco. Es el peor modo de fallo posible: parece que va, y no va. Comprobado antes de escribir esto.
 */
export const webEnvSchema = envSchema.extend({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET debe tener al menos 32 caracteres (genera uno con `openssl rand -base64 32`)'),
});
export type WebEnv = z.infer<typeof webEnvSchema>;

export type Env = z.infer<typeof envSchema>;

export interface ParseResult {
  success: boolean;
  env?: Env;
  errors?: string[];
}

/** Parsea un record de entorno sin lanzar; devuelve errores legibles. */
export function parseEnv(source: Record<string, string | undefined>): ParseResult {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return { success: true, env: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
  };
}

/** Carga y valida `process.env`, lanzando si es inválido. Usar en el arranque. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = parseEnv(source);
  if (!parsed.success || !parsed.env) {
    throw new Error(`Invalid environment configuration:\n- ${(parsed.errors ?? []).join('\n- ')}`);
  }
  return parsed.env;
}

/** Igual que `loadEnv` pero con el esquema de la web (exige `BETTER_AUTH_SECRET`). */
export function loadWebEnv(source: Record<string, string | undefined> = process.env): WebEnv {
  const result = webEnvSchema.safeParse(source);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }
  return result.data;
}
