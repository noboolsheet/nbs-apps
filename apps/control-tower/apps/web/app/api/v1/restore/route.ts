import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { restoreRecords } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Restaurar en lote lo archivado. Body: { entityType, ids: string[] }. Requiere rol delete (ADMIN+). */
export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const restored = await restoreRecords(getDb(), org, await readJson(req));
    return NextResponse.json({ data: { restored } });
  });
}
