import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { clients, contacts, opportunities, tasks } from '@ct/db/schema';
import { slugify, deriveOpportunityStatus, type OpportunityStage, type TaskStatus } from '@ct/domain';
import type { IntegrationAdapter } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { createClient, createContact, createOpportunity } from '../crm/index';
import { createTask } from '../projects/index';
import { resolveInternalId, upsertIdentity } from './identity';
import { pendingPushTargets } from '../outbox/index';
import { errMsg, type SyncSkip } from './sync-common';

/**
 * Sync idempotente de Twenty → Control Tower (proyección/contexto; Twenty sigue siendo SoT del CRM).
 * Idempotencia: `external_identities` (provider TWENTY). Re-ejecutar no duplica: si la identidad
 * existe se ACTUALIZA la proyección; si no, se CREA la entidad + la identidad.
 * Flujo ERRATA-010: External DTO → mapping (adapter) → domain command → entidad.
 */
const P = 'TWENTY';

export interface SyncCounts {
  created: number;
  updated: number;
}
export interface SyncSummary {
  companies: SyncCounts;
  people: SyncCounts;
  opportunities: SyncCounts;
  tasks: SyncCounts;
  skipped: SyncSkip[];
}

export interface SyncTwentyOptions {
  /**
   * URL base del Twenty accesible por el navegador (Tailscale/LAN), p. ej. http://100.x.y.z:3000.
   * Distinta de la URL de API interna (twenty.app.prod:3000). Si se aporta, se guarda el enlace profundo
   * al registro en `external_identities.metadata.url` para "Open in CRM" (F-1): `/object/<singular>/<id>`.
   */
  crmBaseUrl?: string | null;
}

/** Enlace profundo a un registro de Twenty (o null si no hay base URL configurada).
 *  Twenty usa la ruta de detalle `/object/<singular>/<id>` (el plural `/objects/<plural>` es la lista). */
function twentyRecordUrl(crmBaseUrl: string | null | undefined, objectSingular: string, id: string): string | null {
  if (!crmBaseUrl) return null;
  return `${crmBaseUrl.replace(/\/+$/, '')}/object/${objectSingular}/${id}`;
}

export async function syncTwenty(
  db: Database,
  ctx: OrgContext,
  adapter: IntegrationAdapter,
  opts: SyncTwentyOptions = {},
): Promise<SyncSummary> {
  const data = await adapter.pull();
  // Cambios locales que aún NO han llegado a Twenty (write-back pendiente o fallido). El pull NO los pisa: si el
  // push falló (p. ej. Twenty rechaza el valor de `stage`), reescribir la fila con el dato viejo haría desaparecer
  // el cambio del usuario sin avisar. Se cuenta como "saltado" con el motivo, así se ve en el historial de syncs.
  const pendingPush: Record<string, Set<string>> = {
    client: await pendingPushTargets(db, ctx.organizationId, 'twenty.push', 'client'),
    contact: await pendingPushTargets(db, ctx.organizationId, 'twenty.push', 'contact'),
    opportunity: await pendingPushTargets(db, ctx.organizationId, 'twenty.push', 'opportunity'),
  };
  const PENDING_PUSH_MSG =
    'Hay un cambio hecho en Control Tower que todavía no ha llegado a Twenty; no se sobrescribe. ' +
    'Revisa los envíos fallidos en Automatización › Estado del sistema.';
  const summary: SyncSummary = {
    companies: { created: 0, updated: 0 },
    people: { created: 0, updated: 0 },
    opportunities: { created: 0, updated: 0 },
    tasks: { created: 0, updated: 0 },
    skipped: [],
  };

  // --- Companies → clients --- (por-registro: un registro inválido no aborta el resto, F-13)
  for (const c of data.companies) {
    try {
      const existing = await resolveInternalId(db, ctx, P, 'company', c.externalId);
      if (existing && pendingPush.client!.has(existing)) {
        summary.skipped.push({ entity: 'client', externalId: c.externalId, error: PENDING_PUSH_MSG });
        continue;
      }
      if (existing) {
        await db
          .update(clients)
          .set({ name: c.name, industry: c.industry, websiteUrl: c.websiteUrl, updatedAt: new Date() })
          .where(and(eq(clients.id, existing), orgEq(clients.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'company', externalId: c.externalId, internalType: 'client', internalId: existing, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'company', c.externalId) } });
        summary.companies.updated++;
      } else {
        const client = await createClient(db, ctx, {
          name: c.name,
          slug: `${slugify(c.name) || 'client'}-${c.externalId.slice(0, 8)}`,
          industry: c.industry,
          websiteUrl: c.websiteUrl,
        });
        await upsertIdentity(db, ctx, { provider: P, externalType: 'company', externalId: c.externalId, internalType: 'client', internalId: client.id, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'company', c.externalId) } });
        summary.companies.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'company', externalId: c.externalId, error: errMsg(e) });
    }
  }

  // --- People → contacts ---
  for (const p of data.people) {
    if (!p.firstName && !p.lastName && !p.email) continue; // sin datos identificables
    try {
      const clientId = p.companyExternalId
        ? (await resolveInternalId(db, ctx, P, 'company', p.companyExternalId)) ?? undefined
        : undefined;
      const existing = await resolveInternalId(db, ctx, P, 'person', p.externalId);
      if (existing && pendingPush.contact!.has(existing)) {
        summary.skipped.push({ entity: 'contact', externalId: p.externalId, error: PENDING_PUSH_MSG });
        continue;
      }
      if (existing) {
        await db
          .update(contacts)
          .set({ firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, jobTitle: p.jobTitle, clientId, updatedAt: new Date() })
          .where(and(eq(contacts.id, existing), orgEq(contacts.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'person', externalId: p.externalId, internalType: 'contact', internalId: existing, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'person', p.externalId) } });
        summary.people.updated++;
      } else {
        const contact = await createContact(db, ctx, {
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          jobTitle: p.jobTitle,
          clientId,
        });
        await upsertIdentity(db, ctx, { provider: P, externalType: 'person', externalId: p.externalId, internalType: 'contact', internalId: contact.id, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'person', p.externalId) } });
        summary.people.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'person', externalId: p.externalId, error: errMsg(e) });
    }
  }

  // --- Opportunities ---
  for (const o of data.opportunities) {
    try {
      const clientId = o.companyExternalId
        ? (await resolveInternalId(db, ctx, P, 'company', o.companyExternalId)) ?? undefined
        : undefined;
      const stage = o.stage as OpportunityStage;
      const existing = await resolveInternalId(db, ctx, P, 'opportunity', o.externalId);
      if (existing && pendingPush.opportunity!.has(existing)) {
        summary.skipped.push({ entity: 'opportunity', externalId: o.externalId, error: PENDING_PUSH_MSG });
        continue;
      }
      if (existing) {
        await db
          .update(opportunities)
          .set({
            name: o.name,
            stage,
            status: deriveOpportunityStatus(stage),
            estimatedValue: o.estimatedValue?.toFixed(2),
            currencyCode: o.currencyCode,
            expectedCloseDate: o.expectedCloseDate,
            clientId,
            updatedAt: new Date(),
          })
          .where(and(eq(opportunities.id, existing), orgEq(opportunities.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'opportunity', externalId: o.externalId, internalType: 'opportunity', internalId: existing, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'opportunity', o.externalId) } });
        summary.opportunities.updated++;
      } else {
        const opp = await createOpportunity(db, ctx, {
          name: o.name,
          stage,
          clientId,
          estimatedValue: o.estimatedValue,
          currencyCode: o.currencyCode,
          expectedCloseDate: o.expectedCloseDate,
        });
        await upsertIdentity(db, ctx, { provider: P, externalType: 'opportunity', externalId: o.externalId, internalType: 'opportunity', internalId: opp.id, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'opportunity', o.externalId) } });
        summary.opportunities.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'opportunity', externalId: o.externalId, error: errMsg(e) });
    }
  }

  // --- Tasks → tasks (origen Twenty; sin proyecto, se ven junto a las de CT en /tasks) ---
  for (const t of data.tasks) {
    try {
      const stage = t.status as TaskStatus;
      // Nota: las tasks NO llevan el guard de "push pendiente". El write-back de una task sólo empuja `dueDate`, y
      // el pull nunca reescribe ese campo (CT es su dueño); el resto —el título— lo posee Twenty, así que traerlo no
      // pisa nada del usuario. En client/contact/opportunity sí coinciden los campos de ida y vuelta, y ahí el guard
      // es lo que evita perder el cambio local.
      const existing = await resolveInternalId(db, ctx, P, 'task', t.externalId);
      if (existing) {
        // NO se reescribe `dueDate`: la fecha de una task ya importada la gestiona CT (reprogramar). En la creación
        // inicial (rama else) sí se toma la de Twenty como valor de arranque. `title` sí es propiedad de Twenty.
        await db
          .update(tasks)
          .set({ title: t.title, status: stage, updatedAt: new Date() })
          .where(and(eq(tasks.id, existing), orgEq(tasks.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'task', externalId: t.externalId, internalType: 'task', internalId: existing, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'task', t.externalId) } });
        summary.tasks.updated++;
      } else {
        const task = await createTask(db, ctx, { title: t.title, status: stage, dueDate: t.dueDate });
        await upsertIdentity(db, ctx, { provider: P, externalType: 'task', externalId: t.externalId, internalType: 'task', internalId: task.id, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'task', t.externalId) } });
        summary.tasks.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'task', externalId: t.externalId, error: errMsg(e) });
    }
  }

  return summary;
}
