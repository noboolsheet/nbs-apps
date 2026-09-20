import { headers } from 'next/headers';
import { getDb } from '@ct/db';
import { getActiveOrgContext, requireOrgContext, ensureUserOrganization, type OrgContext } from '@ct/application';
import { auth } from './auth';

/** Sesión de Better Auth desde los headers de la request (server components / route handlers). */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export interface CurrentContext {
  user: { id: string; name: string; email: string; image?: string | null };
  org: OrgContext | null;
}

/** Usuario autenticado + su contexto de organización (o null si no hay sesión). */
export async function getCurrentContext(): Promise<CurrentContext | null> {
  const session = await getSession();
  if (!session?.user) return null;
  let org = await getActiveOrgContext(getDb(), session.user.id);
  // Auto-heal: usuarios sin organización (p. ej. creados antes del hook) → se provisiona una vez.
  if (!org) {
    try {
      await ensureUserOrganization(getDb(), session.user.id);
      org = await getActiveOrgContext(getDb(), session.user.id);
    } catch {
      /* si falla, se mostrará "sin organización" */
    }
  }
  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? null,
    },
    org,
  };
}

/** Igual pero exige sesión + membresía; lanza si falta alguna (para route handlers /api/v1). */
export async function requireCurrentContext(): Promise<{
  user: CurrentContext['user'];
  org: OrgContext;
}> {
  const session = await getSession();
  if (!session?.user) {
    throw Object.assign(new Error('No autenticado'), { status: 401 });
  }
  const org = await requireOrgContext(getDb(), session.user.id);
  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    org,
  };
}
