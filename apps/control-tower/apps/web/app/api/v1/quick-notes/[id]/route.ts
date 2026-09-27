import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { deleteQuickNote, updateQuickNote } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH: reescribe el texto de la nota. DELETE: la descarta (borrado; queda en auditoría con su texto). */
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    return NextResponse.json({ data: await updateQuickNote(getDb(), org, id, await readJson(req)) });
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    await deleteQuickNote(getDb(), org, id);
    return NextResponse.json({ data: { discarded: true } });
  });
}
