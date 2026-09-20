import { and, asc, count, desc, eq, isNull, sum } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { payments, clients, contacts } from '@ct/db/schema';
import type { PaymentStatus } from '@ct/domain';
import { createPaymentSchema, updatePaymentSchema } from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { recordAudit, recordChangeEvent, recordFieldChanges } from '../audit/index';
import { mapDbError, notFound } from '../errors';
import { rowCap } from '../list-limit';

/**
 * Sección **Pagos**: dinero pendiente de entrar (IN) o de salir (OUT). CT-nativo, sin espejo a Notion/Twenty.
 *
 * Regla de coherencia (la aplica este módulo, no la tabla): un pago **IN** apunta a un cliente o a un contacto del
 * CRM; un pago **OUT** lleva `payeeLabel` (texto libre) y no arrastra cliente/contacto. Al cambiar de dirección se
 * limpia lo que deja de tener sentido, para no dejar datos huérfanos de la dirección anterior.
 */

async function assertRefInOrg(
  db: Database,
  ctx: OrgContext,
  table: typeof clients | typeof contacts,
  id: string | undefined,
  entity: string,
) {
  if (!id) return;
  const [row] = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), orgEq(table.organizationId, ctx)));
  if (!row) throw notFound(entity);
}

async function loadPayment(db: Database, ctx: OrgContext, id: string) {
  const [row] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.id, id), orgEq(payments.organizationId, ctx)));
  if (!row) throw notFound('payment');
  return row;
}

export async function createPayment(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = createPaymentSchema.parse(input);
  if (data.direction === 'OUT') {
    data.clientId = undefined;
    data.contactId = undefined;
  } else {
    data.payeeLabel = undefined;
  }
  await assertRefInOrg(db, ctx, clients, data.clientId, 'client');
  await assertRefInOrg(db, ctx, contacts, data.contactId, 'contact');
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(payments)
        .values({
          organizationId: ctx.organizationId,
          concept: data.concept,
          direction: data.direction,
          status: data.status,
          amount: data.amount.toFixed(2),
          currencyCode: data.currencyCode,
          clientId: data.clientId,
          contactId: data.contactId,
          payeeLabel: data.payeeLabel,
          dueDate: data.dueDate?.toISOString().slice(0, 10),
          notes: data.notes,
          paidAt: data.status === 'PAID' ? new Date() : null,
        })
        .returning();
      await recordAudit(tx, ctx, { action: 'CREATE', entityType: 'payment', entityId: row!.id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'payment' });
  }
}

export async function updatePayment(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'write');
  const data = updatePaymentSchema.parse(input);
  const current = await loadPayment(db, ctx, id);
  const nextDirection = data.direction ?? (current.direction as 'IN' | 'OUT');
  // Cambiar de dirección limpia lo que ya no aplica (un cobro no tiene "para quién", un gasto no tiene cliente).
  if (nextDirection === 'OUT') {
    data.clientId = null;
    data.contactId = null;
  } else if (data.direction === 'IN') {
    data.payeeLabel = null;
  }
  await assertRefInOrg(db, ctx, clients, data.clientId ?? undefined, 'client');
  await assertRefInOrg(db, ctx, contacts, data.contactId ?? undefined, 'contact');

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (data.concept !== undefined) set.concept = data.concept;
  if (data.direction !== undefined) set.direction = data.direction;
  if (data.amount !== undefined) set.amount = data.amount.toFixed(2);
  if (data.currencyCode !== undefined) set.currencyCode = data.currencyCode;
  if (data.clientId !== undefined) set.clientId = data.clientId;
  if (data.contactId !== undefined) set.contactId = data.contactId;
  if (data.payeeLabel !== undefined) set.payeeLabel = data.payeeLabel;
  if (data.dueDate !== undefined) set.dueDate = data.dueDate === null ? null : data.dueDate.toISOString().slice(0, 10);
  if (data.notes !== undefined) set.notes = data.notes;

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .update(payments)
        .set(set)
        .where(and(eq(payments.id, id), orgEq(payments.organizationId, ctx)))
        .returning();
      await recordFieldChanges(tx, ctx, { entityType: 'payment', entityId: id, before: current, changed: set });
      await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'payment', entityId: id });
      return row!;
    });
  } catch (e) {
    throw mapDbError(e, { entity: 'payment' });
  }
}

/** Marca pagado/pendiente. `paid_at` se rellena al marcar PAID y se limpia al volver a PENDING. */
export async function updatePaymentStatus(db: Database, ctx: OrgContext, id: string, status: PaymentStatus) {
  requireCan(ctx.role, 'write');
  const current = await loadPayment(db, ctx, id);
  return await db.transaction(async (tx) => {
    const [row] = await tx
      .update(payments)
      .set({ status, paidAt: status === 'PAID' ? (current.paidAt ?? new Date()) : null, updatedAt: new Date() })
      .where(and(eq(payments.id, id), orgEq(payments.organizationId, ctx)))
      .returning();
    await recordChangeEvent(tx, ctx, {
      entityType: 'payment',
      entityId: id,
      changeType: 'STATUS',
      previousState: { status: current.status },
      newState: { status },
    });
    await recordAudit(tx, ctx, { action: 'UPDATE', entityType: 'payment', entityId: id, metadata: { status } });
    return row!;
  });
}

type PaymentRecord = typeof payments.$inferSelect;
export interface PaymentRow extends PaymentRecord {
  /** A quién corresponde el pago, ya resuelto: nombre del cliente/contacto (IN) o la etiqueta libre (OUT). */
  counterparty: string | null;
}

/** Nombre mostrable de un contacto: "Nombre Apellido" o su email. */
function contactLabel(c: { firstName: string | null; lastName: string | null; email: string | null }): string {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email || '(contacto)';
}

/** Lista de pagos (sin archivar), opcionalmente filtrada por estado. Ordena por vencimiento y luego por creación. */
export async function listPayments(
  db: Database,
  ctx: OrgContext,
  filter?: { status?: PaymentStatus },
  limit?: number,
): Promise<PaymentRow[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(
      and(
        orgEq(payments.organizationId, ctx),
        isNull(payments.archivedAt),
        filter?.status ? eq(payments.status, filter.status) : undefined,
      ),
    )
    .orderBy(asc(payments.dueDate), desc(payments.createdAt))
    .limit(rowCap(limit));

  const [clientRows, contactRows] = await Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients).where(orgEq(clients.organizationId, ctx)),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email })
      .from(contacts)
      .where(orgEq(contacts.organizationId, ctx)),
  ]);
  const clientById = new Map(clientRows.map((c) => [c.id, c.name]));
  const contactById = new Map(contactRows.map((c) => [c.id, contactLabel(c)]));

  return rows.map((p) => ({
    ...p,
    counterparty:
      p.direction === 'OUT'
        ? p.payeeLabel
        : ((p.clientId ? (clientById.get(p.clientId) ?? null) : null) ??
          (p.contactId ? (contactById.get(p.contactId) ?? null) : null)),
  }));
}

export async function getPayment(db: Database, ctx: OrgContext, id: string) {
  return loadPayment(db, ctx, id);
}

/**
 * Totales de lo PENDIENTE por dirección y moneda: "cuánto me deben" y "cuánto debo". Se agrupa por moneda porque
 * sumar euros con dólares no significaría nada.
 */
export async function pendingPaymentTotals(db: Database, ctx: OrgContext) {
  const rows = await db
    .select({
      direction: payments.direction,
      currencyCode: payments.currencyCode,
      total: sum(payments.amount),
      n: count(),
    })
    .from(payments)
    .where(and(orgEq(payments.organizationId, ctx), isNull(payments.archivedAt), eq(payments.status, 'PENDING')))
    .groupBy(payments.direction, payments.currencyCode);
  return rows.map((r) => ({
    direction: r.direction,
    currencyCode: r.currencyCode,
    total: Number(r.total ?? 0),
    count: Number(r.n),
  }));
}

/**
 * Pagos **retrasados**: pendientes cuya fecha prevista ya pasó. `todayIso` se recibe (no se calcula aquí) porque el
 * "hoy" depende de la zona horaria de la organización, igual que en las tareas vencidas.
 */
export async function listOverduePayments(db: Database, ctx: OrgContext, todayIso: string): Promise<PaymentRow[]> {
  const all = await listPayments(db, ctx, { status: 'PENDING' });
  return all.filter((p) => p.dueDate != null && p.dueDate < todayIso);
}
