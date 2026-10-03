import { describe, it, expect } from 'vitest';
import { parseCompanyRoles } from './company-roles';
import { parsePersonRoles } from './person-roles';

/**
 * Los roles de relación de una EMPRESA (owner 2026-10-03: columna «Relación» de la lista de Clientes). Mismo lector
 * que las personas, vocabulario distinto — y eso es lo que más se puede torcer, así que es lo que se prueba.
 */
describe('roles de relación de una empresa', () => {
  it('reconoce las etiquetas como las escribe Twenty', () => {
    expect(parseCompanyRoles(['Commercial Account', 'supplier']).roles).toEqual(['COMMERCIAL_ACCOUNT', 'SUPPLIER']);
    expect(parseCompanyRoles('COLLABORATOR, Referral Source').roles).toEqual(['COLLABORATOR', 'REFERRAL_SOURCE']);
  });

  it('devuelve los roles en el orden del enum, sin repetidos', () => {
    expect(parseCompanyRoles(['SUPPLIER', 'PARTNER', 'supplier']).roles).toEqual(['PARTNER', 'SUPPLIER']);
  });

  it('distingue «el campo no viene» de «viene vacío»', () => {
    // Manda igual que en las personas: sin el campo el sync NO escribe la columna (no borra lo que hubiera) y avisa.
    expect(parseCompanyRoles(undefined)).toEqual({ roles: [], present: false, unknown: [] });
    expect(parseCompanyRoles(null).present).toBe(false);
    expect(parseCompanyRoles([]).present).toBe(true);
  });

  it('un rol de PERSONA no vale para una empresa: se informa como desconocido', () => {
    // Los dos campos se llaman igual en un Twenty estándar; si alguien apunta la configuración al campo equivocado,
    // esto es lo que lo delata en vez de guardar basura.
    const r = parseCompanyRoles(['INDIVIDUAL_CLIENT', 'SUPPLIER']);
    expect(r.roles).toEqual(['SUPPLIER']);
    expect(r.unknown).toEqual(['INDIVIDUAL_CLIENT']);
  });

  it('y al revés: COMMERCIAL_ACCOUNT no es un rol de persona', () => {
    expect(parsePersonRoles(['COMMERCIAL_ACCOUNT']).unknown).toEqual(['COMMERCIAL_ACCOUNT']);
  });
});
