import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BILLING_RULES,
  evaluateAdminCompleteness,
  mergeBillingRules,
  resolveRuleset,
  type BillingParty,
} from './billing-rules';

const ruleset = (country: string | null) => resolveRuleset(DEFAULT_BILLING_RULES, country);

/** Copia del party sin los campos indicados: más legible que un destructuring con variables sin usar. */
const sin = (p: BillingParty, ...fields: (keyof BillingParty)[]): BillingParty => {
  const out = { ...p };
  for (const f of fields) delete out[f];
  return out;
};

const orgIT: BillingParty = {
  legalName: 'Acme S.r.l.',
  billingEmail: 'fatture@acme.it',
  billingAddress: '{"street":"Via Roma 1","city":"Milano"}',
  taxCountry: 'IT',
  vatNumber: 'IT12345678901',
  pecEmail: 'acme@pec.it',
};

describe('evaluateAdminCompleteness', () => {
  it('organización italiana con PEC está completa', () => {
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: orgIT },
      ruleset('IT'),
    );
    expect(r.complete).toBe(true);
    expect(r.rulesetId).toBe('IT');
    expect(r.missing).toEqual([]);
  });

  it('organización italiana SIN PEC ni SDI no está completa, y dice que valía cualquiera de los dos', () => {
    const sinPec = sin(orgIT, 'pecEmail');
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: sinPec },
      ruleset('IT'),
    );
    expect(r.complete).toBe(false);
    const miss = r.missing.find((m) => m.ruleCode === 'IT.EINVOICE_ROUTING');
    expect(miss?.satisfiedByAnyOf).toEqual(['pecEmail', 'sdiCode']);
    expect(miss?.entity).toBe('CLIENT');
  });

  it('el SDI sirve igual que la PEC', () => {
    const conSdi = sin({ ...orgIT, sdiCode: 'ABCDEF1' }, 'pecEmail');
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: conSdi },
      ruleset('IT'),
    );
    expect(r.complete).toBe(true);
  });

  /** El punto entero de la corrección del handoff: PEC y SDI NO son requisitos universales. */
  it('a una organización EXTRANJERA no se le exigen PEC ni SDI', () => {
    const orgDE: BillingParty = {
      legalName: 'Acme GmbH',
      billingEmail: 'rechnung@acme.de',
      billingAddress: '{"street":"Hauptstr. 2","city":"Berlin"}',
      taxCountry: 'DE',
      vatNumber: 'DE123456789',
    };
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: orgDE },
      ruleset('DE'),
    );
    expect(r.complete).toBe(true);
    expect(r.rulesetId).toBe('DEFAULT');
    expect(r.missing.map((m) => m.ruleCode)).not.toContain('IT.EINVOICE_ROUTING');
  });

  it('a un cliente individual no se le pide razón social, y se valida sobre la PERSONA', () => {
    const persona: BillingParty = {
      billingEmail: 'mario@example.it',
      billingAddress: '{"street":"Via Verdi 3","city":"Roma"}',
      taxCountry: 'IT',
      personalTaxId: 'RSSMRA80A01H501U',
    };
    const r = evaluateAdminCompleteness(
      { subject: 'INDIVIDUAL', classificationReason: 'NO_COMPANY_POC_INDIVIDUAL', party: persona },
      ruleset('IT'),
    );
    expect(r.partyEntity).toBe('CONTACT');
    expect(r.missing.map((m) => m.field)).not.toContain('legalName');
    // Tampoco PEC/SDI: un particular sin partita IVA no los tiene.
    expect(r.missing.map((m) => m.ruleCode)).not.toContain('IT.EINVOICE_ROUTING');
    expect(r.complete).toBe(true);
  });

  it('sin clasificar no se valida nada: primero hay que arreglar la relación en Twenty', () => {
    const r = evaluateAdminCompleteness(
      { subject: 'UNDETERMINED', classificationReason: 'NO_COMPANY_NO_POC', party: null },
      ruleset(null),
    );
    expect(r.complete).toBe(false);
    expect(r.blockers).toEqual([{ code: 'SUBJECT_UNDETERMINED', reason: 'NO_COMPANY_NO_POC' }]);
    expect(r.missing).toEqual([]);
  });

  it('sin país fiscal NUNCA se da por completo (podría ser italiano y faltarle el SDI)', () => {
    const sinPais = sin(orgIT, 'taxCountry');
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: sinPais },
      ruleset(null),
    );
    expect(r.complete).toBe(false);
    expect(r.blockers).toContainEqual({ code: 'TAX_COUNTRY_MISSING' });
    expect(r.missing.map((m) => m.ruleCode)).toContain('BASE.TAX_COUNTRY');
  });

  it('una cadena en blanco cuenta como ausente', () => {
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: { ...orgIT, billingEmail: '   ' } },
      ruleset('IT'),
    );
    expect(r.missing.map((m) => m.ruleCode)).toContain('BASE.BILLING_EMAIL');
  });
});

describe('reglas por país', () => {
  it('un país sin reglas propias usa sólo la base: no se inventan obligaciones fiscales', () => {
    expect(resolveRuleset(DEFAULT_BILLING_RULES, 'PT').id).toBe('DEFAULT');
    expect(resolveRuleset(DEFAULT_BILLING_RULES, 'PT').requirements).toEqual(DEFAULT_BILLING_RULES.base);
  });

  it('España endurece BASE.TAX_ID: el NIF no admite alternativa', () => {
    const es = resolveRuleset(DEFAULT_BILLING_RULES, 'es'); // también en minúsculas
    expect(es.id).toBe('ES');
    expect(es.requirements.find((r) => r.ruleCode === 'BASE.TAX_ID')?.anyOf).toBeUndefined();
  });

  it('el override de la organización sustituye por ruleCode, no duplica', () => {
    const merged = mergeBillingRules(DEFAULT_BILLING_RULES, {
      base: [{ field: 'billingEmail', severity: 'RECOMMENDED', ruleCode: 'BASE.BILLING_EMAIL' }],
    });
    const hits = merged.base.filter((r) => r.ruleCode === 'BASE.BILLING_EMAIL');
    expect(hits).toHaveLength(1);
    expect(hits[0]!.severity).toBe('RECOMMENDED');
  });

  it('un RECOMMENDED que falta no impide estar completo', () => {
    const cfg = mergeBillingRules(DEFAULT_BILLING_RULES, {
      base: [{ field: 'billingEmail', severity: 'RECOMMENDED', ruleCode: 'BASE.BILLING_EMAIL' }],
    });
    const sinEmail = sin(orgIT, 'billingEmail');
    const r = evaluateAdminCompleteness(
      { subject: 'ORGANIZATION', classificationReason: 'COMPANY_PRESENT', party: sinEmail },
      resolveRuleset(cfg, 'IT'),
    );
    expect(r.complete).toBe(true);
    expect(r.missing.map((m) => m.severity)).toContain('RECOMMENDED');
  });
});
