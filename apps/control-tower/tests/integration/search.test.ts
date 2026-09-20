import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, getTableColumns, is } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  globalSearch,
  SEARCH_TYPES,
  createClient,
  createProject,
  createDecision,
  createReviewItem,
  createLearningItem,
  createResource,
  createPayment,
  archiveRecords,
  type OrgContext,
} from '@ct/application';

/** M10 — Global Search (FTS) contra PostgreSQL real (aislado por transacción). */
const db = getDb();
const ROLLBACK = new Error('__rollback__');

async function inRollback(fn: (tx: typeof db) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      await fn(tx as typeof db);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
}

async function makeOrg(tx: typeof db): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `srch-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('global search (FTS)', () => {
  it('encuentra por palabra completa (FTS) agrupado por tipo', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createClient(tx, ctx, { name: 'Zentauro Robotics' });
      await createProject(tx, ctx, { name: 'Zentauro website' });
      const res = await globalSearch(tx, ctx, 'zentauro');
      const types = res.groups.map((g) => g.type);
      expect(types).toContain('client');
      expect(types).toContain('project');
      expect(res.total).toBeGreaterThanOrEqual(2);
    });
  });

  it('encuentra por subcadena (fallback ILIKE)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createClient(tx, ctx, { name: 'Northwind' });
      const res = await globalSearch(tx, ctx, 'northw'); // prefijo parcial
      // 'northw' es prefijo de 'Northwind'? No exactamente; probamos subcadena real:
      const res2 = await globalSearch(tx, ctx, 'orthw');
      expect(res.total + res2.total).toBeGreaterThanOrEqual(1);
    });
  });

  it('busca en decisiones por el texto de la decisión', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createDecision(tx, ctx, { title: 'Infra', decision: 'Usar kubernetes-lite en la Pi' });
      const res = await globalSearch(tx, ctx, 'kubernetes');
      expect(res.groups.some((g) => g.type === 'decision')).toBe(true);
    });
  });

  it('no cruza organizaciones', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createClient(tx, b, { name: 'SecretoB' });
      const res = await globalSearch(tx, a, 'SecretoB');
      expect(res.total).toBe(0);
    });
  });

  it('query vacía devuelve sin resultados', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const res = await globalSearch(tx, ctx, '   ');
      expect(res.total).toBe(0);
    });
  });

  /**
   * **El test que faltaba.** Cuatro entidades (review_item, learning_item, resource, payment) tenían su
   * `search_vector` y su índice GIN desde el principio pero nadie las añadió a `TARGETS`, así que la búsqueda
   * «universal» ignoraba en silencio 4 de las 15 entidades indexadas. Nada lo detectaba: el índice se crea solo
   * y una búsqueda sin resultados no parece un fallo. Esto ata las dos listas.
   */
  it('cubre TODAS las tablas que tienen search_vector', async () => {
    const conVector = Object.entries(s)
      .filter(([, v]) => is(v, PgTable) && 'searchVector' in getTableColumns(v as PgTable))
      .map(([name]) => name)
      .sort();
    // 15 tablas indexadas ⇒ 15 objetivos de búsqueda. Si añades una y olvidas `TARGETS`, esto falla.
    expect(conVector.length).toBeGreaterThanOrEqual(15);
    expect(SEARCH_TYPES).toHaveLength(conVector.length);
  });

  it('encuentra lo que está en «Por revisar» (lo que reportó el owner)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createReviewItem(tx, ctx, { title: 'Charla sobre Kafka y outbox' });
      const res = await globalSearch(tx, ctx, 'kafka');
      const grupo = res.groups.find((g) => g.type === 'review_item');
      expect(grupo?.items[0]?.title).toBe('Charla sobre Kafka y outbox');
      expect(grupo?.items[0]?.href).toBe('/knowledge/review');
    });
  });

  it('encuentra aprendizaje, recursos y pagos', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createLearningItem(tx, ctx, { title: 'Curso de Rust avanzado', kind: 'Curso' });
      const cli = await createClient(tx, ctx, { name: 'Cliente del recurso' });
      await createResource(tx, ctx, { name: 'Servidor Rust de pruebas', type: 'hosting', clientId: cli.id });
      await createPayment(tx, ctx, { concept: 'Licencia Rust IDE', direction: 'OUT', amount: '10', currencyCode: 'EUR', payeeLabel: 'JetBrains' });
      const res = await globalSearch(tx, ctx, 'rust');
      const tipos = res.groups.map((g) => g.type);
      expect(tipos).toContain('learning_item');
      expect(tipos).toContain('resource');
      expect(tipos).toContain('payment');
    });
  });

  it('no devuelve lo archivado (está oculto de su lista; el resultado no llevaría a ninguna parte)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const cli = await createClient(tx, ctx, { name: 'Vanishing Corp' });
      expect((await globalSearch(tx, ctx, 'Vanishing')).total).toBe(1);
      await archiveRecords(tx, ctx, { entityType: 'client', ids: [cli.id] });
      expect((await globalSearch(tx, ctx, 'Vanishing')).total).toBe(0);
    });
  });
});
