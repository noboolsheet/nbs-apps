import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { setInboxChannelStatus, deleteInboxChannel } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await setInboxChannelStatus(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    await deleteInboxChannel(getDb(), org, id);
    return NextResponse.json({ data: { ok: true } });
  });
}
