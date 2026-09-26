import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createClient,
  createNote,
  createProject,
  createTask,
  deleteNote,
  deleteTasks,
  listNotes,
  updateNote,
  archiveRecords,
  purgeArchivedRecords,
  type OrgContext,
} from '@ct/application';

/**
 * E-15 — notas por registro contra PostgreSQL real. Lo que de verdad hay que atar aquí no es el CRUD, es el
 * borrado: la tabla es POLIMÓRFICA (no hay FK que arrastre las notas), así que el día que un camino de borrado
 * duro se olvide de llamar a `deleteRecordTraces`, las notas quedan huérfanas y sin pantalla desde la que
 * verlas. Eso es lo que comprueban los dos últimos tests.
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
  const slug = `nt-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

beforeAll(() => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL requerido para los tests de integración');
});
afterAll(async () => {
  await closeDb();
});

describe('notas por registro (E-15)', () => {
  it('se crean, se listan con su autor y se editan y borran', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const client = await createClient(tx, ctx, { name: 'Cliente con notas' });

      const note = await createNote(tx, ctx, {
        entityType: 'client',
        entityId: client.id,
        body: 'Hablado con el cliente: mueve la entrega a marzo.',
      });
      const rows = await listNotes(tx, ctx, 'client', client.id);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.body).toContain('marzo');
      expect(rows[0]!.mine).toBe(true);
      expect(rows[0]!.authorName).not.toBeNull(); // el autor se resuelve en la consulta, no en otra llamada

      await updateNote(tx, ctx, note.id, { body: 'Corregido: la entrega se mueve a abril.' });
      const edited = await listNotes(tx, ctx, 'client', client.id);
      expect(edited[0]!.body).toContain('abril');

      await deleteNote(tx, ctx, note.id);
      expect(await listNotes(tx, ctx, 'client', client.id)).toHaveLength(0);
    });
  });

  it('rechaza una nota vacía y una entidad que no admite notas', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const client = await createClient(tx, ctx, { name: 'Cliente' });
      await expect(createNote(tx, ctx, { entityType: 'client', entityId: client.id, body: '   ' })).rejects.toThrow();
      // `integration` no está en NOTE_TARGETS: sin esta guarda la nota se crearía y NO se vería en ningún sitio.
      await expect(
        createNote(tx, ctx, { entityType: 'integration', entityId: client.id, body: 'nota' }),
      ).rejects.toThrow();
    });
  });

  it('no deja notas huérfanas al borrar la tarea a la que pertenecen', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const project = await createProject(tx, ctx, { name: 'Proyecto' });
      const task = await createTask(tx, ctx, { title: 'Tarea', projectId: project.id });
      await createNote(tx, ctx, { entityType: 'task', entityId: task.id, body: 'nota de la tarea' });

      await deleteTasks(tx, ctx, [task.id]);

      const left = await tx
        .select({ id: s.notes.id })
        .from(s.notes)
        .where(and(eq(s.notes.entityType, 'task'), eq(s.notes.entityId, task.id)));
      expect(left).toHaveLength(0);
    });
  });

  it('no deja notas huérfanas cuando la purga de archivados borra el registro', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const client = await createClient(tx, ctx, { name: 'Cliente a purgar' });
      await createNote(tx, ctx, { entityType: 'client', entityId: client.id, body: 'nota del cliente' });

      await archiveRecords(tx, ctx, { entityType: 'client', ids: [client.id] });
      // Archivado "hace 30 días" para que entre en la ventana de retención.
      await tx.execute(sql`update clients set archived_at = now() - interval '30 days' where id = ${client.id}`);
      await purgeArchivedRecords(tx, ctx, { retentionDays: 1 });

      const left = await tx
        .select({ id: s.notes.id })
        .from(s.notes)
        .where(and(eq(s.notes.entityType, 'client'), eq(s.notes.entityId, client.id)));
      expect(left).toHaveLength(0);
    });
  });
});
