import { OPPORTUNITY_STAGE, type OpportunityStage, type TaskStatus } from '@ct/domain';
import type { TwentyRawRecord } from './client';
import { ORGANIZATION_TYPE, parsePersonRoles, parseCompanyRoles } from '@ct/domain';
import type { NormalizedCompany, NormalizedPerson, NormalizedOpportunity, NormalizedTask } from '../types';

/**
 * Mapea registros crudos de Twenty a DTOs normalizados de dominio (ERRATA-010: el esquema del
 * proveedor no se filtra al dominio). Extracción defensiva (los campos de Twenty varían).
 */

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}
/** Normaliza un dominio/URL a URL absoluta (Twenty guarda `domainName` sin esquema, p. ej. "acme.com").
 *  Devuelve undefined si no es una URL parseable (mejor omitir que romper la validación `url()`). */
function toUrl(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (!s) return undefined;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    new URL(withScheme);
    return withScheme;
  } catch {
    return undefined;
  }
}
function nested(obj: TwentyRawRecord, key: string, sub: string): string | undefined {
  const o = obj[key];
  if (o && typeof o === 'object') return str((o as Record<string, unknown>)[sub]);
  return undefined;
}

/**
 * Mapea el stage de Twenty al enum de dominio (ADR-002). Twenty está alineado 1:1 con los estados de CT, así que es
 * identidad: se valida contra el enum y, para instancias no alineadas o valores legacy, se traduce/cae a LEAD.
 */
const STAGE_SET = new Set<string>(OPPORTUNITY_STAGE);
/** Estados viejos de Twenty y de CT (hasta M39) que aún pueden llegar de un backup o de una instancia sin migrar. */
const LEGACY_STAGES: Record<string, OpportunityStage> = {
  NEW: 'LEAD',
  SCREENING: 'QUALIFIED',
  CUSTOMER: 'WON',
  CONTACTED: 'LEAD',
  PROPOSAL: 'PROPOSAL_SENT',
  CANCELLED: 'LOST',
  CLOSED: 'ONBOARDED',
};

export function mapTwentyStage(raw: unknown): OpportunityStage {
  return mapStage(raw).stage;
}

/**
 * El stage, y **si hubo que adivinarlo**. Lo segundo importa: un stage que CT no conoce caía a `LEAD` en silencio,
 * así que una oportunidad en una etapa nueva de Twenty aparecía aquí como «Prospecto» sin que nada lo dijera —y
 * mover el embudo es justo lo único que CT escribe de vuelta—. Ahora el sync lo informa (owner 2026-10-02, al
 * revisar las etiquetas de los selects de Twenty).
 *
 * Los `LEGACY_STAGES` **no** se consideran desconocidos: ahí sabemos a qué equivalen.
 */
export function mapStage(raw: unknown): { stage: OpportunityStage; unknown?: string } {
  const original = typeof raw === 'string' ? raw.trim() : '';
  const s = original.toUpperCase().replace(/[\s-]+/g, '_');
  if (STAGE_SET.has(s)) return { stage: s as OpportunityStage };
  const legacy = LEGACY_STAGES[s];
  if (legacy) return { stage: legacy };
  // Sin etiqueta no hay nada que avisar (un campo vacío no es un valor nuevo); con etiqueta, se dice cuál.
  return original === '' ? { stage: 'LEAD' } : { stage: 'LEAD', unknown: original };
}

/**
 * Nombre POR DEFECTO del campo **Organization Type** en la API de Twenty. Configurable por integración
 * (`configuration.fields.companyOrganizationType`) por lo mismo que el de roles: no se adivina.
 */
export const DEFAULT_ORG_TYPE_FIELD = 'organizationType';

/** Normaliza una etiqueta de Twenty al código del enum («Public Body» → `PUBLIC_BODY`). */
function orgTypeCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const code = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  // Si no es uno de los tipos del contrato, se guarda lo que venga: en ese Twenty puede haber una etiqueta propia,
  // y mostrarla es más útil que descartarla (la interfaz traduce sólo los códigos que conoce).
  return (ORGANIZATION_TYPE as readonly string[]).includes(code) ? code : raw.trim();
}

/**
 * Nombre POR DEFECTO del campo de **roles de relación de una empresa**. En un Twenty estándar las dos familias usan
 * el mismo nombre (`relationshipRoles`), pero se configura aparte (`configuration.fields.companyRelationshipRoles`)
 * porque son dos campos distintos del CRM, con vocabularios distintos, y renombrar uno no renombra el otro.
 */
export const DEFAULT_COMPANY_ROLES_FIELD = 'relationshipRoles';

export function mapCompany(
  raw: TwentyRawRecord,
  orgTypeField = DEFAULT_ORG_TYPE_FIELD,
  rolesField = DEFAULT_COMPANY_ROLES_FIELD,
): NormalizedCompany {
  const rawType = (raw as Record<string, unknown>)[orgTypeField];
  const parsed = parseCompanyRoles((raw as Record<string, unknown>)[rolesField]);
  return {
    externalId: raw.id,
    name: str(raw.name) ?? '(sin nombre)',
    // `industry` guarda el **tipo de organización** (owner 2026-09-27): el «industry» del CRM viejo no se usa.
    industry: orgTypeCode(rawType),
    websiteUrl: toUrl(str(raw.domainName) ?? nested(raw, 'domainName', 'primaryLinkUrl')),
    orgTypeFieldPresent: rawType !== undefined && rawType !== null,
    relationshipRoles: parsed.roles,
    rolesFieldPresent: parsed.present,
    unknownRoles: parsed.unknown,
  };
}

/**
 * Nombre POR DEFECTO del campo de roles de relación en la API de Twenty. Es configurable por integración
 * (`configuration.fields.personRelationshipRoles`) porque **no se puede inferir**: el handoff prohíbe adivinar
 * identificadores de API, y en un Twenty self-hosted un campo personalizado puede llamarse de otra forma. Si con
 * este nombre no viene nada, el pull lo dice (`rolesFieldPresent: false`) y CT no reclasifica a nadie.
 */
export const DEFAULT_PERSON_ROLES_FIELD = 'relationshipRoles';

export function mapPerson(raw: TwentyRawRecord, rolesField = DEFAULT_PERSON_ROLES_FIELD): NormalizedPerson {
  const parsed = parsePersonRoles((raw as Record<string, unknown>)[rolesField]);
  return {
    externalId: raw.id,
    firstName: str(raw.firstName) ?? nested(raw, 'name', 'firstName'),
    lastName: str(raw.lastName) ?? nested(raw, 'name', 'lastName'),
    email: str(raw.email) ?? nested(raw, 'emails', 'primaryEmail'),
    phone: str(raw.phone) ?? nested(raw, 'phones', 'primaryPhoneNumber'),
    jobTitle: str(raw.jobTitle),
    companyExternalId: str(raw.companyId),
    relationshipRoles: parsed.roles,
    rolesFieldPresent: parsed.present,
    unknownRoles: parsed.unknown,
  };
}

/** Mapea el status de una Task de Twenty al enum de dominio. Best-effort con default TODO. */
export function mapTwentyTaskStatus(raw: unknown): TaskStatus {
  const s = (typeof raw === 'string' ? raw : '').toUpperCase();
  const table: Record<string, TaskStatus> = {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    DONE: 'DONE',
  };
  return table[s] ?? 'TODO';
}

export function mapTask(raw: TwentyRawRecord): NormalizedTask {
  const due = str(raw.dueAt) ?? str(raw.dueDate);
  return {
    externalId: raw.id,
    title: str(raw.title) ?? str(raw.name) ?? '(tarea sin título)',
    status: mapTwentyTaskStatus(raw.status),
    dueDate: due ? due.slice(0, 10) : undefined,
  };
}

export function mapOpportunity(raw: TwentyRawRecord): NormalizedOpportunity {
  const amount = raw.amount;
  let estimatedValue: number | undefined;
  let currencyCode: string | undefined;
  if (typeof amount === 'number') estimatedValue = amount;
  else if (amount && typeof amount === 'object') {
    const micros = (amount as Record<string, unknown>).amountMicros;
    if (typeof micros === 'number') estimatedValue = micros / 1_000_000;
    currencyCode = str((amount as Record<string, unknown>).currencyCode);
  }
  const close = str(raw.closeDate);
  return {
    externalId: raw.id,
    name: str(raw.name) ?? '(sin nombre)',
    ...(() => {
      const m = mapStage(raw.stage);
      return m.unknown ? { stage: m.stage, unknownStage: m.unknown } : { stage: m.stage };
    })(),
    estimatedValue,
    currencyCode,
    expectedCloseDate: close ? close.slice(0, 10) : undefined,
    companyExternalId: str(raw.companyId),
  };
}

/**
 * Reverse mapper (write-back CT → Twenty). Construye el cuerpo de `PATCH /rest/{objeto}/{id}`. Sólo se incluye lo
 * que CT posee —desde ADR-009, únicamente el `stage` de una oportunidad—; el resto de Twenty queda intacto. Se
 * omiten los `undefined` (no se pisan con null los campos no gestionados).
 */
function put<T extends object>(obj: T, key: string, value: unknown): void {
  if (value !== undefined && value !== null) (obj as Record<string, unknown>)[key] = value;
}

/**
 * Write-back de opportunity: **sólo el `stage`**, y es **lo único que Control Tower escribe en Twenty**
 * (ADR-009, owner 2026-09-26). CT es la máquina de estados de la oportunidad; el resto de campos (nombre, importe,
 * fecha, empresa) los posee Twenty y el pull los reescribe. Empujarlos desde CT sería peor que inútil: entre dos
 * syncs la copia de CT puede estar vieja y machacaría en Twenty un dato más nuevo.
 *
 * Aquí vivían también `companyPatch` (cliente), `personPatch` (contacto) y `taskPatch` (fecha de una task).
 * Se retiraron el 2026-09-26: esos campos son de Twenty y CT ni los edita ni los envía.
 */
export interface OpportunityPushInput { stage?: string | null }

export function opportunityPatch(o: OpportunityPushInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  put(body, 'stage', o.stage ?? undefined);
  return body;
}
