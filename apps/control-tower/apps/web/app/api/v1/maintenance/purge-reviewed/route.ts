import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getOrganization, purgeReviewedItems } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Ejecuta AHORA la purga de la cola «Por revisar» (revisados/descartados) según la política de retención. */
export function POST() {
  return withContext(async ({ org }) => {
    const organization = await getOrganization(getDb(), org);
    const retentionDays = organization.settings.reviewRetentionDays ?? 0;
    const result = await purgeReviewedItems(getDb(), org, { retentionDays });
    return NextResponse.json({ data: { retentionDays, ...result } });
  });
}
