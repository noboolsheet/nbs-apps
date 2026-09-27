import { betterAuth, APIError } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '@ct/db';
import { users, sessions, accounts, verifications } from '@ct/db/schema';
import { ensureUserOrganization } from '@ct/application';
import { authAccess } from './auth-access';

/**
 * Configuración server de Better Auth (ADR-003). email/password + sesiones.
 * `user` = tabla de dominio `users`; sessions/accounts/verifications propias de Better Auth.
 * IDs generados por la DB (generateId: false → columnas uuid con gen_random_uuid()).
 */
const access = authAccess(process.env);

export const auth = betterAuth({
  appName: 'Control Tower',
  secret: process.env.BETTER_AUTH_SECRET,
  // Con hosts declarados la baseURL es dinámica (se deriva del host de la petición y se valida contra la lista);
  // si no, es la de siempre. Ver `auth-access.ts` para el por qué.
  baseURL: access.baseURL,
  ...(access.trustedOrigins.length > 0 ? { trustedOrigins: access.trustedOrigins } : {}),
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
    // Cookies seguras SOLO sobre HTTPS (no según NODE_ENV) y cabeceras del proxy de confianza cuando hay varios
    // hosts admitidos: las dos decisiones y su por qué están en `auth-access.ts`.
    useSecureCookies: access.secureCookies,
    trustedProxyHeaders: access.trustedProxyHeaders,
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
