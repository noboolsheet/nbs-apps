import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@ct/db';
import { users, sessions, accounts, verifications } from '@ct/db/schema';
import { ensureUserOrganization } from '@ct/application';

/**
 * Configuración server de Better Auth (ADR-003). email/password + sesiones.
 * `user` = tabla de dominio `users`; sessions/accounts/verifications propias de Better Auth.
 * IDs generados por la DB (generateId: false → columnas uuid con gen_random_uuid()).
 */
const baseURL = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? 'http://localhost:4270';
// Orígenes de confianza extra (Better Auth valida el Origin de las peticiones de auth contra baseURL).
// Útil si accedes por una URL distinta a baseURL a la vez (p. ej. IP de Tailscale + hostname de Caddy).
// Vacío por defecto → sin cambio de comportamiento. `BETTER_AUTH_TRUSTED_ORIGINS` = orígenes separados por coma.
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const auth = betterAuth({
  appName: 'Control Tower',
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  ...(trustedOrigins.length > 0 ? { trustedOrigins } : {}),
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // MVP de una sola usuaria: sin verificación por email todavía (doc 4 §9).
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  // Rate limiting de Better Auth (protege los endpoints de auth, los más atacados).
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
  advanced: {
    // Cookies seguras SOLO sobre HTTPS (no según NODE_ENV): en dev por http://localhost se sirven
    // cookies no-Secure para que la sesión funcione; en prod (Caddy HTTPS) serán Secure.
    useSecureCookies: baseURL.startsWith('https://'),
    database: {
      // Deja que PostgreSQL genere los UUID (columnas uuid defaultRandom).
      generateId: false,
    },
  },
  // Al registrarse, garantiza que el usuario tenga organización (MVP single-user → OWNER).
  databaseHooks: {
    user: {
      create: {
        // Registro BOOTSTRAP-ONLY (seguridad, crítico #4): solo se permite crear el PRIMER usuario (el owner).
        // Después, el alta queda cerrada — sin esto, cualquiera que alcanzara la app se registraba y quedaba
        // OWNER de la organización existente (takeover). Escape hatch para añadir una cuenta antes de que
        // existan invitaciones (E-11): arrancar el worker/web con ALLOW_OPEN_REGISTRATION=true, registrar, y quitarlo.
        before: async () => {
          if (process.env.ALLOW_OPEN_REGISTRATION === 'true') return;
          const existing = await getDb().select({ id: users.id }).from(users).limit(1);
          if (existing.length > 0) {
            throw new APIError('FORBIDDEN', {
              message: 'El registro está cerrado: ya existe una cuenta en este servidor.',
            });
          }
        },
        after: async (user) => {
          try {
            await ensureUserOrganization(getDb(), user.id);
          } catch {
            // No bloquear el registro si la provisión falla; se puede reintentar en login.
          }
        },
      },
    },
  },
});

export type Auth = typeof auth;
