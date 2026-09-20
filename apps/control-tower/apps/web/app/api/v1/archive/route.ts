import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { archiveRecords } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Archivado en lote (soft-delete). Body: { entityType, ids: string[] }. Requiere rol delete (ADMIN+). */
export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const archived = await archiveRecords(getDb(), org, await readJson(req));
    return NextResponse.json({ data: { archived } });
  });
}
