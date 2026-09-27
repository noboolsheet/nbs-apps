import { describe, it, expect } from 'vitest';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { authAccess, type AuthAccessEnv } from './auth-access';

/**
 * El fallo que arregla esto (owner 2026-09-27): entrando por la IP de la red local, el login contestaba que el
 * origen no estaba permitido — Better Auth valida el `Origin` contra su `baseURL`, que era la del tailnet.
 *
 * El test monta Better Auth DE VERDAD (con adaptador en memoria, sin base de datos) y pide login desde varios
 * orígenes: es la única forma de comprobar que la config que produce `authAccess` hace lo que creemos. Un test que
 * sólo mirara el objeto devuelto pasaría igual aunque Better Auth ignorara la opción.
 *
 * Lectura de los códigos: **403 = origen rechazado** (no llega ni a mirar credenciales); cualquier otro código
 * (401/400) = el origen se aceptó y falló por la contraseña, que es lo que esperamos de un origen permitido.
 */
function instancia(env: AuthAccessEnv) {
  const access = authAccess(env);
  return betterAuth({
    appName: 'CT test',
    secret: 'test-secret-de-32-caracteres-o-mas!!',
    baseURL: access.baseURL,
    ...(access.trustedOrigins.length > 0 ? { trustedOrigins: access.trustedOrigins } : {}),
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    emailAndPassword: { enabled: true },
    advanced: {
      useSecureCookies: access.secureCookies,
      trustedProxyHeaders: access.trustedProxyHeaders,
      // Better Auth APAGA el chequeo de origen cuando NODE_ENV=test (`isTest()`), que es justo lo que queremos
      // probar. Aquí se reactiva a mano: sin esto el test pasaría en verde con la comprobación desactivada.
      disableOriginCheck: false,
    },
  });
}

async function intentaEntrar(
  auth: ReturnType<typeof instancia>,
  { host, origin, proto }: { host: string; origin: string; proto?: string },
) {
  const res = await auth.handler(
    new Request(`http://${host}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        // Con cookie a propósito: Better Auth sólo valida el Origin cuando la petición trae cookies
        // (`validateOrigin`: `if (!(forceValidate || useCookies)) return`). Un navegador SIEMPRE las trae, así que
        // sin esta cabecera el test no probaría nada.
        cookie: 'ct-test=1',
        origin,
        host,
        ...(proto ? { 'x-forwarded-proto': proto } : {}),
      },
      body: JSON.stringify({ email: 'owner@example.com', password: 'una-contrasena-larga' }),
    }),
  );
  return res.status;
}

const TAILNET = 'http://100.64.0.1:4272';

describe('por dónde se puede entrar (Better Auth)', () => {
  it('sin lista de hosts, sólo vale el origen de BETTER_AUTH_URL (el comportamiento de antes)', async () => {
    const auth = instancia({ BETTER_AUTH_URL: TAILNET });
    expect(await intentaEntrar(auth, { host: '100.64.0.1:4272', origin: TAILNET })).not.toBe(403);
    // Esto es EXACTAMENTE lo que le pasaba al owner desde la red local.
    expect(
      await intentaEntrar(auth, { host: '192.168.1.50:4272', origin: 'http://192.168.1.50:4272' }),
    ).toBe(403);
  });

  it('con la lista de hosts, entra por la LAN, por el tailnet y por el hostname de Caddy', async () => {
    const auth = instancia({
      BETTER_AUTH_URL: TAILNET,
      BETTER_AUTH_ALLOWED_HOSTS:
        'control-tower.noboolsheet.local, 100.64.0.1:4272, 192.168.*.*:4272, localhost:4270',
    });
    expect(await intentaEntrar(auth, { host: '100.64.0.1:4272', origin: TAILNET })).not.toBe(403);
    expect(
      await intentaEntrar(auth, { host: '192.168.1.50:4272', origin: 'http://192.168.1.50:4272' }),
    ).not.toBe(403);
    // Por Caddy: https por fuera, http por dentro (el esquema real llega en X-Forwarded-Proto).
    expect(
      await intentaEntrar(auth, {
        host: 'control-tower.noboolsheet.local',
        origin: 'https://control-tower.noboolsheet.local',
        proto: 'https',
      }),
    ).not.toBe(403);
  });

  it('un host que NO está en la lista sigue rechazado (la lista es una allowlist, no un interruptor)', async () => {
    const auth = instancia({
      BETTER_AUTH_URL: TAILNET,
      BETTER_AUTH_ALLOWED_HOSTS: '192.168.*.*:4272',
    });
    expect(await intentaEntrar(auth, { host: 'phishing.example.com', origin: 'https://phishing.example.com' })).toBe(
      403,
    );
    // Y un Origin ajeno con un Host permitido —la forma real de un CSRF— tampoco pasa.
    expect(
      await intentaEntrar(auth, { host: '192.168.1.50:4272', origin: 'https://phishing.example.com' }),
    ).toBe(403);
  });
});

describe('cookies y cabeceras del proxy', () => {
  it('Secure se deduce del esquema, y se puede forzar para entrar por http desde la LAN', () => {
    expect(authAccess({ BETTER_AUTH_URL: 'https://control-tower.noboolsheet.local' }).secureCookies).toBe(true);
    expect(authAccess({ BETTER_AUTH_URL: TAILNET }).secureCookies).toBe(false);
    expect(
      authAccess({ BETTER_AUTH_URL: 'https://control-tower.noboolsheet.local', BETTER_AUTH_SECURE_COOKIES: 'false' })
        .secureCookies,
    ).toBe(false);
  });

  it('las cabeceras del proxy sólo se creen cuando hay allowlist de hosts', () => {
    expect(authAccess({ BETTER_AUTH_URL: TAILNET }).trustedProxyHeaders).toBe(false);
    expect(authAccess({ BETTER_AUTH_URL: TAILNET, BETTER_AUTH_ALLOWED_HOSTS: 'x.local' }).trustedProxyHeaders).toBe(
      true,
    );
  });

  it('sin nada en el entorno, dev por localhost:4270', () => {
    const access = authAccess({});
    expect(access.baseURL).toBe('http://localhost:4270');
    expect(access.secureCookies).toBe(false);
  });
});
