import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { and, eq, desc } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { inboxChannels } from '@ct/db/schema';
import { AppError } from '@ct/shared';
import { createInboxChannelSchema, updateInboxChannelSchema, inboxWebhookSchema } from '@ct/validation';
import { requireCan, orgEq, type OrgContext } from '../auth/index';
import { captureKnowledge } from '../knowledge/index';
import { recordAudit } from '../audit/index';
import { notFound } from '../errors';

/**
 * Canales de captura del Inbox (Fase 7 / E-6). Cada canal es una "conexión" con nombre + token; una
 * herramienta externa (n8n/email/extensión…) hace POST al webhook con el token para crear una entrada.
 * El token NO se guarda en claro: se almacena su hash SHA-256 y sólo se muestra al crear/regenerar.
 */

function genToken(): string {
  return randomBytes(24).toString('base64url');
}
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
/** Comparación de hashes en tiempo constante (evita fugas por timing). Longitudes distintas ⇒ no coincide. */
function hashesEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function listInboxChannels(db: Database, ctx: OrgContext) {
  return db
    .select({
      id: inboxChannels.id,
      name: inboxChannels.name,
      status: inboxChannels.status,
      lastUsedAt: inboxChannels.lastUsedAt,
      createdAt: inboxChannels.createdAt,
    })
    .from(inboxChannels)
    .where(orgEq(inboxChannels.organizationId, ctx))
    .orderBy(desc(inboxChannels.createdAt));
}

export async function createInboxChannel(db: Database, ctx: OrgContext, input: unknown) {
  requireCan(ctx.role, 'manage_org'); // sólo OWNER gestiona canales/tokens
  const { name } = createInboxChannelSchema.parse(input);
  const token = genToken();
  const [row] = await db
    .insert(inboxChannels)
    .values({ organizationId: ctx.organizationId, name, tokenHash: hashToken(token), status: 'ACTIVE' })
    .returning();
  await recordAudit(db, ctx, { action: 'CREATE', entityType: 'inbox_channel', entityId: row!.id });
  return { channel: row!, token };
}

export async function regenerateInboxChannelToken(db: Database, ctx: OrgContext, id: string) {
  requireCan(ctx.role, 'manage_org');
  const token = genToken();
  const [row] = await db
    .update(inboxChannels)
    .set({ tokenHash: hashToken(token), updatedAt: new Date() })
    .where(and(eq(inboxChannels.id, id), orgEq(inboxChannels.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('inbox_channel');
  return { channel: row, token };
}

export async function setInboxChannelStatus(db: Database, ctx: OrgContext, id: string, input: unknown) {
  requireCan(ctx.role, 'manage_org');
  const { status } = updateInboxChannelSchema.parse(input);
  const [row] = await db
    .update(inboxChannels)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(inboxChannels.id, id), orgEq(inboxChannels.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('inbox_channel');
  return row;
}

export async function deleteInboxChannel(db: Database, ctx: OrgContext, id: string) {
  requireCan(ctx.role, 'manage_org');
  const [row] = await db
    .delete(inboxChannels)
    .where(and(eq(inboxChannels.id, id), orgEq(inboxChannels.organizationId, ctx)))
    .returning();
  if (!row) throw notFound('inbox_channel');
  await recordAudit(db, ctx, { action: 'DELETE', entityType: 'inbox_channel', entityId: id });
}

/**
 * Captura vía webhook: autentica por `(channelId, token)` SIN sesión. Si el canal no existe, está DISABLED
 * o el token no coincide → error de autenticación (401). Crea la entrada del Inbox con `source_type` = nombre
 * del canal, y actualiza `last_used_at`.
 */
export async function captureViaChannel(db: Database, channelId: string, token: string, input: unknown) {
  const [channel] = await db.select().from(inboxChannels).where(eq(inboxChannels.id, channelId));
  if (!channel || channel.status !== 'ACTIVE' || !token || !hashesEqual(channel.tokenHash, hashToken(token))) {
    throw new AppError({ code: 'UNAUTHENTICATED', kind: 'AUTHENTICATION', message: 'canal o token inválido' });
  }
  const body = inboxWebhookSchema.parse(input);
  const ctx: OrgContext = { userId: 'system', organizationId: channel.organizationId, role: 'OWNER' };
  const row = await captureKnowledge(db, ctx, {
    rawContent: body.content,
    title: body.title,
    sourceType: channel.name,
    sourceUrl: body.sourceUrl,
  });
  await db.update(inboxChannels).set({ lastUsedAt: new Date() }).where(eq(inboxChannels.id, channelId));
  return row;
}
