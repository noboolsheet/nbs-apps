/**
 * **Roles de relación** (multi-select de Twenty), la parte común a personas y empresas.
 *
 * Twenty marca en cada registro con qué tipo de relación comercial existe. La lectura es la misma para las dos
 * familias —normalizar etiquetas, quedarse con los códigos conocidos, informar de los que no— pero los conjuntos de
 * códigos son DISTINTOS (`PERSON_RELATIONSHIP_ROLE` vs `COMPANY_RELATIONSHIP_ROLE`), así que lo que se comparte es
 * el lector, no el vocabulario: un `INDIVIDUAL_CLIENT` en una empresa sería un valor desconocido, y así se dice.
 *
 * Pura y defensiva: el valor llega de un campo de Twenty cuya forma no controlamos (array, cadena con comas,
 * etiquetas con espacios o en minúsculas).
 */
export interface ParsedRoles<T extends string> {
  /** Roles reconocidos, sin repetidos y en el orden del enum del dominio. */
  roles: T[];
  /**
   * ¿VENÍA el campo en el registro? Distinto de «venía vacío». Si el campo no existe —porque en ese Twenty se
   * llama de otra forma— quien lo use **no debe decidir nada** con un array vacío: hay que avisar, en vez de dar
   * por hecho que el registro no tiene roles (el handoff prohíbe inferir identificadores de API en silencio).
   */
  present: boolean;
  /** Valores que venían pero no son roles conocidos. Se informan: suelen ser una etiqueta nueva en Twenty. */
  unknown: string[];
}

/** Normaliza una etiqueta de Twenty («Individual Client», «individual_client») al código del enum. */
function normalize(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

/** Lee un multi-select de roles contra el vocabulario `known` que se le pase. */
export function parseRelationshipRoles<T extends string>(raw: unknown, known: readonly T[]): ParsedRoles<T> {
  if (raw === undefined || raw === null) return { roles: [], present: false, unknown: [] };

  // Twenty devuelve un multi-select como array; algunos despliegues lo exponen como cadena separada por comas.
  const values = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : // Un objeto (p. ej. `{ value: [...] }`) no se adivina: se declara ausente y que se vea en el aviso.
        null;
  if (values === null) return { roles: [], present: false, unknown: [] };

  const knownSet = new Set<string>(known);
  const found = new Set<T>();
  const unknown: string[] = [];
  for (const v of values) {
    if (typeof v !== 'string' || v.trim() === '') continue;
    const code = normalize(v);
    if (knownSet.has(code)) found.add(code as T);
    else unknown.push(v.trim());
  }
  return { roles: known.filter((r) => found.has(r)), present: true, unknown };
}
