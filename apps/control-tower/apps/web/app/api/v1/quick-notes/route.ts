import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createQuickNote, listQuickNotes } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Bloc de notas rápidas del Inicio (M44). GET: las del bloc. POST: `{ body }`. */
export function GET() {
  return withContext(async ({ org }) => NextResponse.json({ data: await listQuickNotes(getDb(), org) }));
}

export function POST(req: Request) {
  return withContext(async ({ org }) =>
    NextResponse.json({ data: await createQuickNote(getDb(), org, await readJson(req)) }),
  );
}
