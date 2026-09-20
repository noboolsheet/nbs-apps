import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { promoteReviewItemToKnowledge } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Pasa un recurso ya revisado a la biblioteca de conocimiento, como elemento APROBADO. */
export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await promoteReviewItemToKnowledge(getDb(), org, id);
    return NextResponse.json({ data }, { status: 201 });
  });
}
