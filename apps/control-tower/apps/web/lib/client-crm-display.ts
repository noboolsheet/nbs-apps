/**
 * **Qué enseñar en las columnas «Tipo de organización» y «Relación» de un cliente**, según de dónde viene.
 *
 * La lista de Clientes mezcla dos cosas que en Twenty son objetos distintos: **companies** y **people marcadas como
 * cliente individual** (ADR-010). Las columnas salen de columnas de `clients` que sólo rellena el pull de companies,
 * así que un cliente-persona las dejaba vacías y parecía un registro a medias.
 *
 * Owner 2026-10-04: un cliente que es una persona enseña **«Cliente individual»** —la etiqueta que le corresponde en
 * Twenty, que es justo la que lo trajo a esta lista— y **«Cuenta comercial»**, como el resto de las empresas que son
 * sus clientes.
 *
 * **Se DERIVA, no se guarda**, por lo mismo que «Empresa/Particular» (ADR-010): meterlo en la tabla sería un tercer
 * valor que CT se inventa, que Twenty no conoce y que podría quedarse viejo. Aquí sale del origen del registro, que es
 * un hecho comprobable (`external_identities.external_type`).
 *
 * Devuelve **códigos**, no texto: quien pinta traduce con `enumLabel`. `INDIVIDUAL_CLIENT` no es un código de
 * `ORGANIZATION_TYPE` a propósito — es el rol de la Person, del otro vocabulario, y es exactamente lo que identifica
 * esa fila.
 */
export interface ClientCrmOrigin {
  /** `external_type` de la identidad del cliente: `'company'`, `'person'` o nada (cliente nativo de CT). */
  externalType?: string | null;
  /** Lo guardado en `clients.industry` (el Organization Type de Twenty). */
  industry?: string | null;
  /** Lo guardado en `clients.relationship_roles` (los roles de la Company en Twenty, M46). */
  relationshipRoles?: string[] | null;
}

export interface ClientCrmDisplay {
  /** Código para la columna «Tipo de organización», o `null` si no hay nada que enseñar. */
  organizationType: string | null;
  /** Códigos para la columna «Relación» (vacío = nada que enseñar). */
  relationshipRoles: string[];
}

/** Un cliente-persona es cliente por serlo: en Twenty eso es una cuenta comercial. */
const INDIVIDUAL_ORGANIZATION_TYPE = 'INDIVIDUAL_CLIENT';
const INDIVIDUAL_RELATIONSHIP_ROLES = ['COMMERCIAL_ACCOUNT'];

export function clientCrmDisplay(origin: ClientCrmOrigin): ClientCrmDisplay {
  if (origin.externalType === 'person') {
    return { organizationType: INDIVIDUAL_ORGANIZATION_TYPE, relationshipRoles: INDIVIDUAL_RELATIONSHIP_ROLES };
  }
  return {
    organizationType: origin.industry?.trim() ? origin.industry : null,
    relationshipRoles: origin.relationshipRoles ?? [],
  };
}
