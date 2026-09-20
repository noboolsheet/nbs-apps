import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { z } from '@ct/validation';
import { AppError, isAppError, toClientError, HTTP_STATUS_BY_KIND } from '@ct/shared';
import { withQueryStats } from '@ct/db';
import { requireCurrentContext, type CurrentContext } from './auth-context';
import { rateLimit } from './rate-limit';
import type { OrgContext } from '@ct/application';

/**
 * Helper para route handlers /api/v1: aplica hardening (CSRF por Origin + rate limit), resuelve
 * sesión + contexto de organización, ejecuta el handler y mapea errores a HTTP (doc 3 §30).
 */
export async function withContext(
  fn: (ctx: { user: CurrentContext['user']; org: OrgContext }) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const h = await headers();

    // CSRF: si viene Origin (petición de navegador), debe coincidir con el Host. Peticiones sin
    // Origin (curl, server, clientes API) se permiten — la protección real es contra CSRF de navegador.
    const origin = h.get('origin');
    const host = h.get('host');
    if (origin && host) {
      let originHost = '';
      try {
        originHost = new URL(origin).host;
      } catch {
        originHost = '';
      }
      if (originHost !== host) {
        return NextResponse.json(
          { error: { code: 'CSRF', kind: 'AUTHORIZATION', message: 'Origin no permitido' } },
          { status: 403 },
        );
      }
    }

    // Rate limit por IP. Usamos el ÚLTIMO valor de X-Forwarded-For: es el que añade Caddy (el proxy de confianza)
    // = la IP real del cliente. El PRIMERO lo controla el cliente (spoofeable) → permitiría evadir o envenenar el
    // límite. Asume un único proxy de confianza delante (Caddy); en acceso directo (dev/LAN sin XFF) cae a 'local'.
    const xff = (h.get('x-forwarded-for') ?? '').split(',');
    const ip = xff[xff.length - 1]?.trim() || 'local';
    const rl = rateLimit(`api:${ip}`);
    if (!rl.ok) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', kind: 'TRANSIENT', message: 'Demasiadas peticiones' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }

    // E-14: se mide la petición entera (sesión + contexto + handler) y sale en `Server-Timing`, que el
    // navegador enseña en la pestaña Red sin herramientas extra.
    //   `db`    = SUMA de la latencia de las consultas (emisión → resultado, incluida la espera de conexión).
    //             No es tiempo de pared: si hay paralelismo puede superar a `total`, y eso es buena señal.
    //   `total` = la petición completa en el servidor.
    // Lo que se busca: si las páginas van lentas y `db` es bajo, el problema NO está en las consultas.
    const startedAt = performance.now();
    const { result, stats } = await withQueryStats(async () => {
      const ctx = await requireCurrentContext();
      return await fn(ctx);
    });
    const totalMs = performance.now() - startedAt;
    result.headers.set(
      'Server-Timing',
      `db;dur=${stats.totalMs.toFixed(1)};desc="suma de ${stats.count} consultas", total;dur=${totalMs.toFixed(1)}`,
    );
    return result;
  } catch (e) {
    return errorResponse(e);
  }
}

export function errorResponse(e: unknown): NextResponse {
  if (e instanceof z.ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', kind: 'VALIDATION', message: 'Datos inválidos', details: e.flatten() } },
      { status: 400 },
    );
  }
  if (isAppError(e)) {
    return NextResponse.json({ error: toClientError(e) }, { status: HTTP_STATUS_BY_KIND[e.kind] });
  }
  const status = (e as { status?: number })?.status ?? 500;
  const unauth = status === 401;
  return NextResponse.json(
    {
      error: {
        code: unauth ? 'UNAUTHENTICATED' : 'INTERNAL',
        kind: unauth ? 'AUTHENTICATION' : 'INTERNAL',
        message: unauth ? 'No autenticado' : 'Error interno',
      },
    },
    { status },
  );
}

export async function readJson(req: Request): Promise<unknown> {
  return req.json().catch(() => ({}));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida un identificador de ruta (`/api/v1/<recurso>/[id]`) antes de que llegue a la base de datos
 * (SECURITY_CHECKLIST §11, ítem 6).
 *
 * Sin esto, un id que no es UUID llegaba tal cual al `where id = $1` de una columna `uuid`, Postgres lo
 * rechazaba y salía un **`500 Error interno`** — comprobado. Un id mal formado es un error del cliente, no una
 * avería del servidor: 400 dice la verdad, y de paso deja de gastar una consulta y de ensuciar el log de
 * errores con ruido que no lo es.
 */
export function parseId(id: string, entity = 'registro'): string {
  if (!UUID_RE.test(id)) {
    throw new AppError({
      code: 'VALIDATION',
      kind: 'VALIDATION',
      message: `El identificador de ${entity} no es válido.`,
    });
  }
  return id;
}
