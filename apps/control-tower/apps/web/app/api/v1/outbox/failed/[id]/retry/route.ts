import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { retryFailedOutbox } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Reencola un envío fallido del outbox (write-back a Twenty / push a Notion) para volver a intentarlo. */
export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const ok = await retryFailedOutbox(getDb(), org.organizationId, id);
    if (!ok) return NextResponse.json({ error: { code: 'NOT_FOUND', kind: 'NOT_FOUND', message: 'Envío no encontrado o ya reintentado' } }, { status: 404 });
    return NextResponse.json({ data: { id } });
  });
}
