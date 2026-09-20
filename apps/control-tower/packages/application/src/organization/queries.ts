import { eq } from 'drizzle-orm';
import type { Database } from '@ct/db';
import { organizations } from '@ct/db/schema';
import type { OrganizationSettings } from '@ct/validation';
import { type OrgContext } from '../auth/index';
import { notFound } from '../errors';

/** Organización activa del contexto, con sus `settings` tipados. */
export async function getOrganization(db: Database, ctx: OrgContext) {
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ctx.organizationId));
  if (!row) throw notFound('organization');
  return { ...row, settings: (row.settings as OrganizationSettings | null) ?? {} };
}
