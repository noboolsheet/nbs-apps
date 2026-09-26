import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { reorderRecords } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * E-12 — guarda el orden manual de una lista: `POST /api/v1/reorder` con `{ entityType, ids }`, la lista completa
 * en su orden nuevo. Un único endpoint para las seis listas reordenables (la allowlist es `REORDERABLE`, en la capa
 * de aplicación), en vez de un endpoint por entidad.
 */
export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await reorderRecords(getDb(), org, await readJson(req));
    return NextResponse.json({ data });
  });
}
