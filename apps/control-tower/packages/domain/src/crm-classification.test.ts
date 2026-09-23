import { describe, it, expect } from 'vitest';
import { classifyBillingSubject, billingPartyEntity } from './crm-classification';

/** Tabla de verdad completa del handoff §2.2: son cuatro casos, se prueban los cuatro. */
describe('classifyBillingSubject', () => {
  it('con Company es ORGANIZATION, digan lo que digan los roles del contacto', () => {
    // Una persona puede ser INDIVIDUAL_CLIENT en otra oportunidad suya y aquí ser sólo el contacto.
    expect(
      classifyBillingSubject({ hasCompany: true, hasPointOfContact: true, pointOfContactRoles: ['INDIVIDUAL_CLIENT'] }),
    ).toEqual({ subject: 'ORGANIZATION', reason: 'COMPANY_PRESENT' });
  });

  it('sin Company y con contacto INDIVIDUAL_CLIENT es INDIVIDUAL', () => {
    expect(
      classifyBillingSubject({ hasCompany: false, hasPointOfContact: true, pointOfContactRoles: ['INDIVIDUAL_CLIENT'] }),
    ).toEqual({ subject: 'INDIVIDUAL', reason: 'NO_COMPANY_POC_INDIVIDUAL' });
  });

  it('sin Company y con contacto SIN el rol queda UNDETERMINED (falta marcarlo en Twenty)', () => {
    expect(
      classifyBillingSubject({ hasCompany: false, hasPointOfContact: true, pointOfContactRoles: ['PARTNER'] }),
    ).toEqual({ subject: 'UNDETERMINED', reason: 'NO_COMPANY_POC_NOT_INDIVIDUAL' });
  });

  it('sin Company y sin contacto queda UNDETERMINED', () => {
    expect(classifyBillingSubject({ hasCompany: false, hasPointOfContact: false, pointOfContactRoles: [] })).toEqual({
      subject: 'UNDETERMINED',
      reason: 'NO_COMPANY_NO_POC',
    });
  });

  it('preserva el multi-select: el rol cuenta aunque venga acompañado de otros', () => {
    expect(
      classifyBillingSubject({
        hasCompany: false,
        hasPointOfContact: true,
        pointOfContactRoles: ['REFERRAL_SOURCE', 'INDIVIDUAL_CLIENT', 'COLLABORATOR'],
      }).subject,
    ).toBe('INDIVIDUAL');
  });

  it('dice de qué entidad se leen los datos de facturación', () => {
    expect(billingPartyEntity('ORGANIZATION')).toBe('CLIENT');
    expect(billingPartyEntity('INDIVIDUAL')).toBe('CONTACT');
    expect(billingPartyEntity('UNDETERMINED')).toBeNull();
  });
});
