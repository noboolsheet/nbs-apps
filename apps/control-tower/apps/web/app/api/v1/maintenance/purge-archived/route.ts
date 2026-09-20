import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getOrganization, purgeArchivedRecords } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Ejecuta AHORA la purga de archivados según la política de retención de la organización. */
export function POST() {
  return withContext(async ({ org }) => {
    const organization = await getOrganization(getDb(), org);
    const retentionDays = organization.settings.archivedRetentionDays ?? 0;
    const result = await purgeArchivedRecords(getDb(), org, { retentionDays });
    return NextResponse.json({ data: { retentionDays, ...result } });
  });
}
