import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getOrganization, purgeCompletedTasks } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Ejecuta AHORA la purga de tareas completadas según la política de retención de la organización. */
export function POST() {
  return withContext(async ({ org }) => {
    const organization = await getOrganization(getDb(), org);
    const retentionDays = organization.settings.completedTaskRetentionDays ?? 0;
    const result = await purgeCompletedTasks(getDb(), org, { retentionDays });
    return NextResponse.json({ data: { retentionDays, ...result } });
  });
}
