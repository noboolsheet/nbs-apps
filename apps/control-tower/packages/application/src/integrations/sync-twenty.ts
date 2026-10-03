import { and, eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { clients, contacts, opportunities, tasks } from '@ct/db/schema';
import {
  slugify,
  deriveOpportunityStatus,
  crmTargetForPerson,
  type ParsedPersonRoles,
  type OpportunityStage,
  type TaskStatus,
} from '@ct/domain';
import type { IntegrationAdapter } from '@ct/integrations';
import { orgEq, type OrgContext } from '../auth/index';
import { createClient, createContact, createOpportunity } from '../crm/index';
import { createTask } from '../projects/index';
import { findIdentityByExternal, resolveInternalId, upsertIdentity } from './identity';
import { reconcileMissing } from './reconcile';
import { archiveRecords } from '../maintenance/archive';
import { pendingPushTargets } from '../outbox/index';
import { errMsg, type SyncSkip } from './sync-common';
import { logger } from '@ct/shared';

/**
 * Sync idempotente de Twenty → Control Tower (proyección/contexto; Twenty sigue siendo SoT del CRM).
 * Idempotencia: `external_identities` (provider TWENTY). Re-ejecutar no duplica: si la identidad
 * existe se ACTUALIZA la proyección; si no, se CREA la entidad + la identidad.
 * Flujo ERRATA-010: External DTO → mapping (adapter) → domain command → entidad.
 *
 * Reconcilia borrados (M40): lo que Twenty deja de devolver se archiva en CT, y si vuelve, se restaura. Twenty
 * es el SoT del CRM, así que su ausencia manda: esto es lo que evita que una oportunidad borrada allí se quede
 * colgada aquí para siempre.
 */
const P = 'TWENTY';

export interface SyncCounts {
  created: number;
  updated: number;
  /** Archivados por haber desaparecido de Twenty (M40). */
  archived: number;
  /** Desarchivados por haber vuelto a Twenty (M40). */
  restored: number;
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
  const log = logger.child({ task: 'sync-twenty' });
  const data = await adapter.pull();
  // Cambios locales que aún NO han llegado a Twenty (write-back pendiente o fallido). El pull NO los pisa: si el
  // push falló (p. ej. Twenty rechaza el valor de `stage`), reescribir la fila con el dato viejo haría desaparecer
  // el cambio del usuario sin avisar. Se cuenta como "saltado" con el motivo, así se ve en el historial de syncs.
  // F-22 — no pisar con el pull un registro cuyo write-back aún no ha llegado a Twenty. Desde ADR-009 CT sólo
  // escribe el `stage` de la oportunidad, así que sólo ahí puede haber un cambio local pendiente que proteger.
  // Para client/contact se RETIRÓ a propósito: un `twenty.push` pendiente suyo sólo puede ser un residuo de antes
  // de ADR-009, y mantener el guard dejaría ese registro congelado sin que CT tenga ya forma de resolver el envío
  // (los residuos se drenan solos —el push devuelve `skip`— y se ven en Automatización › Envíos fallidos).
  const pendingPush: Record<string, Set<string>> = {
    opportunity: await pendingPushTargets(db, ctx.organizationId, 'twenty.push', 'opportunity'),
  };
  const PENDING_PUSH_MSG =
    'Hay un cambio hecho en Control Tower que todavía no ha llegado a Twenty; no se sobrescribe. ' +
    'Revisa los envíos fallidos en Automatización › Estado del sistema.';
  const summary: SyncSummary = {
    companies: { created: 0, updated: 0, archived: 0, restored: 0 },
    people: { created: 0, updated: 0, archived: 0, restored: 0 },
    opportunities: { created: 0, updated: 0, archived: 0, restored: 0 },
    tasks: { created: 0, updated: 0, archived: 0, restored: 0 },
    skipped: [],
  };

  // Reconciliación de borrados, ANTES de los bucles (necesita ver las identidades como las dejó el sync
  // anterior). `seen` sale del pull crudo, así que un registro que luego falle al procesarse NO se archiva.
  const RECONCILE: { key: keyof Omit<SyncSummary, 'skipped'>; externalType: string; entityType: string; internalType?: string; ids: string[] }[] = [
    { key: 'companies', externalType: 'company', entityType: 'client', ids: data.companies.map((c) => c.externalId) },
    // Las personas se reconcilian DOS veces, una por familia: desde 2026-09-27 una Person puede estar en CT como
    // contacto o como cliente (rol `INDIVIDUAL_CLIENT`), y cada identidad hay que buscarla en su propia tabla.
    { key: 'people', externalType: 'person', entityType: 'contact', internalType: 'contact', ids: data.people.map((p) => p.externalId) },
    { key: 'people', externalType: 'person', entityType: 'client', internalType: 'client', ids: data.people.map((p) => p.externalId) },
    { key: 'opportunities', externalType: 'opportunity', entityType: 'opportunity', ids: data.opportunities.map((o) => o.externalId) },
    { key: 'tasks', externalType: 'task', entityType: 'task', ids: data.tasks.map((t) => t.externalId) },
  ];
  for (const r of RECONCILE) {
    const recon = await reconcileMissing(db, ctx, {
      provider: P,
      externalType: r.externalType,
      entityType: r.entityType,
      internalType: r.internalType,
      seen: new Set(r.ids),
    });
    // `+=`, no `=`: `people` se reconcilia en dos familias y los contadores se suman.
    summary[r.key].archived += recon.archived;
    summary[r.key].restored += recon.restored;
  }

  // --- Companies → clients --- (por-registro: un registro inválido no aborta el resto, F-13)
  // `clients.industry` guarda el **Organization Type** de Twenty desde el 2026-09-27 (Empresa, Centro educativo,
  // Autónomo…). Si el campo no viene en el pull —puede llamarse de otra forma en ese Twenty— **no se pisa** lo que
  // hubiera: borrar un dato por no encontrar un campo sería peor que no actualizarlo.
  // Lo mismo, aparte, para los **roles de relación** de la empresa (M46): `null` = sin dato, `[]` = Twenty dice que
  // no tiene ninguno. Si el campo no viene en el pull no se escribe nada, que es distinto de escribir «ninguno».
  let orgTypeFieldMissing = 0;
  let companyRolesFieldMissing = 0;
  const unknownCompanyRoleLabels = new Set<string>();
  for (const c of data.companies) {
    try {
      if (!c.orgTypeFieldPresent) orgTypeFieldMissing++;
      if (!c.rolesFieldPresent) companyRolesFieldMissing++;
      for (const u of c.unknownRoles ?? []) unknownCompanyRoleLabels.add(u);
      const existing = await resolveInternalId(db, ctx, P, 'company', c.externalId);
      if (existing) {
        await db
          .update(clients)
          .set({
            name: c.name,
            ...(c.orgTypeFieldPresent ? { industry: c.industry } : {}),
            ...(c.rolesFieldPresent ? { relationshipRoles: c.relationshipRoles ?? [] } : {}),
            websiteUrl: c.websiteUrl,
            updatedAt: new Date(),
          })
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
        // Los roles se escriben aparte, no por `createClient`: son de Twenty (`FIELD_OWNERSHIP`), así que no están en
        // el esquema de creación y nadie puede mandarlos por la API.
        if (c.rolesFieldPresent) {
          await db
            .update(clients)
            .set({ relationshipRoles: c.relationshipRoles ?? [] })
            .where(and(eq(clients.id, client.id), orgEq(clients.organizationId, ctx)));
        }
        await upsertIdentity(db, ctx, { provider: P, externalType: 'company', externalId: c.externalId, internalType: 'client', internalId: client.id, metadata: { url: twentyRecordUrl(opts.crmBaseUrl, 'company', c.externalId) } });
        summary.companies.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'company', externalId: c.externalId, error: errMsg(e) });
    }
  }
  if (orgTypeFieldMissing > 0) {
    summary.skipped.push({
      entity: 'config',
      externalId: `${orgTypeFieldMissing} empresa(s)`,
      error:
        'No se encontró el campo «Organization Type» en Twenty, así que el tipo de organización de los clientes no ' +
        'se ha actualizado (no se ha borrado el que hubiera). Si en tu Twenty ese campo se llama de otra forma, ' +
        'ponlo en la configuración de la integración (`fields.companyOrganizationType`).',
    });
  }
  if (companyRolesFieldMissing > 0) {
    summary.skipped.push({
      entity: 'config',
      externalId: `${companyRolesFieldMissing} empresa(s)`,
      error:
        'No se encontró el campo de roles de relación de las empresas en Twenty, así que la columna «Relación» de ' +
        'los clientes no se ha actualizado (no se ha borrado la que hubiera). Si en tu Twenty ese campo se llama de ' +
        'otra forma, ponlo en la configuración de la integración (`fields.companyRelationshipRoles`).',
    });
  }
  if (unknownCompanyRoleLabels.size > 0) {
    // Aviso SEPARADO del de las personas a propósito: los vocabularios son distintos (una empresa no puede ser
    // `INDIVIDUAL_CLIENT`), así que juntarlos haría imposible saber qué etiqueta hay que alinear y dónde.
    summary.skipped.push({
      entity: 'config',
      externalId: [...unknownCompanyRoleLabels].join(', '),
      error: 'Roles de relación de empresa que Twenty trae y Control Tower no conoce: no se han guardado.',
    });
  }

  /**
   * --- People → contactos **o clientes** ---
   *
   * Owner 2026-09-27: una Person con el rol **`INDIVIDUAL_CLIENT`** es un CLIENTE de Control Tower, no un contacto
   * (es a quien se factura y para quien se trabaja, aunque no haya empresa detrás). El resto de roles —contacto de
   * una empresa, colaborador, proveedor, prescriptor— siguen siendo contactos. Coincide con lo que ya hacía
   * `classifyBillingSubject` para la facturación (§2.2 del handoff): el mismo rol, aplicado aquí a qué entidad
   * representa a la persona.
   *
   * Tres cosas que esto tiene que hacer bien:
   *  1. **Si la persona cambia de rol, su registro se MUEVE** (contacto→cliente o al revés). El nuevo se crea, el
   *     viejo se **archiva** —nunca se borra: un proyecto, una oportunidad o un pago pueden estar apuntándolo— y la
   *     identidad se re-apunta al nuevo.
   *  2. **Si el campo de roles no viene** en el pull, no se reclasifica a nadie y se avisa una vez: el campo puede
   *     llamarse distinto en este Twenty (`configuration.fields.personRelationshipRoles`) y el handoff prohíbe
   *     adivinar identificadores de API. Mantener a la gente donde está es reversible; moverla por una suposición no.
   *  3. Un cliente-persona **no lleva empresa**: su `clients.name` es su nombre. El email y el teléfono siguen en
   *     Twenty (CT enlaza), porque `clients` no tiene esas columnas y no se inventan datos aquí.
   */
  let rolesFieldMissing = 0;
  const unknownRoleLabels = new Set<string>();
  const unknownStageLabels = new Set<string>();
  for (const p of data.people) {
    if (!p.firstName && !p.lastName && !p.email) continue; // sin datos identificables
    try {
      const parsed: ParsedPersonRoles = {
        roles: (p.relationshipRoles ?? []) as ParsedPersonRoles['roles'],
        present: p.rolesFieldPresent ?? false,
        unknown: p.unknownRoles ?? [],
      };
      if (!parsed.present) rolesFieldMissing++;
      for (const u of parsed.unknown) unknownRoleLabels.add(u);
      const target = crmTargetForPerson(parsed);
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || p.email || '(sin nombre)';
      const identity = await findIdentityByExternal(db, ctx, P, 'person', p.externalId);
      const url = twentyRecordUrl(opts.crmBaseUrl, 'person', p.externalId);

      // La persona cambió de familia: se crea en la nueva y la fila vieja se archiva (no se borra).
      if (identity && identity.internalType !== target) {
        await archiveRecords(db, ctx, { entityType: identity.internalType, ids: [identity.internalId] });
        summary.people.archived++;
        log.info('persona reclasificada', {
          externalId: p.externalId,
          from: identity.internalType,
          to: target,
        });
      }
      const existing = identity && identity.internalType === target ? identity.internalId : null;

      if (target === 'client') {
        if (existing) {
          await db
            .update(clients)
            .set({ name: fullName, updatedAt: new Date() })
            .where(and(eq(clients.id, existing), orgEq(clients.organizationId, ctx)));
          summary.people.updated++;
        } else {
          const client = await createClient(db, ctx, {
            name: fullName,
            slug: `${slugify(fullName) || 'client'}-${p.externalId.slice(0, 8)}`,
          });
          await upsertIdentity(db, ctx, { provider: P, externalType: 'person', externalId: p.externalId, internalType: 'client', internalId: client.id, metadata: { url } });
          summary.people.created++;
          continue;
        }
        await upsertIdentity(db, ctx, { provider: P, externalType: 'person', externalId: p.externalId, internalType: 'client', internalId: existing, metadata: { url } });
        continue;
      }

      const clientId = p.companyExternalId
        ? (await resolveInternalId(db, ctx, P, 'company', p.companyExternalId)) ?? undefined
        : undefined;
      if (existing) {
        await db
          .update(contacts)
          .set({ firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone, jobTitle: p.jobTitle, clientId, updatedAt: new Date() })
          .where(and(eq(contacts.id, existing), orgEq(contacts.organizationId, ctx)));
        await upsertIdentity(db, ctx, { provider: P, externalType: 'person', externalId: p.externalId, internalType: 'contact', internalId: existing, metadata: { url } });
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
        await upsertIdentity(db, ctx, { provider: P, externalType: 'person', externalId: p.externalId, internalType: 'contact', internalId: contact.id, metadata: { url } });
        summary.people.created++;
      }
    } catch (e) {
      summary.skipped.push({ entity: 'person', externalId: p.externalId, error: errMsg(e) });
    }
  }
  // Se avisa UNA vez por sync, no por persona: si el campo de roles no existe en este Twenty, el problema es de
  // configuración y repetirlo 200 veces en los saltados sólo taparía lo demás.
  if (rolesFieldMissing > 0) {
    summary.skipped.push({
      // `entity: 'config'` a propósito: no es un registro que no se haya sincronizado, es un aviso de
      // CONFIGURACIÓN. Va por el canal de saltados porque es el único que llega al historial de syncs y marca el
      // run como «con advertencias», que es exactamente lo que es; el `entity` lo distingue de un registro real.
      entity: 'config',
      externalId: `${rolesFieldMissing} persona(s)`,
      error:
        'No se encontró el campo de roles de relación en Twenty, así que NADIE se ha reclasificado como cliente ' +
        'individual. Si en tu Twenty ese campo se llama de otra forma, ponlo en la configuración de la integración ' +
        '(`fields.personRelationshipRoles`).',
    });
  }
  if (unknownRoleLabels.size > 0) {
    summary.skipped.push({
      entity: 'config',
      externalId: [...unknownRoleLabels].join(', '),
      error: 'Roles de relación que Twenty trae y Control Tower no conoce: se han ignorado al clasificar.',
    });
  }

  // --- Opportunities ---
  for (const o of data.opportunities) {
    try {
      const clientId = o.companyExternalId
        ? (await resolveInternalId(db, ctx, P, 'company', o.companyExternalId)) ?? undefined
        : undefined;
      const stage = o.stage as OpportunityStage;
      // Un stage que el mapper no reconoció: `stage` es el fallback, no el estado real. Se junta para avisar una vez.
      if (o.unknownStage) unknownStageLabels.add(o.unknownStage);
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

  if (unknownStageLabels.size > 0) {
    // Mismo canal que los roles: `entity: 'config'`, una vez por sync y con las etiquetas en el campo del id, para
    // poder alinearlas. Esto antes no existía: un stage desconocido caía a «Prospecto» y nadie se enteraba —y mover
    // el embudo es justo lo único que CT escribe de vuelta a Twenty.
    summary.skipped.push({
      entity: 'config',
      externalId: [...unknownStageLabels].join(', '),
      error:
        'Etapas de oportunidad que Twenty trae y Control Tower no conoce: esas oportunidades se han guardado como ' +
        '«Prospecto» (LEAD). Alinea las etapas en Twenty, o dilo para añadirlas al contrato.',
    });
  }

  // --- Tasks → tasks (origen Twenty; sin proyecto, se ven junto a las de CT en /tasks) ---
  for (const t of data.tasks) {
    try {
      const stage = t.status as TaskStatus;
      // Las tasks no llevan guard de "push pendiente" porque CT ya no les empuja nada (ADR-009): título y fecha
      // son de Twenty y el pull los reescribe.
      const existing = await resolveInternalId(db, ctx, P, 'task', t.externalId);
      if (existing) {
        // Título Y fecha son de Twenty desde ADR-009 (antes la fecha la gestionaba CT con write-back, que ya no
        // existe: dejarla sin reescribir guardaría en CT una fecha que Twenty no conoce).
        await db
          .update(tasks)
          .set({ title: t.title, status: stage, dueDate: t.dueDate, updatedAt: new Date() })
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
