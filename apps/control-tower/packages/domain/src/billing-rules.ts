import type { BillingSubject } from './enums';
import { billingPartyEntity, type ClassificationReason } from './crm-classification';

/**
 * Completitud Administrativa (handoff §7.1).
 *
 * Corrección que exige el contrato: el gate debe validar la facturación **sobre la entidad
 * correcta** —Company si la oportunidad es de organización, Person si es de un cliente individual—
 * y NO puede dar por hecho que toda oportunidad tiene Company.
 *
 * Tres reglas de diseño que vienen literales del handoff:
 *  1. **Consciente del país y configurable.** PEC y SDI son campos condicionales de la facturación
 *     electrónica italiana, NO requisitos universales. Un cliente extranjero no los necesita.
 *  2. **Prohibido inferir obligaciones fiscales no configuradas.** Un país sin reglas propias exige
 *     sólo la base; no se adivina el régimen de ningún sitio.
 *  3. **Resultado estructurado de datos que faltan**, no un booleano: la interfaz tiene que poder
 *     decir qué falta y en qué registro de Twenty se arregla.
 *
 * Las reglas son DATOS, no condicionales encadenados, para poder añadir un país sin tocar lógica.
 */

export type BillingFieldKey =
  | 'legalName'
  | 'billingEmail'
  | 'billingAddress'
  | 'taxCountry'
  | 'vatNumber'
  | 'fiscalCode'
  | 'pecEmail'
  | 'sdiCode'
  | 'personalTaxId';

export interface BillingRequirement {
  /** Campo exigido. Con `anyOf`, basta con que esté presente UNO del grupo. */
  field: BillingFieldKey;
  anyOf?: readonly BillingFieldKey[];
  severity: 'REQUIRED' | 'RECOMMENDED';
  /** A qué sujetos aplica. Ausente = a los dos. PEC/SDI son de organización, no universales. */
  appliesTo?: readonly BillingSubject[];
  /** Identificador estable de la regla, para poder explicar POR QUÉ se exige algo. */
  ruleCode: string;
}

export interface BillingRulesConfig {
  base: readonly BillingRequirement[];
  /** Añadidos por país (ISO-3166-1 alpha-2). Un `ruleCode` repetido SUSTITUYE al de base. */
  byCountry: Readonly<Record<string, readonly BillingRequirement[]>>;
}

export interface BillingRuleset {
  /** Qué juego de reglas se aplicó: 'IT', 'ES', 'DEFAULT'… para poder mostrarlo. */
  id: string;
  requirements: readonly BillingRequirement[];
}

/**
 * Reglas por defecto. La base es lo que hace falta para emitir una factura en cualquier sitio;
 * lo específico de un país vive en `byCountry` y **sólo** se aplica si el país fiscal coincide.
 */
export const DEFAULT_BILLING_RULES: BillingRulesConfig = {
  base: [
    // La razón social sólo tiene sentido en una organización: una persona factura con su nombre.
    { field: 'legalName', severity: 'REQUIRED', appliesTo: ['ORGANIZATION'], ruleCode: 'BASE.LEGAL_NAME' },
    { field: 'billingEmail', severity: 'REQUIRED', ruleCode: 'BASE.BILLING_EMAIL' },
    { field: 'billingAddress', severity: 'REQUIRED', ruleCode: 'BASE.ADDRESS' },
    { field: 'taxCountry', severity: 'REQUIRED', ruleCode: 'BASE.TAX_COUNTRY' },
    // Un identificador fiscal u otro: qué vale depende del país y del tipo de sujeto.
    {
      field: 'vatNumber',
      anyOf: ['vatNumber', 'fiscalCode', 'personalTaxId'],
      severity: 'REQUIRED',
      ruleCode: 'BASE.TAX_ID',
    },
  ],
  byCountry: {
    // Italia: la facturación electrónica necesita una vía de entrega (PEC o código SDI), pero sólo
    // para organizaciones. Un particular sin partita IVA no tiene ni PEC ni SDI.
    IT: [
      {
        field: 'pecEmail',
        anyOf: ['pecEmail', 'sdiCode'],
        severity: 'REQUIRED',
        appliesTo: ['ORGANIZATION'],
        ruleCode: 'IT.EINVOICE_ROUTING',
      },
      {
        field: 'fiscalCode',
        anyOf: ['fiscalCode', 'personalTaxId'],
        severity: 'REQUIRED',
        appliesTo: ['INDIVIDUAL'],
        ruleCode: 'IT.CODICE_FISCALE',
      },
    ],
    // España: el NIF/CIF es obligatorio y no admite alternativa.
    ES: [{ field: 'vatNumber', severity: 'REQUIRED', ruleCode: 'BASE.TAX_ID' }],
  },
};

/**
 * Combina las reglas por defecto con un override de la organización. Un `ruleCode` repetido gana el
 * del override (permite relajar o endurecer una regla sin duplicar el resto).
 */
export function mergeBillingRules(
  base: BillingRulesConfig,
  override?: Partial<BillingRulesConfig> | null,
): BillingRulesConfig {
  if (!override) return base;
  const mergeList = (a: readonly BillingRequirement[], b?: readonly BillingRequirement[]) => {
    if (!b?.length) return a;
    const byCode = new Map(a.map((r) => [r.ruleCode, r]));
    for (const r of b) byCode.set(r.ruleCode, r);
    return [...byCode.values()];
  };
  const countries = new Set([...Object.keys(base.byCountry), ...Object.keys(override.byCountry ?? {})]);
  const byCountry: Record<string, readonly BillingRequirement[]> = {};
  for (const c of countries) {
    byCountry[c] = mergeList(base.byCountry[c] ?? [], override.byCountry?.[c]);
  }
  return { base: mergeList(base.base, override.base), byCountry };
}

/** Juego de reglas efectivo para un país. Sin país o sin reglas propias → sólo la base. */
export function resolveRuleset(cfg: BillingRulesConfig, taxCountry: string | null | undefined): BillingRuleset {
  const code = (taxCountry ?? '').trim().toUpperCase();
  const extra = code ? cfg.byCountry[code] : undefined;
  if (!extra?.length) return { id: 'DEFAULT', requirements: cfg.base };
  // Un ruleCode del país sustituye al de base (p. ej. ES endurece BASE.TAX_ID quitando el anyOf).
  const byCode = new Map(cfg.base.map((r) => [r.ruleCode, r]));
  for (const r of extra) byCode.set(r.ruleCode, r);
  return { id: code, requirements: [...byCode.values()] };
}

/** Los datos de facturación de la entidad que toca, ya normalizados. `null`/'' cuentan como ausentes. */
export type BillingParty = Partial<Record<BillingFieldKey, string | null | undefined>> & {
  /** La dirección es un objeto; aquí sólo interesa si está o no. */
  billingAddress?: string | null;
};

export interface MissingField {
  /** Dónde hay que ir a arreglarlo — siempre en Twenty. */
  entity: 'CLIENT' | 'CONTACT';
  field: BillingFieldKey;
  severity: 'REQUIRED' | 'RECOMMENDED';
  ruleCode: string;
  /** Si la regla era `anyOf`, con cuál de estos se habría satisfecho. */
  satisfiedByAnyOf?: readonly BillingFieldKey[];
}

export type CompletenessBlocker =
  /** No se sabe a quién se factura: primero hay que clasificar la oportunidad. */
  | { code: 'SUBJECT_UNDETERMINED'; reason: ClassificationReason }
  /** Sin país fiscal no se puede saber qué exige la ley: no se puede afirmar que esté completo. */
  | { code: 'TAX_COUNTRY_MISSING' };

export interface AdminCompletenessResult {
  subject: BillingSubject;
  partyEntity: 'CLIENT' | 'CONTACT' | null;
  /** País efectivo con el que se resolvieron las reglas. */
  taxCountry: string | null;
  /** Qué juego se aplicó ('IT' | 'ES' | 'DEFAULT'), para poder explicarlo en pantalla. */
  rulesetId: string;
  missing: readonly MissingField[];
  blockers: readonly CompletenessBlocker[];
  /** Derivado: sin bloqueos y sin obligatorios pendientes. Nunca es la única salida. */
  complete: boolean;
}

export interface AdminCompletenessInput {
  subject: BillingSubject;
  classificationReason: ClassificationReason;
  /** Datos de la entidad que factura. `null` si aún no se sabe cuál es. */
  party: BillingParty | null;
}

const present = (v: string | null | undefined): boolean => typeof v === 'string' && v.trim() !== '';

export function evaluateAdminCompleteness(
  input: AdminCompletenessInput,
  ruleset: BillingRuleset,
): AdminCompletenessResult {
  const partyEntity = billingPartyEntity(input.subject);
  const blockers: CompletenessBlocker[] = [];

  // Sin sujeto no hay nada que validar: falta información de relación en Twenty.
  if (input.subject === 'UNDETERMINED' || !partyEntity || !input.party) {
    return {
      subject: input.subject,
      partyEntity,
      taxCountry: null,
      rulesetId: ruleset.id,
      missing: [],
      blockers: [{ code: 'SUBJECT_UNDETERMINED', reason: input.classificationReason }],
      complete: false,
    };
  }

  const party = input.party;
  const taxCountry = present(party.taxCountry) ? party.taxCountry!.trim().toUpperCase() : null;
  // Sin país no se puede afirmar que esté completo: podría ser italiano y faltarle el SDI.
  if (!taxCountry) blockers.push({ code: 'TAX_COUNTRY_MISSING' });

  const missing: MissingField[] = [];
  for (const req of ruleset.requirements) {
    if (req.appliesTo && !req.appliesTo.includes(input.subject)) continue;
    const candidates = req.anyOf ?? [req.field];
    if (candidates.some((f) => present(party[f]))) continue;
    missing.push({
      entity: partyEntity,
      field: req.field,
      severity: req.severity,
      ruleCode: req.ruleCode,
      ...(req.anyOf ? { satisfiedByAnyOf: req.anyOf } : {}),
    });
  }

  return {
    subject: input.subject,
    partyEntity,
    taxCountry,
    rulesetId: ruleset.id,
    missing,
    blockers,
    complete: blockers.length === 0 && !missing.some((m) => m.severity === 'REQUIRED'),
  };
}
