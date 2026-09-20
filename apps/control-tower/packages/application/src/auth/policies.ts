import { AppError } from '@ct/shared';

/**
 * Autorización por rol (doc 5 §7; doc 3 §26.2). Jerarquía simple basada en rango.
 * MVP: sin permisos por objeto; sólo el rol dentro de la organización.
 */
export const ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

export type Action = 'read' | 'write' | 'delete' | 'manage_org';

const ROLE_RANK: Record<Role, number> = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };
const ACTION_MIN_RANK: Record<Action, number> = {
  read: 1, // VIEWER+
  write: 2, // MEMBER+
  delete: 3, // ADMIN+
  manage_org: 4, // OWNER
};

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** ¿Puede `role` ejecutar `action`? */
export function can(role: Role, action: Action): boolean {
  return ROLE_RANK[role] >= ACTION_MIN_RANK[action];
}

/** Lanza AUTHORIZATION si el rol no permite la acción. */
export function requireCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new AppError({
      code: 'FORBIDDEN',
      kind: 'AUTHORIZATION',
      message: `El rol ${role} no permite la acción ${action}`,
    });
  }
}
