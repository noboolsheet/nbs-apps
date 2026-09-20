import { and, eq, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { AppError } from '@ct/shared';
import type { OrgContext } from './context';

/**
 * Helpers de scoping por organización (doc 5 §38). Toda query de negocio debe filtrar por
 * `organization_id`; estas utilidades hacen ese filtro explícito y difícil de olvidar.
 */

/** Condición `organization_id = ctx.organizationId`, combinable con otras vía `and`. */
export function orgEq(organizationColumn: AnyPgColumn, ctx: OrgContext): SQL {
  return eq(organizationColumn, ctx.organizationId);
}

/** Combina el filtro de organización con condiciones adicionales. */
export function scopedWhere(
  organizationColumn: AnyPgColumn,
  ctx: OrgContext,
  ...extra: Array<SQL | undefined>
): SQL | undefined {
  return and(orgEq(organizationColumn, ctx), ...extra);
}

/** Lanza AUTHORIZATION si una entidad cargada pertenece a otra organización. */
export function assertSameOrg(ctx: OrgContext, entityOrganizationId: string | null | undefined): void {
  if (entityOrganizationId !== ctx.organizationId) {
    throw new AppError({
      code: 'CROSS_ORG_ACCESS',
      kind: 'AUTHORIZATION',
      message: 'El recurso pertenece a otra organización',
    });
  }
}
