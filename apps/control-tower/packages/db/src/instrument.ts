import { AsyncLocalStorage } from 'node:async_hooks';
import { logger } from '@ct/shared';

/**
 * Medición de consultas (E-14). Existe porque el owner reporta **varios segundos por página en la Pi** y el
 * proyecto no tenía **ninguna** instrumentación: la primera nota de E-14 dice «medir primero, no suponer» y no
 * había con qué. Medido en el portátil, las mismas páginas tardan 12–27 ms, así que el número de consultas no
 * explica por sí solo lo que se ve en la Pi — hace falta el dato real, del hardware real.
 *
 * Cómo funciona: se envuelve `unsafe()` del cliente de postgres.js, que es por donde el driver de Drizzle ejecuta
 * **todas** las consultas (`client.unsafe(query, params)`, incluida la variante `.values()`). Se intercepta su
 * `then` en vez de encadenar uno propio: un `then` extra **dispararía la ejecución** —la Query de postgres.js es
 * perezosa— y rompería el `.values()` que Drizzle llama después. Así el objeto que se devuelve es el mismo, con
 * sus métodos intactos, y sólo se mide cuando alguien lo espera.
 *
 * Qué mide exactamente: **desde que se emite la consulta hasta que llega el resultado**, lo que incluye la
 * espera por una conexión libre del pool (`max: 10`). Es a propósito: esa espera es latencia que la petición
 * sufre igual, y si el pool se queda corto se ve aquí en vez de quedar invisible.
 *
 * Coste: un closure y dos `performance.now()` por consulta. Despreciable, y por eso va **siempre activo**: una
 * instrumentación que hay que activar es una que no está cuando hace falta.
 */

export interface QueryStats {
  /** Consultas ejecutadas dentro del ámbito. */
  count: number;
  /**
   * Suma de la latencia de todas las consultas (ms), medida **desde que se emite hasta que llega el
   * resultado**, así que incluye la espera por una conexión libre del pool. NO es tiempo de pared: las
   * consultas paralelas se solapan, y por eso esta suma puede ser MAYOR que la duración de la petición.
   * Que lo sea es buena señal (hay paralelismo); que una sola consulta tenga una latencia alta, no.
   */
  totalMs: number;
  /** La más lenta del ámbito, para saber a quién culpar sin leer todo el log. */
  slowest: { ms: number; sql: string } | null;
}

const store = new AsyncLocalStorage<QueryStats>();

/** Umbral (ms) a partir del cual una consulta se registra como lenta. `0` desactiva el aviso. */
function slowThresholdMs(): number {
  const raw = Number(process.env.DB_SLOW_QUERY_MS ?? 200);
  return Number.isFinite(raw) && raw >= 0 ? raw : 200;
}

/** `DB_LOG_QUERIES=true` registra TODAS las consultas con su duración. Para una sesión de diagnóstico, no para dejarlo puesto. */
function logAll(): boolean {
  return process.env.DB_LOG_QUERIES === 'true';
}

/** Recorta el SQL para el log: interesa reconocer la consulta, no reproducirla. Nunca lleva parámetros (podrían ser datos). */
function summarize(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/**
 * Ejecuta `fn` acumulando las consultas que haga (y las de todo lo que llame, gracias a `AsyncLocalStorage`).
 * Devuelve el resultado y las estadísticas. Anidar es seguro: el ámbito interno gana.
 */
export async function withQueryStats<T>(fn: () => Promise<T>): Promise<{ result: T; stats: QueryStats }> {
  const stats: QueryStats = { count: 0, totalMs: 0, slowest: null };
  const result = await store.run(stats, fn);
  return { result, stats };
}

/** Estadísticas del ámbito actual, o `null` fuera de uno. */
export function getQueryStats(): QueryStats | null {
  return store.getStore() ?? null;
}

function record(ms: number, sql: string, failed: boolean): void {
  const stats = store.getStore();
  if (stats) {
    stats.count++;
    stats.totalMs += ms;
    if (!stats.slowest || ms > stats.slowest.ms) stats.slowest = { ms, sql: summarize(sql) };
  }
  const threshold = slowThresholdMs();
  if (logAll()) {
    logger.debug('consulta', { ms: Math.round(ms), failed, sql: summarize(sql) });
  } else if (threshold > 0 && ms >= threshold) {
    // A warn a propósito: en la Pi se lee con `docker logs` y esto es lo que hay que ver sin filtrar nada.
    logger.warn('consulta lenta', { ms: Math.round(ms), thresholdMs: threshold, sql: summarize(sql) });
  }
}

/** Marca para no envolver dos veces el mismo cliente (`getSql()` cachea, pero los tests crean varios). */
const INSTRUMENTED = Symbol.for('ct.db.instrumented');

/**
 * Envuelve `unsafe()` del cliente para medir cada consulta. Idempotente y sin cambiar el objeto devuelto por
 * `unsafe` (Drizzle le encadena `.values()`).
 */
export function instrumentSql<T extends { unsafe: (...args: never[]) => unknown }>(sql: T): T {
  const marked = sql as T & { [INSTRUMENTED]?: boolean };
  if (marked[INSTRUMENTED]) return sql;

  type Thenable = { then: (ok?: (v: unknown) => unknown, err?: (e: unknown) => unknown) => unknown };
  const original = sql.unsafe.bind(sql) as (...args: unknown[]) => unknown;

  (sql as { unsafe: unknown }).unsafe = (...args: unknown[]) => {
    const query = original(...args) as Thenable;
    const startedAt = performance.now();
    const originalThen = query.then.bind(query);
    // Se REEMPLAZA `then` (no se encadena otro): encadenar dispararía la ejecución de la Query perezosa.
    query.then = (ok, err) =>
      originalThen(
        (value) => {
          record(performance.now() - startedAt, String(args[0] ?? ''), false);
          return ok ? ok(value) : value;
        },
        (error) => {
          record(performance.now() - startedAt, String(args[0] ?? ''), true);
          if (err) return err(error);
          throw error;
        },
      );
    return query;
  };

  marked[INSTRUMENTED] = true;
  return sql;
}
