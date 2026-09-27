import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { fileQuickNote } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Le da a la nota su destino final: `{ destination: 'task' | 'decision' | 'knowledge_item' | 'review_item' }`.
 * Crea el registro con el texto de la nota y la retira del bloc. Devuelve a dónde fue, para poder enlazarlo.
 */
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    return NextResponse.json({ data: await fileQuickNote(getDb(), org, id, await readJson(req)) });
  });
}
