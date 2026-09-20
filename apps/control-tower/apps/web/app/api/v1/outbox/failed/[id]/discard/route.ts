import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { discardFailedOutbox } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Descarta un envío fallido: se da por cerrado sin reintentarlo (queda registrado, deja de avisar y de bloquear). */
export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const ok = await discardFailedOutbox(getDb(), org.organizationId, id);
    if (!ok) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', kind: 'NOT_FOUND', message: 'Envío no encontrado o ya resuelto' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: { id } });
  });
}
