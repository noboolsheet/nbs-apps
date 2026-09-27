/**
 * **Por dónde se puede entrar a la app.** Lógica pura que traduce el entorno a las opciones de acceso de Better
 * Auth (`baseURL`, orígenes de confianza, cookies). Vive fuera de `auth.ts` para poder probarla sin arrastrar la
 * conexión a la base de datos que ese módulo abre al importarse.
 *
 * El problema que resuelve (owner 2026-09-27: «intenté entrar desde la IP de la red local y me dijo que el origen
 * no era permitido, sólo puedo entrar desde la tailnet»): Better Auth valida el `Origin` de las peticiones de auth
 * contra su `baseURL`, que es UNA. Con `BETTER_AUTH_URL` apuntando al tailnet o al hostname de Caddy, entrar por
 * `http://<IP-de-la-LAN>:4272` fallaba en el login. No era la red —el puerto se alcanza— era este chequeo.
 */

/** Sólo las claves que se leen aquí; el índice está para poder pasarle `process.env` tal cual. */
export interface AuthAccessEnv extends Record<string, string | undefined> {
  BETTER_AUTH_URL?: string | undefined;
  APP_URL?: string | undefined;
  BETTER_AUTH_ALLOWED_HOSTS?: string | undefined;
  BETTER_AUTH_TRUSTED_ORIGINS?: string | undefined;
  BETTER_AUTH_SECURE_COOKIES?: string | undefined;
}

/** Config de acceso lista para pasar a `betterAuth`. `baseURL` dinámica sólo si hay hosts declarados. */
export interface AuthAccess {
  baseURL: string | { allowedHosts: string[]; protocol: 'auto'; fallback: string };
  /** La baseURL fija, siempre resuelta (la dinámica la usa como `fallback`). */
  fallbackURL: string;
  trustedOrigins: string[];
  secureCookies: boolean;
  trustedProxyHeaders: boolean;
}

const csv = (raw: string | undefined) =>
  (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export function authAccess(env: AuthAccessEnv): AuthAccess {
  const fallbackURL = env.BETTER_AUTH_URL ?? env.APP_URL ?? 'http://localhost:4270';

  /**
   * `BETTER_AUTH_ALLOWED_HOSTS` = hosts admitidos separados por coma, con comodines (`192.168.*.*:4272`). Con la
   * lista puesta, Better Auth DERIVA la baseURL de cada petición y la valida contra ella, así que la misma app
   * funciona por LAN, por tailnet y por el hostname de Caddy sin duplicar despliegues. Vacío → comportamiento de
   * siempre (baseURL fija), que es lo que queremos en dev y en la demo pública.
   *
   * Qué NO es: una puerta abierta. Un host que no esté en la lista cae al `fallback` y su Origin sigue rechazado;
   * y el `Origin` lo pone el navegador, no la página, así que un sitio ajeno no puede hacerse pasar por uno de
   * éstos aunque adivine el nombre.
   */
  const allowedHosts = csv(env.BETTER_AUTH_ALLOWED_HOSTS);

  /**
   * Cookies `Secure`. Por defecto se deduce del esquema de la baseURL (https ⇒ Secure), correcto cuando hay un
   * solo origen. **Con varios orígenes de esquema distinto hay que elegir**: una cookie `Secure` no viaja por
   * http, así que entrando por `http://<IP-de-la-LAN>:4272` el login "funciona" y la sesión no se guarda.
   * `BETTER_AUTH_SECURE_COOKIES=false` quita el flag para que la sesión aguante también por http plano — sólo
   * tiene sentido en red privada (LAN + tailnet, sin exposición a internet). En la demo pública: no tocar.
   */
  const secureCookies =
    env.BETTER_AUTH_SECURE_COOKIES !== undefined
      ? env.BETTER_AUTH_SECURE_COOKIES === 'true'
      : fallbackURL.startsWith('https://');

  return {
    baseURL:
      allowedHosts.length > 0 ? { allowedHosts, protocol: 'auto', fallback: fallbackURL } : fallbackURL,
    fallbackURL,
    // Orígenes de confianza extra, por si hay que admitir un origen COMPLETO (con esquema) que no encaje como host.
    trustedOrigins: csv(env.BETTER_AUTH_TRUSTED_ORIGINS),
    secureCookies,
    // Detrás de Caddy el esquema real (https) sólo llega en `X-Forwarded-Proto`: sin esto la baseURL derivada
    // saldría http y los redirects del login bajarían de esquema. Se activa SÓLO con `allowedHosts` puesto, porque
    // entonces el host que traen esas cabeceras tiene que pasar igualmente por la allowlist.
    trustedProxyHeaders: allowedHosts.length > 0,
  };
}
