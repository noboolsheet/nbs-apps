import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listEntityChanges } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * F-4 — historial de cambios de una entidad: `/api/v1/history?entity=<tipo>&id=<uuid>`.
 * Lo consume el bloque "Historial" del panel lateral (bajo demanda, no en el GET del registro).
 */
export function GET(req: Request) {
  return withContext(async ({ org }) => {
    const url = new URL(req.url);
    const entity = url.searchParams.get('entity');
    const id = url.searchParams.get('id');
    if (!entity || !id) return NextResponse.json({ error: { message: 'Faltan entity/id' } }, { status: 400 });
    const data = await listEntityChanges(getDb(), org, entity, id);
    return NextResponse.json({ data });
  });
}
