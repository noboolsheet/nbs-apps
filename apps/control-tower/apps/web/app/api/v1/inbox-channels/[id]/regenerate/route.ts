import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { regenerateInboxChannelToken } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Regenera el token del canal (desconecta el anterior). Devuelve el nuevo token una sola vez. */
export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await regenerateInboxChannelToken(getDb(), org, id);
    return NextResponse.json({ data });
  });
}
