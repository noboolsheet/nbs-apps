import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sql, and, eq } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  listQuickNotes,
  createQuickNote,
  updateQuickNote,
  deleteQuickNote,
  fileQuickNote,
  getHomeDashboard,
  type OrgContext,
} from '@ct/application';

/**
 * M44 — **bloc de notas rápidas** del Inicio. Lo que se comprueba: una nota entra, se puede reescribir, y sale por
 * una de sus dos puertas —**destino** (y aparece el registro creado con su texto) o **descarte**— sin quedarse a
 * medias en ningún caso. Es el riesgo real de este cajón: perder una idea, o duplicarla.
 */
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
  const slug = `qn-${crypto.randomUUID().slice(0, 8)}`;
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

describe('bloc de notas rápidas', () => {
  it('anota, lista y reescribe', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Mirar si conviene facturar por hitos' });
      expect((await listQuickNotes(tx, ctx)).map((x) => x.id)).toEqual([n.id]);
      const edit = await updateQuickNote(tx, ctx, n.id, { body: 'Facturar por hitos: preguntar al asesor' });
      expect(edit.body).toContain('asesor');
    });
  });

  it('una nota vacía o de espacios se rechaza (en el Zod y en la base)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await expect(createQuickNote(tx, ctx, { body: '   ' })).rejects.toThrow();
      expect(await listQuickNotes(tx, ctx)).toEqual([]);
    });
  });

  it('descartar la borra, y su texto queda en la auditoría (es lo único que queda)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Idea que no lleva a ninguna parte' });
      await deleteQuickNote(tx, ctx, n.id);
      expect(await listQuickNotes(tx, ctx)).toEqual([]);
      const [audit] = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.entityType, 'quick_note'), eq(s.auditLogs.action, 'DELETE')));
      expect((audit!.metadata as { reason: string; body: string }).reason).toBe('discarded');
      expect((audit!.metadata as { body: string }).body).toContain('ninguna parte');
    });
  });

  it('convertir en TAREA crea una tarea personal con el título y el cuerpo, y vacía la nota', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Llamar al banco\nPreguntar por la comisión de las transferencias' });
      const res = await fileQuickNote(tx, ctx, n.id, { destination: 'task' });

      expect(res.destination).toBe('task');
      const [task] = await tx.select().from(s.tasks).where(eq(s.tasks.id, res.entityId));
      expect(task!.title).toBe('Llamar al banco');
      expect(task!.description).toContain('comisión');
      expect(task!.personal).toBe(true); // una idea suelta no es de ningún proyecto
      expect(task!.projectId).toBeNull();
      expect(await listQuickNotes(tx, ctx)).toEqual([]);
    });
  });

  it('convertir en DECISIÓN de una nota de una línea usa esa línea como decisión (el campo es obligatorio)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Dejar de usar Vercel para los proyectos propios' });
      const res = await fileQuickNote(tx, ctx, n.id, { destination: 'decision' });
      const [dec] = await tx.select().from(s.decisions).where(eq(s.decisions.id, res.entityId));
      expect(dec!.title).toBe('Dejar de usar Vercel para los proyectos propios');
      expect(dec!.decision).toBe('Dejar de usar Vercel para los proyectos propios');
      expect(dec!.status).toBe('DRAFT');
    });
  });

  it('convertir en CONOCIMIENTO deja el cuerpo en el resumen', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Drizzle y las transacciones\nUn comando que abre su propia tx no se puede anidar.' });
      const res = await fileQuickNote(tx, ctx, n.id, { destination: 'knowledge_item' });
      const [item] = await tx.select().from(s.knowledgeItems).where(eq(s.knowledgeItems.id, res.entityId));
      expect(item!.title).toBe('Drizzle y las transacciones');
      expect(item!.summary).toContain('no se puede anidar');
    });
  });

  it('convertir en POR REVISAR aprovecha el enlace pegado en la nota', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Leer https://example.com/post cuando pueda' });
      const res = await fileQuickNote(tx, ctx, n.id, { destination: 'review_item' });
      const [item] = await tx.select().from(s.reviewItems).where(eq(s.reviewItems.id, res.entityId));
      expect(item!.url).toBe('https://example.com/post');
      expect(item!.status).toBe('TO_REVIEW');
    });
  });

  it('el destino deja rastro que enlaza al registro creado (lo usa la Actividad reciente)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Nota que acaba en tarea' });
      const res = await fileQuickNote(tx, ctx, n.id, { destination: 'task' });
      const [audit] = await tx
        .select()
        .from(s.auditLogs)
        .where(and(eq(s.auditLogs.entityType, 'quick_note'), eq(s.auditLogs.action, 'DELETE')));
      expect(audit!.metadata).toMatchObject({ reason: 'filed', targetType: 'task', targetId: res.entityId });
    });
  });

  it('un destino inventado se rechaza y la nota NO se toca', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const n = await createQuickNote(tx, ctx, { body: 'Sigue aquí' });
      await expect(fileQuickNote(tx, ctx, n.id, { destination: 'payment' })).rejects.toThrow();
      expect((await listQuickNotes(tx, ctx)).map((x) => x.id)).toEqual([n.id]);
    });
  });

  it('el bloc está aislado por organización y llega al dashboard', async () => {
    await inRollback(async (tx) => {
      const a = await makeOrg(tx);
      const b = await makeOrg(tx);
      await createQuickNote(tx, b, { body: 'Nota de B' });
      expect(await listQuickNotes(tx, a)).toEqual([]);
      const home = await getHomeDashboard(tx, b);
      expect(home.quickNotes.map((x) => x.body)).toEqual(['Nota de B']);
    });
  });
});
