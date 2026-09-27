import { PERSON_RELATIONSHIP_ROLE, type PersonRelationshipRole } from './enums';
import { INDIVIDUAL_CLIENT_ROLE } from './crm-classification';

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
export interface ParsedPersonRoles {
  /** Roles reconocidos, sin repetidos y en el orden del enum del dominio. */
  roles: PersonRelationshipRole[];
  /**
   * ¿VENÍA el campo en el registro? Distinto de «venía vacío». Si el campo no existe —porque en ese Twenty se
   * llama de otra forma— **no se reclasifica a nadie** y se avisa, en vez de dar por hecho que nadie es cliente
   * individual (el handoff prohíbe inferir identificadores de API en silencio).
   */
  present: boolean;
  /** Valores que venían pero no son roles conocidos. Se informan: suelen ser una etiqueta nueva en Twenty. */
  unknown: string[];
}

const KNOWN = new Set<string>(PERSON_RELATIONSHIP_ROLE);

/** Normaliza una etiqueta de Twenty («Individual Client», «individual_client») al código del enum. */
function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export function parsePersonRoles(raw: unknown): ParsedPersonRoles {
  if (raw === undefined || raw === null) return { roles: [], present: false, unknown: [] };

  // Twenty devuelve un multi-select como array; algunos despliegues lo exponen como cadena separada por comas.
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : // Un objeto (p. ej. `{ value: [...] }`) no se adivina: se declara ausente y que se vea en el aviso.
        null;
  if (values === null) return { roles: [], present: false, unknown: [] };

  const roles = new Set<PersonRelationshipRole>();
  const unknown: string[] = [];
  for (const v of values) {
    if (typeof v !== 'string' || v.trim() === '') continue;
    const code = normalize(v);
    if (KNOWN.has(code)) roles.add(code as PersonRelationshipRole);
    else unknown.push(v.trim());
  }
  return {
    roles: PERSON_RELATIONSHIP_ROLE.filter((r) => roles.has(r)),
    present: true,
    unknown,
  };
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
