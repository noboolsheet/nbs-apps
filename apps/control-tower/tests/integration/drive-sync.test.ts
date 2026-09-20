import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import { syncDrive, type OrgContext } from '@ct/application';
import { DriveAdapter, type DriveDataSource, type DriveRawFile } from '@ct/integrations';

/** M15 — sync idempotente de Google Drive con DataSource fixture (sin Drive real). */
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
  const slug = `dr-${crypto.randomUUID().slice(0, 8)}`;
  await tx.insert(s.organizations).values({ id: organizationId, name: slug, slug, status: 'ACTIVE' });
  await tx.insert(s.users).values({ id: userId, name: slug, email: `${slug}@ex.com` });
  await tx.insert(s.organizationMembers).values({ organizationId, userId, role: 'OWNER' });
  return { userId, organizationId, role: 'OWNER' };
}

class FixtureDrive implements DriveDataSource {
  constructor(private data: DriveRawFile[]) {}
  async ping() {
    return true;
  }
  async files() {
    return this.data;
  }
}

function fixture(): DriveRawFile[] {
  return [
    { id: 'f1', name: 'Propuesta.pdf', mimeType: 'application/pdf', webViewLink: 'https://drive.google.com/file/f1' },
    { id: 'f2', name: 'Contrato.docx', mimeType: 'application/vnd', webViewLink: 'https://drive.google.com/file/f2' },
  ];
}

beforeAll(async () => {
  await db.execute(sql`select 1`);
});
afterAll(async () => {
  await closeDb();
});

describe('drive sync (fixture)', () => {
  it('crea documents como referencia (external_provider GDRIVE, sin file store)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const summary = await syncDrive(tx, ctx, new DriveAdapter(new FixtureDrive(fixture())));
      expect(summary.files.created).toBe(2);
      const docs = await tx.select().from(s.documents).where(eq(s.documents.organizationId, ctx.organizationId));
      expect(docs).toHaveLength(2);
      const one = docs.find((d) => d.name === 'Propuesta.pdf')!;
      expect(one.externalProvider).toBe('GDRIVE');
      expect(one.externalUrl).toBe('https://drive.google.com/file/f1');
    });
  });

  it('re-ejecutar es idempotente (actualiza nombre, no duplica)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const data = fixture();
      await syncDrive(tx, ctx, new DriveAdapter(new FixtureDrive(data)));
      data[0]!.name = 'Propuesta v2.pdf';
      const second = await syncDrive(tx, ctx, new DriveAdapter(new FixtureDrive(data)));
      expect(second.files.created).toBe(0);
      expect(second.files.updated).toBe(2);
      const docs = await tx.select().from(s.documents).where(eq(s.documents.organizationId, ctx.organizationId));
      expect(docs).toHaveLength(2);
      expect(docs.map((d) => d.name)).toContain('Propuesta v2.pdf');
    });
  });
});
