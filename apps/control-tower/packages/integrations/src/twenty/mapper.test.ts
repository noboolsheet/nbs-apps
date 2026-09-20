import { describe, it, expect } from 'vitest';
import { mapCompany, mapPerson, mapOpportunity, mapTwentyStage, companyPatch, personPatch, opportunityPatch } from './mapper';

describe('twenty mapper', () => {
  it('mapea company defensivamente', () => {
    const c = mapCompany({ id: 'c1', name: 'Acme', industry: 'Retail', domainName: { primaryLinkUrl: 'https://acme.com' } });
    expect(c).toMatchObject({ externalId: 'c1', name: 'Acme', industry: 'Retail', websiteUrl: 'https://acme.com' });
  });

  it('normaliza el dominio sin esquema a URL absoluta (bug real de sync)', () => {
    // Twenty guarda domainName como dominio pelado → createClient exige url() válida.
    expect(mapCompany({ id: 'c1', name: 'Alondra', domainName: 'alondrama.com' }).websiteUrl).toBe('https://alondrama.com');
    // Dominio ya con esquema: se respeta.
    expect(mapCompany({ id: 'c2', name: 'X', domainName: 'http://x.io' }).websiteUrl).toBe('http://x.io');
    // Basura no parseable → undefined (mejor omitir que romper la validación).
    expect(mapCompany({ id: 'c3', name: 'Y', domainName: '   ' }).websiteUrl).toBeUndefined();
  });

  it('mapea person con name anidado, email primario y teléfono', () => {
    const p = mapPerson({
      id: 'p1',
      name: { firstName: 'Jane', lastName: 'Doe' },
      emails: { primaryEmail: 'jane@acme.com' },
      phones: { primaryPhoneNumber: '5551234' },
      companyId: 'c1',
    });
    expect(p).toMatchObject({ externalId: 'p1', firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com', phone: '5551234', companyExternalId: 'c1' });
  });

  it('mapea opportunity con amount en micros, moneda y fecha de cierre', () => {
    const o = mapOpportunity({
      id: 'o1',
      name: 'Deal',
      stage: 'PROPOSAL_SENT',
      amount: { amountMicros: 12000000, currencyCode: 'EUR' },
      closeDate: '2026-08-31T19:32:00.000Z',
      companyId: 'c1',
    });
    expect(o).toMatchObject({ externalId: 'o1', name: 'Deal', stage: 'PROPOSAL_SENT', estimatedValue: 12, currencyCode: 'EUR', expectedCloseDate: '2026-08-31', companyExternalId: 'c1' });
  });

  it('stage: identidad para los estados de CT; legacy y desconocidos con fallback', () => {
    expect(mapTwentyStage('QUALIFIED')).toBe('QUALIFIED');
    expect(mapTwentyStage('NEGOTIATION')).toBe('NEGOTIATION');
    expect(mapTwentyStage('lost')).toBe('LOST');
    expect(mapTwentyStage('ONBOARDED')).toBe('ONBOARDED');
    expect(mapTwentyStage('PREPARING_PROP')).toBe('PREPARING_PROP');
    expect(mapTwentyStage('CUSTOMER')).toBe('WON'); // legacy Twenty
    expect(mapTwentyStage('NEW')).toBe('LEAD'); // legacy Twenty
    // Stages que CT tuvo hasta M39: si vuelven desde un backup o una instancia sin migrar, se traducen.
    expect(mapTwentyStage('CLOSED')).toBe('ONBOARDED');
    expect(mapTwentyStage('CANCELLED')).toBe('LOST');
    expect(mapTwentyStage('PROPOSAL')).toBe('PROPOSAL_SENT');
    expect(mapTwentyStage('SOMETHING')).toBe('LEAD');
  });

  describe('reverse mappers (write-back CT → Twenty)', () => {
    it('companyPatch: name + domainName compuesto (sin esquema) + industry; omite vacíos', () => {
      expect(companyPatch({ name: 'Acme', websiteUrl: 'https://acme.com', industry: 'Retail' })).toEqual({
        name: 'Acme',
        domainName: { primaryLinkUrl: 'acme.com' },
        industry: 'Retail',
      });
      expect(companyPatch({ name: 'Solo' })).toEqual({ name: 'Solo' }); // sin web ni industry → no aparecen
    });

    it('personPatch: name/emails/phones compuestos + jobTitle', () => {
      expect(personPatch({ firstName: 'Jane', lastName: 'Doe', email: 'j@a.com', phone: '5551234', jobTitle: 'CTO' })).toEqual({
        name: { firstName: 'Jane', lastName: 'Doe' },
        emails: { primaryEmail: 'j@a.com' },
        phones: { primaryPhoneNumber: '5551234' },
        jobTitle: 'CTO',
      });
    });

    it('opportunityPatch: SÓLO el stage (CT no posee ningún otro campo de la oportunidad)', () => {
      // Owner 2026-09-02: CT es la máquina de estados de la oportunidad. Nombre/importe/fecha se editan en Twenty,
      // así que el cuerpo del PATCH no debe llevarlos: entre dos syncs la copia de CT puede estar vieja.
      expect(opportunityPatch({ stage: 'WON' })).toEqual({ stage: 'WON' });
    });

    it('opportunityPatch: sin stage → cuerpo vacío (no pisa nada en Twenty)', () => {
      expect(opportunityPatch({})).toEqual({});
      expect(opportunityPatch({ stage: null })).toEqual({});
    });
  });
});
