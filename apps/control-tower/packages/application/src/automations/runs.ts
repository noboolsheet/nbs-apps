import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { automationRuns } from '@ct/db/schema';
import { orgEq, type OrgContext } from '../auth/index';

/**
 * E-8 — **huella de los barridos** (owner 2026-09-27). Una fila por ejecución, con lo que hizo.
 *
 * Los barridos no pasan por la cola `jobs`: corren en el tick del worker, así que hasta ahora lo único que dejaban
 * era una línea en el log del contenedor. Con dos de ellos archivando y borrando datos, «¿corrió?, ¿qué hizo?» tenía
 * que poder responderse desde la app.
 */

export interface AutomationRun {
  automationKey: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  startedAt: Date;
  finishedAt: Date;
}

/**
 * Registra una ejecución. **No lanza nunca**: es una anotación, y si fallara no puede tumbar el barrido que la
 * escribe (ni dejar a medias el borrado que ese barrido acabó de hacer). Si falla, se pierde la anotación y se ve en
 * el log, que es exactamente donde estábamos antes.
 */
export async function recordAutomationRun(
  db: Database,
  ctx: OrgContext,
  input: {
    automationKey: string;
    startedAt: Date;
    result?: Record<string, unknown> | null;
    error?: string | null;
    /** Por defecto se deduce: con `error` es FAILED; con `skipped`/`blocked` > 0, «con advertencias». */
    status?: string;
  },
): Promise<void> {
  const status =
    input.status ??
    (input.error ? 'FAILED' : hasWarnings(input.result) ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED');
  try {
    await db.insert(automationRuns).values({
      organizationId: ctx.organizationId,
      automationKey: input.automationKey,
      status,
      result: input.result ?? null,
      error: input.error ?? null,
      startedAt: input.startedAt,
      finishedAt: new Date(),
    });
  } catch {
    // Anotar no puede romper lo anotado.
  }
}

/**
 * «Con advertencias» = el barrido corrió pero dejó algo sin hacer, y eso hay que poder verlo sin abrir el resultado:
 * `skipped` (la purga conservó filas que algo vivo aún usa) o `blocked`.
 */
function hasWarnings(result: Record<string, unknown> | null | undefined): boolean {
  if (!result) return false;
  return ['skipped', 'blocked'].some((k) => typeof result[k] === 'number' && (result[k] as number) > 0);
}

/** La última ejecución de una automatización en esta organización, o `null` si nunca ha corrido. */
export async function getLastAutomationRun(
  db: Database,
  ctx: OrgContext,
  automationKey: string,
): Promise<AutomationRun | null> {
  const [row] = await db
    .select({
      automationKey: automationRuns.automationKey,
      status: automationRuns.status,
      result: automationRuns.result,
      error: automationRuns.error,
      startedAt: automationRuns.startedAt,
      finishedAt: automationRuns.finishedAt,
    })
    .from(automationRuns)
    .where(and(orgEq(automationRuns.organizationId, ctx), eq(automationRuns.automationKey, automationKey)))
    .orderBy(desc(automationRuns.startedAt))
    .limit(1);
  return row ? { ...row, result: (row.result as Record<string, unknown> | null) ?? null } : null;
}

/**
 * Retención: conserva las `keepPerKey` más recientes de cada automatización. Con seis barridos diarios esto crece
 * ~2.200 filas al año si no se toca; no es un registro legal, es «qué pasó últimamente» (mismo criterio que
 * `sync_runs`, F-16).
 */
export async function purgeOldAutomationRuns(
  db: Database,
  ctx: OrgContext,
  opts: { keepPerKey?: number } = {},
): Promise<{ deleted: number }> {
  const keep = opts.keepPerKey ?? 50;
  const rows = await db
    .select({ id: automationRuns.id, key: automationRuns.automationKey })
    .from(automationRuns)
    .where(orgEq(automationRuns.organizationId, ctx))
    .orderBy(desc(automationRuns.startedAt));
  const seen = new Map<string, number>();
  const toDelete: string[] = [];
  for (const r of rows) {
    const n = (seen.get(r.key) ?? 0) + 1;
    seen.set(r.key, n);
    if (n > keep) toDelete.push(r.id);
  }
  if (toDelete.length === 0) return { deleted: 0 };
  let deleted = 0;
  // De 200 en 200: un `inArray` con miles de ids genera una consulta enorme.
  for (let i = 0; i < toDelete.length; i += 200) {
    const batch = toDelete.slice(i, i + 200);
    const done = await db
      .delete(automationRuns)
      .where(and(orgEq(automationRuns.organizationId, ctx), inArray(automationRuns.id, batch)))
      .returning({ id: automationRuns.id });
    deleted += done.length;
  }
  return { deleted };
}
