import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  captureKnowledge,
  promoteInboxToItem,
  discardInboxItem,
  updateKnowledgeItemStatus,
  createDecision,
  updateDecisionStatus,
  supersedeDecision,
  createDocument,
  createAsset,
  updateAssetStatus,
  listInbox,
  updateDecision,
  getDecisionLinks,
  updateInboxItem,
  purgeProcessedInbox,
  createReviewItem,
  updateReviewItem,
  updateReviewItemStatus,
  listReviewItems,
  promoteReviewItemToKnowledge,
  listKnowledgeItems,
  purgeReviewedItems,
  type OrgContext,
} from '@ct/application';

/** M07 — casos de uso del módulo Knowledge contra PostgreSQL real (aislados por transacción). */
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

async function makeOrg(tx: typeof db, role: OrgContext['role'] = 'OWNER'): Promise<OrgContext> {
  const organizationId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const slug = `k-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role });
  return { userId, organizationId, role };
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('knowledge use cases', () => {
  it('captura → promueve a item (DRAFT) y marca inbox PROCESSED', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const capture = await captureKnowledge(tx, ctx, { rawContent: 'idea suelta', sourceType: 'CHATGPT' });
      expect(capture.status).toBe('NEW');
      const item = await promoteInboxToItem(tx, ctx, capture.id, { title: 'Patrón X', knowledgeType: 'PATTERN' });
      expect(item.status).toBe('DRAFT');
      expect(item.sourceType).toBe('CHATGPT');
      const [inbox] = await tx.select().from(s.knowledgeInbox).where(eq(s.knowledgeInbox.id, capture.id));
      expect(inbox!.status).toBe('PROCESSED');
    });
  });

  it('no se puede promover una captura ya resuelta', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const capture = await captureKnowledge(tx, ctx, { rawContent: 'x' });
      await discardInboxItem(tx, ctx, capture.id);
      await expect(
        promoteInboxToItem(tx, ctx, capture.id, { title: 'T', knowledgeType: 'NOTE' }),
      ).rejects.toMatchObject({ code: 'INBOX_ALREADY_RESOLVED' });
    });
  });

  it('knowledge item lifecycle DRAFT→REVIEW→APPROVED con timestamps', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const capture = await captureKnowledge(tx, ctx, { rawContent: 'x' });
      const item = await promoteInboxToItem(tx, ctx, capture.id, { title: 'T', knowledgeType: 'NOTE' });
      const reviewed = await updateKnowledgeItemStatus(tx, ctx, item.id, 'REVIEW');
      expect(reviewed.reviewedAt).not.toBeNull();
      const approved = await updateKnowledgeItemStatus(tx, ctx, item.id, 'APPROVED');
      expect(approved.approvedAt).not.toBeNull();
    });
  });

  /** Los SOP son la Biblioteca acotada a `PROCESS` (owner 2026-09-02): sin ese filtro, «Negocio › Procesos» lo
   *  listaría todo. Un tipo de más en la vista no rompe nada visiblemente, así que conviene un test. */
  it('listKnowledgeItems acota por tipo: la vista de Procesos sólo ve los PROCESS', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const sop = await promoteInboxToItem(tx, ctx, (await captureKnowledge(tx, ctx, { rawContent: 'x' })).id, {
        title: 'SOP de oportunidades',
        knowledgeType: 'PROCESS',
      });
      await promoteInboxToItem(tx, ctx, (await captureKnowledge(tx, ctx, { rawContent: 'y' })).id, {
        title: 'Una nota cualquiera',
        knowledgeType: 'NOTE',
      });

      expect(await listKnowledgeItems(tx, ctx)).toHaveLength(2);
      const procesos = await listKnowledgeItems(tx, ctx, { knowledgeType: 'PROCESS' });
      expect(procesos.map((p) => p.id)).toEqual([sop.id]);
    });
  });

  it('decision: aprobar setea decided_at; supersede sólo desde APPROVED', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const dec = await createDecision(tx, ctx, { title: 'Usar X', decision: 'X' });
      expect(dec.status).toBe('DRAFT');
      await expect(supersedeDecision(tx, ctx, dec.id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
      await updateDecisionStatus(tx, ctx, dec.id, 'REVIEW');
      const approved = await updateDecisionStatus(tx, ctx, dec.id, 'APPROVED');
      expect(approved.decidedAt).not.toBeNull();
      const superseded = await supersedeDecision(tx, ctx, dec.id);
      expect(superseded.status).toBe('SUPERSEDED');
    });
  });

  it('asset lifecycle DRAFT→ACTIVE→DEPRECATED', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const asset = await createAsset(tx, ctx, { name: 'Template', assetType: 'TEMPLATE' });
      const active = await updateAssetStatus(tx, ctx, asset.id, 'ACTIVE');
      expect(active.status).toBe('ACTIVE');
      await expect(updateAssetStatus(tx, ctx, asset.id, 'DRAFT')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    });
  });

  it('documento se crea como referencia con scope de organización', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const doc = await createDocument(tx, ctx, { name: 'Spec', externalUrl: 'https://drive.example/doc' });
      expect(doc.organizationId).toBe(ctx.organizationId);
      expect(doc.externalUrl).toBe('https://drive.example/doc');
    });
  });

  it('rechaza decisión con projectId de otra organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      const [projB] = await tx
        .insert(s.projects)
        .values({ organizationId: b.organizationId, name: 'B', slug: `b-${crypto.randomUUID().slice(0, 8)}`, status: 'PLANNED', priority: 'LOW' })
        .returning();
      await expect(
        createDecision(tx, a, { title: 'x', decision: 'y', projectId: projB!.id }),
      ).rejects.toMatchObject({ kind: 'NOT_FOUND' });
    });
  });

  it('listInbox filtra por organización', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await captureKnowledge(tx, a, { rawContent: 'A' });
      await captureKnowledge(tx, b, { rawContent: 'B' });
      const listA = await listInbox(tx, a);
      expect(listA).toHaveLength(1);
    });
  });

  // --- A-2 (ADR-006): enlace de reemplazo entre decisiones ---
  it('A-2: supersede enlaza la nueva con la antigua y marca la antigua SUPERSEDED', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const vieja = await createDecision(tx, ctx, { title: 'Vieja', decision: 'Usar X' });
      await updateDecisionStatus(tx, ctx, vieja.id, 'REVIEW');
      await updateDecisionStatus(tx, ctx, vieja.id, 'APPROVED');
      const nueva = await createDecision(tx, ctx, { title: 'Nueva', decision: 'Usar Y' });

      await supersedeDecision(tx, ctx, vieja.id, nueva.id);

      const links = await getDecisionLinks(tx, ctx, nueva.id);
      expect(links.supersedes?.id).toBe(vieja.id);
      const inverso = await getDecisionLinks(tx, ctx, vieja.id);
      expect(inverso.supersededBy?.id).toBe(nueva.id);
      const [row] = await tx.select().from(s.decisions).where(eq(s.decisions.id, vieja.id));
      expect(row!.status).toBe('SUPERSEDED');
    });
  });

  it('A-2: se rechaza auto-reemplazo y un segundo reemplazo de la misma decisión', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const vieja = await createDecision(tx, ctx, { title: 'V', decision: 'X' });
      await updateDecisionStatus(tx, ctx, vieja.id, 'REVIEW');
      await updateDecisionStatus(tx, ctx, vieja.id, 'APPROVED');
      const n1 = await createDecision(tx, ctx, { title: 'N1', decision: 'Y' });
      const n2 = await createDecision(tx, ctx, { title: 'N2', decision: 'Z' });

      await expect(supersedeDecision(tx, ctx, vieja.id, vieja.id)).rejects.toMatchObject({
        code: 'DECISION_SELF_SUPERSEDE',
      });
      await supersedeDecision(tx, ctx, vieja.id, n1.id);
      await expect(supersedeDecision(tx, ctx, vieja.id, n2.id)).rejects.toMatchObject({
        code: 'DECISION_ALREADY_SUPERSEDED',
      });
    });
  });

  it('A-2: fijar «reemplaza a» desde updateDecision (panel) hace las dos cosas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const vieja = await createDecision(tx, ctx, { title: 'V', decision: 'X' });
      await updateDecisionStatus(tx, ctx, vieja.id, 'REVIEW');
      await updateDecisionStatus(tx, ctx, vieja.id, 'APPROVED');
      const nueva = await createDecision(tx, ctx, { title: 'N', decision: 'Y' });

      const row = await updateDecision(tx, ctx, nueva.id, { supersedesDecisionId: vieja.id });
      expect(row.supersedesDecisionId).toBe(vieja.id);
      const [old] = await tx.select().from(s.decisions).where(eq(s.decisions.id, vieja.id));
      expect(old!.status).toBe('SUPERSEDED');
    });
  });

  // El owner reportó knowledge items con el Resumen vacío tras procesarlos desde la bandeja.
  it('promover una captura lleva el texto capturado al Resumen del elemento', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const cap = await captureKnowledge(tx, ctx, { rawContent: 'Texto capturado desde ChatGPT', sourceType: 'MANUAL' });
      const item = await promoteInboxToItem(tx, ctx, cap.id, {});
      expect(item.summary).toBe('Texto capturado desde ChatGPT');
    });
  });

  it('si la captura se edita antes de procesarla, se promueve el texto EDITADO', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const cap = await captureKnowledge(tx, ctx, { rawContent: 'primera versión', sourceType: 'MANUAL' });
      await updateInboxItem(tx, ctx, cap.id, { rawContent: 'descripción corregida en el panel', title: 'Mi nota' });
      const item = await promoteInboxToItem(tx, ctx, cap.id, {});
      expect(item.summary).toBe('descripción corregida en el panel');
      expect(item.title).toBe('Mi nota');
    });
  });

  it('la purga borra las capturas resueltas (decisión del owner: no se guardan dos copias)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const cap = await captureKnowledge(tx, ctx, { rawContent: 'texto capturado', sourceType: 'MANUAL' });
      const item = await promoteInboxToItem(tx, ctx, cap.id, {});
      // El texto ya vive en la biblioteca…
      expect(item.summary).toBe('texto capturado');
      // …así que la captura resuelta se borra sin esperar ninguna ventana de retención.
      expect((await purgeProcessedInbox(tx, ctx)).deleted).toBe(1);
      expect(await listInbox(tx, ctx)).toHaveLength(0);
    });
  });

  // «Por revisar»: cola de artículos/vídeos/libros pendientes.
  it('un elemento por revisar nace pendiente y al marcarlo revisado sella la fecha', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const r = await createReviewItem(tx, ctx, {
        title: 'Artículo sobre outbox',
        url: 'https://example.com/outbox',
        kind: 'ARTICLE',
        sector: 'Programación',
      });
      expect(r.status).toBe('TO_REVIEW');
      expect(r.reviewedAt).toBeNull();

      // Se puede mover libremente mientras no esté revisado (la cola es una bandeja de trabajo).
      const leyendo = await updateReviewItemStatus(tx, ctx, r.id, 'REVIEWING');
      expect(leyendo.reviewedAt).toBeNull();

      const done = await updateReviewItemStatus(tx, ctx, r.id, 'REVIEWED');
      expect(done.reviewedAt).not.toBeNull();

      expect((await listReviewItems(tx, ctx)).map((x) => x.title)).toContain('Artículo sobre outbox');
      expect(await listReviewItems(tx, ctx, { status: 'REVIEWED' })).toHaveLength(1);
    });
  });

  /**
   * REVISADO es terminal (`isReviewItemFrozen`, petición del owner 2026-09-01). Deshacerlo reescribiría el
   * pasado: se perdería el `reviewed_at` y un recurso quizá ya procesado volvería a la cola como si nunca se
   * hubiera mirado. Y editarlo dejaría el registro diciendo que revisaste algo que ya no es lo que hay.
   */
  it('un recurso revisado no se puede devolver a la cola ni editar', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const r = await createReviewItem(tx, ctx, { title: 'Ya lo leí', url: 'https://example.com/a' });
      await updateReviewItemStatus(tx, ctx, r.id, 'REVIEWED');

      // Ningún camino de vuelta, ni a la cola ni al descarte.
      for (const destino of ['TO_REVIEW', 'REVIEWING', 'DISCARDED'] as const) {
        await expect(updateReviewItemStatus(tx, ctx, r.id, destino)).rejects.toMatchObject({
          code: 'REVIEW_ITEM_REVIEWED',
        });
      }
      // Tampoco se editan sus campos.
      await expect(updateReviewItem(tx, ctx, r.id, { title: 'Otro título' })).rejects.toMatchObject({
        code: 'REVIEW_ITEM_REVIEWED',
      });

      // Reenviar el MISMO estado es un no-op, no un error (la UI puede repetir el envío).
      const same = await updateReviewItemStatus(tx, ctx, r.id, 'REVIEWED');
      expect(same.status).toBe('REVIEWED');

      // Nada cambió, y el sello de revisión sigue en su sitio.
      const [after] = await listReviewItems(tx, ctx);
      expect(after!.title).toBe('Ya lo leí');
      expect(after!.reviewedAt).not.toBeNull();

      // Y lo importante: seguir hacia la biblioteca SÍ se puede (procesar no modifica el recurso, lo enlaza).
      const item = await promoteReviewItemToKnowledge(tx, ctx, r.id);
      expect(item.title).toBe('Ya lo leí');
    });
  });

  it('pasar a la biblioteca un recurso revisado lo crea APROBADO y lo enlaza (una sola vez)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const r = await createReviewItem(tx, ctx, {
        title: 'Guía de outbox transaccional',
        url: 'https://example.com/outbox',
        kind: 'ARTICLE',
        sector: 'Programación',
        notes: 'Explica el patrón con ejemplos.',
      });

      // Aún sin revisar: no se puede pasar (no se ha "decidido" nada todavía).
      await expect(promoteReviewItemToKnowledge(tx, ctx, r.id)).rejects.toMatchObject({
        code: 'REVIEW_ITEM_NOT_REVIEWED',
      });

      await updateReviewItemStatus(tx, ctx, r.id, 'REVIEWED');
      const item = await promoteReviewItemToKnowledge(tx, ctx, r.id);
      expect(item.status).toBe('APPROVED'); // entra aprobado, no como borrador
      expect(item.knowledgeType).toBe('REFERENCE');
      expect(item.sector).toBe('Programación');
      expect(item.sourceUrl).toBe('https://example.com/outbox');
      expect(item.summary).toBe('Explica el patrón con ejemplos.');

      // Queda enlazado y no se puede duplicar en la biblioteca.
      const [after] = await listReviewItems(tx, ctx);
      expect(after!.knowledgeItemId).toBe(item.id);
      await expect(promoteReviewItemToKnowledge(tx, ctx, r.id)).rejects.toMatchObject({
        code: 'REVIEW_ITEM_ALREADY_PROMOTED',
      });
      expect(await listKnowledgeItems(tx, ctx)).toHaveLength(1);
    });
  });

  /**
   * La retención sólo puede tirar lo que ya no es la única copia: un REVISADO sin procesar guarda su título,
   * su enlace y tus notas y no vive en ningún otro sitio. Antes se borraba — era pérdida de información.
   */
  it('la purga de «Por revisar» exige que el revisado esté ya en la biblioteca', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const pendiente = await createReviewItem(tx, ctx, { title: 'Sigo pendiente' });
      const sinProcesar = await createReviewItem(tx, ctx, { title: 'Revisado sin procesar' });
      const procesado = await createReviewItem(tx, ctx, { title: 'Revisado y procesado' });
      await updateReviewItemStatus(tx, ctx, sinProcesar.id, 'REVIEWED');
      await updateReviewItemStatus(tx, ctx, procesado.id, 'REVIEWED');
      await promoteReviewItemToKnowledge(tx, ctx, procesado.id);

      // Sin política no se borra nada (conservar es el comportamiento por defecto).
      expect((await purgeReviewedItems(tx, ctx)).deleted).toBe(0);
      // Con política, pero recién resuelto: aún no toca.
      expect((await purgeReviewedItems(tx, ctx, { retentionDays: 30 })).deleted).toBe(0);

      // Fuera de plazo cae SÓLO el que ya está en la biblioteca.
      const enUnMes = new Date(Date.now() + 31 * 86_400_000);
      expect((await purgeReviewedItems(tx, ctx, { retentionDays: 30, now: enUnMes })).deleted).toBe(1);

      const quedan = await listReviewItems(tx, ctx);
      expect(quedan.map((r) => r.id).sort()).toEqual([pendiente.id, sinProcesar.id].sort());
    });
  });
});
