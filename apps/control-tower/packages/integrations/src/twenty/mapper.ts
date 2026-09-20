import { OPPORTUNITY_STAGE, type OpportunityStage, type TaskStatus } from '@ct/domain';
import type { TwentyRawRecord } from './client';
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
export function mapTwentyStage(raw: unknown): OpportunityStage {
  const s = (typeof raw === 'string' ? raw : '').toUpperCase();
  if (STAGE_SET.has(s)) return s as OpportunityStage;
  // Fallback para instancias con los estados legacy de Twenty (por si no se alinearon) y para los stages que CT
  // tuvo hasta M39 y ya no existen (por si vuelve un valor viejo desde un backup o una instancia sin migrar).
  const legacy: Record<string, OpportunityStage> = {
    NEW: 'LEAD',
    SCREENING: 'QUALIFIED',
    CUSTOMER: 'WON',
    CONTACTED: 'LEAD',
    PROPOSAL: 'PROPOSAL_SENT',
    CANCELLED: 'LOST',
    CLOSED: 'ONBOARDED',
  };
  return legacy[s] ?? 'LEAD';
}

export function mapCompany(raw: TwentyRawRecord): NormalizedCompany {
  return {
    externalId: raw.id,
    name: str(raw.name) ?? '(sin nombre)',
    industry: str(raw.industry),
    websiteUrl: toUrl(str(raw.domainName) ?? nested(raw, 'domainName', 'primaryLinkUrl')),
  };
}

export function mapPerson(raw: TwentyRawRecord): NormalizedPerson {
  return {
    externalId: raw.id,
    firstName: str(raw.firstName) ?? nested(raw, 'name', 'firstName'),
    lastName: str(raw.lastName) ?? nested(raw, 'name', 'lastName'),
    email: str(raw.email) ?? nested(raw, 'emails', 'primaryEmail'),
    phone: str(raw.phone) ?? nested(raw, 'phones', 'primaryPhoneNumber'),
    jobTitle: str(raw.jobTitle),
    companyExternalId: str(raw.companyId),
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
    stage: mapTwentyStage(raw.stage),
    estimatedValue,
    currencyCode,
    expectedCloseDate: close ? close.slice(0, 10) : undefined,
    companyExternalId: str(raw.companyId),
  };
}

/**
 * Reverse mappers (write-back CT → Twenty, E-1). Construyen el cuerpo `PATCH /rest/{objeto}/{id}` con la forma
 * EXACTA de los campos compuestos de Twenty (verificada en vivo). Solo se incluyen los campos que CT gestiona;
 * el resto de Twenty queda intacto. Se omiten los `undefined` (no se pisan con null los campos no gestionados).
 */
function stripScheme(url: string | null | undefined): string | undefined {
  const s = (url ?? '').trim();
  if (!s) return undefined;
  return s.replace(/^https?:\/\//i, '');
}
function put<T extends object>(obj: T, key: string, value: unknown): void {
  if (value !== undefined && value !== null) (obj as Record<string, unknown>)[key] = value;
}

export interface ClientPushInput { name?: string | null; websiteUrl?: string | null; industry?: string | null }
export interface ContactPushInput { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null; jobTitle?: string | null }
/**
 * Write-back de opportunity: **sólo el `stage`** (owner 2026-09-02). CT es la máquina de estados de la oportunidad;
 * el resto de campos (nombre, importe, fecha, empresa) los posee Twenty y el pull los reescribe. Empujarlos desde CT
 * sería peor que inútil: entre dos syncs la copia de CT puede estar vieja y machacaría en Twenty un dato más nuevo.
 */
export interface OpportunityPushInput { stage?: string | null }

export function companyPatch(c: ClientPushInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  put(body, 'name', c.name ?? undefined);
  const domain = stripScheme(c.websiteUrl);
  if (domain) body.domainName = { primaryLinkUrl: domain };
  put(body, 'industry', c.industry ?? undefined);
  return body;
}

export function personPatch(p: ContactPushInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (p.firstName != null || p.lastName != null) body.name = { firstName: p.firstName ?? '', lastName: p.lastName ?? '' };
  if (p.email != null && p.email !== '') body.emails = { primaryEmail: p.email };
  if (p.phone != null && p.phone !== '') body.phones = { primaryPhoneNumber: p.phone };
  put(body, 'jobTitle', p.jobTitle ?? undefined);
  return body;
}

export function opportunityPatch(o: OpportunityPushInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  put(body, 'stage', o.stage ?? undefined);
  return body;
}

/** Campos de una task que CT empuja a Twenty. Solo la fecha (CT es su dueño); el título lo posee Twenty. */
export interface TaskPushInput { dueDate?: string | null }

export function taskPatch(t: TaskPushInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  // `dueDate` = 'YYYY-MM-DD' → dueAt ISO; `null` limpia la fecha en Twenty; `undefined` no toca el campo.
  if (t.dueDate === null) body.dueAt = null;
  else if (t.dueDate) body.dueAt = new Date(`${t.dueDate}T00:00:00.000Z`).toISOString();
  return body;
}
