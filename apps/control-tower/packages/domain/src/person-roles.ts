import { PERSON_RELATIONSHIP_ROLE, type PersonRelationshipRole } from './enums';
import { INDIVIDUAL_CLIENT_ROLE } from './crm-classification';
import { parseRelationshipRoles, type ParsedRoles } from './relationship-roles';

/**
 * **Roles de relación de una Person de Twenty** y a qué se parece esa persona en Control Tower.
 *
 * Twenty marca en cada persona con qué tipo de relación comercial existe (multi-select `Relationship Roles`). La
 * regla que pidió el owner (2026-09-27): **una persona con `INDIVIDUAL_CLIENT` es un CLIENTE**, no un contacto —
 * es a quien se factura y para quien se trabaja, aunque no haya empresa detrás. El resto de roles (contacto de una
 * empresa, colaborador, proveedor, prescriptor) siguen siendo contactos.
 *
 * Es coherente con `classifyBillingSubject` (§2.2 del handoff), que ya usa ese mismo rol para decidir que el sujeto
 * de facturación es la persona: aquí se aplica a la clasificación del registro, allí a la facturación.
 *
 * Pura y defensiva: el valor llega de un campo de Twenty cuya forma no controlamos (array, cadena con comas,
 * etiquetas con espacios o en minúsculas).
 */
export type ParsedPersonRoles = ParsedRoles<PersonRelationshipRole>;

export function parsePersonRoles(raw: unknown): ParsedPersonRoles {
  return parseRelationshipRoles(raw, PERSON_RELATIONSHIP_ROLE);
}

/** ¿Esta persona es un cliente por sí misma? */
export function isIndividualClient(roles: readonly string[]): boolean {
  return roles.includes(INDIVIDUAL_CLIENT_ROLE);
}

/**
 * Qué entidad de Control Tower representa a esta persona: `client` si es cliente individual, `contact` en el resto
 * de casos **y también cuando el campo de roles no viene** (sin dato no se reclasifica: mantener a alguien donde
 * estaba es reversible; moverlo por una suposición, no).
 */
export function crmTargetForPerson(parsed: ParsedPersonRoles): 'client' | 'contact' {
  if (!parsed.present) return 'contact';
  return isIndividualClient(parsed.roles) ? 'client' : 'contact';
}
