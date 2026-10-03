import { describe, it, expect } from 'vitest';
import { mapCompany, mapPerson, mapOpportunity, mapStage, mapTwentyStage, opportunityPatch } from './mapper';

describe('twenty mapper', () => {
  it('mapea company defensivamente', () => {
    const c = mapCompany({ id: 'c1', name: 'Acme', domainName: { primaryLinkUrl: 'https://acme.com' } });
    expect(c).toMatchObject({ externalId: 'c1', name: 'Acme', websiteUrl: 'https://acme.com' });
  });

  it('`industry` guarda el Organization Type de Twenty, no el «industry» viejo', () => {
    // Owner 2026-09-27: en la ficha y en la lista ese campo muestra el TIPO DE ORGANIZACIÓN. El «industry» del CRM
    // viejo ya no se lee (el contrato nuevo no lo incluye), así que mandarlo no debe colarse como tipo.
    expect(mapCompany({ id: 'c1', name: 'Acme', industry: 'Retail' })).toMatchObject({
      industry: undefined,
      orgTypeFieldPresent: false,
    });
    // Etiqueta tal y como la escribe Twenty → código del contrato.
    expect(mapCompany({ id: 'c1', name: 'Acme', organizationType: 'Public Body' })).toMatchObject({
      industry: 'PUBLIC_BODY',
      orgTypeFieldPresent: true,
    });
    // Una etiqueta propia de ese Twenty se conserva tal cual: mostrarla informa más que descartarla.
    expect(mapCompany({ id: 'c1', name: 'Acme', organizationType: 'Cooperativa' }).industry).toBe('Cooperativa');
    // Nombre de campo distinto, como en un Twenty con campo personalizado.
    expect(mapCompany({ id: 'c1', name: 'Acme', tipoOrg: 'BUSINESS' }, 'tipoOrg').industry).toBe('BUSINESS');
  });

  /** Roles de relación de la empresa (M46): la columna «Relación» de Clientes sale de aquí. */
  it('trae los roles de relación, con el nombre de campo configurable', () => {
    const c = mapCompany({ id: 'c1', name: 'Acme', relationshipRoles: ['Commercial Account', 'Supplier'] });
    expect(c.relationshipRoles).toEqual(['COMMERCIAL_ACCOUNT', 'SUPPLIER']);
    expect(c.rolesFieldPresent).toBe(true);
    expect(mapCompany({ id: 'c1', name: 'Acme', roles: ['PARTNER'] }, undefined, 'roles').relationshipRoles).toEqual([
      'PARTNER',
    ]);
  });

  it('si el campo de roles no viene, lo dice (para que el sync no borre lo guardado)', () => {
    const c = mapCompany({ id: 'c1', name: 'Acme' });
    expect(c.rolesFieldPresent).toBe(false);
    expect(c.relationshipRoles).toEqual([]);
  });

  it('una etiqueta de rol que CT no conoce se informa, no se guarda', () => {
    const c = mapCompany({ id: 'c1', name: 'Acme', relationshipRoles: ['Investor'] });
    expect(c.relationshipRoles).toEqual([]);
    expect(c.unknownRoles).toEqual(['Investor']);
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

  /**
   * El fallback a `LEAD` era **silencioso**: una oportunidad en una etapa nueva de Twenty aparecía en CT como
   * «Prospecto» y nada lo decía — y mover el embudo es lo único que CT escribe de vuelta. Ahora el mapper dice que
   * tuvo que adivinar y el sync lo avisa (owner 2026-10-02).
   */
  it('stage: dice CUÁL no reconoció, y no confunde un legacy con un desconocido', () => {
    expect(mapStage('NEGOTIATION')).toEqual({ stage: 'NEGOTIATION' });
    expect(mapStage('CUSTOMER')).toEqual({ stage: 'WON' }); // legacy: sabemos a qué equivale, no es desconocido
    expect(mapStage('Due Diligence')).toEqual({ stage: 'LEAD', unknown: 'Due Diligence' });
    // Normaliza antes de rendirse: un espacio o un guion no hacen desconocido a un estado que sí conocemos.
    expect(mapStage('proposal sent')).toEqual({ stage: 'PROPOSAL_SENT' });
    // Vacío o ausente no es «un valor nuevo»: no hay nada que avisar.
    expect(mapStage('')).toEqual({ stage: 'LEAD' });
    expect(mapStage(undefined)).toEqual({ stage: 'LEAD' });
  });

  it('la oportunidad arrastra la etiqueta desconocida para que el sync la informe', () => {
    const o = mapOpportunity({ id: 'o9', name: 'Trato', stage: 'Due Diligence' });
    expect(o).toMatchObject({ stage: 'LEAD', unknownStage: 'Due Diligence' });
    // Y cuando el stage se reconoce, no se inventa el campo.
    expect(mapOpportunity({ id: 'o8', name: 'Trato', stage: 'WON' }).unknownStage).toBeUndefined();
  });

  describe('write-back CT → Twenty (ADR-009: sólo el stage de la oportunidad)', () => {
    // Aquí había también `companyPatch` (cliente) y `personPatch` (contacto). Se retiraron el 2026-09-26 con el
    // write-back: todo lo que llega de Twenty es de Twenty y se edita allí.
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
