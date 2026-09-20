import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '@ct/db';
import * as s from '@ct/db/schema';
import {
  createPayment,
  updatePayment,
  updatePaymentStatus,
  listPayments,
  pendingPaymentTotals,
  createClient,
  type OrgContext,
} from '@ct/application';

/** Sección Pagos: dinero pendiente de entrar (IN) o de salir (OUT). */
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
  const slug = `pay-${crypto.randomUUID().slice(0, 8)}`;
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

describe('pagos', () => {
  it('crea un cobro en euros por defecto, con su cliente resuelto', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const c = await createClient(tx, ctx, { name: 'Acme' });
      const p = await createPayment(tx, ctx, { concept: 'Factura marzo', amount: 1200.5, clientId: c.id });

      expect(p.direction).toBe('IN'); // por defecto, un cobro
      expect(p.status).toBe('PENDING');
      expect(p.currencyCode).toBe('EUR'); // moneda por defecto
      expect(p.amount).toBe('1200.50');

      const [row] = await listPayments(tx, ctx);
      expect(row!.counterparty).toBe('Acme'); // el nombre llega resuelto a la lista
    });
  });

  it('un pago de SALIDA usa etiqueta libre y no arrastra cliente', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const c = await createClient(tx, ctx, { name: 'Acme' });
      // Aunque se mande clientId, en OUT no aplica: manda la etiqueta.
      const p = await createPayment(tx, ctx, {
        concept: 'Suscripción Figma',
        direction: 'OUT',
        amount: 15,
        payeeLabel: 'Figma',
        clientId: c.id,
      });
      expect(p.clientId).toBeNull();
      expect(p.payeeLabel).toBe('Figma');
      const [row] = await listPayments(tx, ctx);
      expect(row!.counterparty).toBe('Figma');
    });
  });

  it('cambiar de entrada a salida limpia el cliente (y al revés, la etiqueta)', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const c = await createClient(tx, ctx, { name: 'Acme' });
      const p = await createPayment(tx, ctx, { concept: 'X', amount: 10, clientId: c.id });

      const out = await updatePayment(tx, ctx, p.id, { direction: 'OUT', payeeLabel: 'Hacienda' });
      expect(out.clientId).toBeNull();
      expect(out.payeeLabel).toBe('Hacienda');

      const back = await updatePayment(tx, ctx, p.id, { direction: 'IN', clientId: c.id });
      expect(back.payeeLabel).toBeNull();
      expect(back.clientId).toBe(c.id);
    });
  });

  it('marcar pagado sella la fecha y volver a pendiente la borra', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createPayment(tx, ctx, { concept: 'Factura', amount: 100 });
      const paid = await updatePaymentStatus(tx, ctx, p.id, 'PAID');
      expect(paid.paidAt).not.toBeNull();
      const again = await updatePaymentStatus(tx, ctx, p.id, 'PENDING');
      expect(again.paidAt).toBeNull();
    });
  });

  it('los totales pendientes se agrupan por dirección y moneda, e ignoran lo ya pagado', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      await createPayment(tx, ctx, { concept: 'A', amount: 100 });
      await createPayment(tx, ctx, { concept: 'B', amount: 50 });
      await createPayment(tx, ctx, { concept: 'C', direction: 'OUT', amount: 30, payeeLabel: 'Proveedor' });
      await createPayment(tx, ctx, { concept: 'D', amount: 999, currencyCode: 'USD' });
      const pagado = await createPayment(tx, ctx, { concept: 'E', amount: 500 });
      await updatePaymentStatus(tx, ctx, pagado.id, 'PAID');

      const totals = await pendingPaymentTotals(tx, ctx);
      const eurIn = totals.find((t) => t.direction === 'IN' && t.currencyCode === 'EUR');
      expect(eurIn!.total).toBe(150); // 100 + 50; el pagado no cuenta
      expect(totals.find((t) => t.direction === 'OUT')!.total).toBe(30);
      expect(totals.find((t) => t.currencyCode === 'USD')!.total).toBe(999); // otra moneda, otro grupo
    });
  });

  it('archivar un pago lo saca de la lista', async () => {
    await inRollback(async (tx) => {
      const ctx = await makeOrg(tx);
      const p = await createPayment(tx, ctx, { concept: 'Vieja', amount: 1 });
      await tx.update(s.payments).set({ archivedAt: new Date() }).where(eq(s.payments.id, p.id));
      expect(await listPayments(tx, ctx)).toHaveLength(0);
    });
  });
});
