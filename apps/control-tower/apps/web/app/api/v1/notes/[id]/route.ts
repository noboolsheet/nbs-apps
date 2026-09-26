import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { deleteNote, updateNote } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** E-15 — editar o borrar UNA nota. Sólo su autor (o un ADMIN+): la regla vive en la capa de aplicación. */
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id, 'nota');
    const data = await updateNote(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id, 'nota');
    const data = await deleteNote(getDb(), org, id);
    return NextResponse.json({ data });
  });
}
