import { COMPANY_RELATIONSHIP_ROLE, type CompanyRelationshipRole } from './enums';
import { parseRelationshipRoles, type ParsedRoles } from './relationship-roles';

/**
 * **Roles de relación de una Company de Twenty** (cuenta comercial, proveedor, colaborador, prescriptor…).
 *
 * Owner 2026-10-03: en la lista de Clientes de CT conviven cosas que no son todas clientes —una empresa puede estar
 * en el CRM por ser proveedora o colaboradora— y de un cliente sólo interesa traer **lo que lo identifica y lo
 * diferencia**; el rol es justo eso, y por eso se trae (ver E-19 y ADR-010). Las decisiones y las tareas sobre esa
 * empresa se siguen tomando en Twenty.
 *
 * El vocabulario es el de empresas, no el de personas: `INDIVIDUAL_CLIENT` aquí sería un valor desconocido.
 */
export type ParsedCompanyRoles = ParsedRoles<CompanyRelationshipRole>;

export function parseCompanyRoles(raw: unknown): ParsedCompanyRoles {
  return parseRelationshipRoles(raw, COMPANY_RELATIONSHIP_ROLE);
}
