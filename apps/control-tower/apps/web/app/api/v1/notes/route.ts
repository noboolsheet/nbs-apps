import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createNote, listNotes } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * E-15 — notas de un registro: `/api/v1/notes?entity=<tipo>&id=<uuid>`. Lo consume el bloque «Notas» del panel
 * lateral, que las carga al desplegarlo (igual que el historial, para no encarecer el GET del registro).
 */
export function GET(req: Request) {
  return withContext(async ({ org }) => {
    const url = new URL(req.url);
    const entity = url.searchParams.get('entity');
    const id = url.searchParams.get('id');
    if (!entity || !id) return NextResponse.json({ error: { message: 'Faltan entity/id' } }, { status: 400 });
    parseId(id, 'nota');
    const data = await listNotes(getDb(), org, entity, id);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createNote(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
