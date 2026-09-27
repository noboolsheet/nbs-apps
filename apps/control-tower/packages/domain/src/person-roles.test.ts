import { describe, it, expect } from 'vitest';
import { crmTargetForPerson, isIndividualClient, parsePersonRoles } from './person-roles';

describe('roles de relación de una persona', () => {
  it('un array de códigos se reconoce tal cual', () => {
    const p = parsePersonRoles(['INDIVIDUAL_CLIENT', 'COLLABORATOR']);
    expect(p).toEqual({ roles: ['INDIVIDUAL_CLIENT', 'COLLABORATOR'], present: true, unknown: [] });
    expect(crmTargetForPerson(p)).toBe('client');
  });

  it('acepta las etiquetas como las escribe Twenty (espacios, minúsculas, guiones)', () => {
    for (const raw of [['Individual Client'], ['individual client'], ['individual-client'], 'INDIVIDUAL_CLIENT']) {
      expect(parsePersonRoles(raw).roles).toEqual(['INDIVIDUAL_CLIENT']);
    }
    expect(parsePersonRoles('COLLABORATOR, Individual Client').roles).toEqual([
      'INDIVIDUAL_CLIENT',
      'COLLABORATOR',
    ]);
  });

  it('sin el rol de cliente individual, la persona es un CONTACTO', () => {
    const p = parsePersonRoles(['PARTNER', 'SUPPLIER']);
    expect(isIndividualClient(p.roles)).toBe(false);
    expect(crmTargetForPerson(p)).toBe('contact');
  });

  it('distingue «el campo no viene» de «el campo viene vacío»', () => {
    // La diferencia manda: sin el campo NO se reclasifica a nadie (el nombre del campo en Twenty puede ser otro),
    // y eso tiene que ser visible en el sync en vez de tratarse como «nadie es cliente individual».
    expect(parsePersonRoles(undefined)).toEqual({ roles: [], present: false, unknown: [] });
    expect(parsePersonRoles(null).present).toBe(false);
    expect(parsePersonRoles([]).present).toBe(true);
    expect(parsePersonRoles({ value: ['INDIVIDUAL_CLIENT'] }).present).toBe(false); // forma no adivinada
  });

  it('una etiqueta nueva de Twenty se informa, no se descarta en silencio', () => {
    const p = parsePersonRoles(['INDIVIDUAL_CLIENT', 'Investor']);
    expect(p.roles).toEqual(['INDIVIDUAL_CLIENT']);
    expect(p.unknown).toEqual(['Investor']);
  });

  it('sin campo, el destino es contacto (mantener donde estaba es reversible; mover por suposición, no)', () => {
    expect(crmTargetForPerson(parsePersonRoles(undefined))).toBe('contact');
  });
});
