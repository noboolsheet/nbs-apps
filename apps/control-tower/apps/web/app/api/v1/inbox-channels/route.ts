import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listInboxChannels, createInboxChannel } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await listInboxChannels(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    // Devuelve el token EN CLARO una sola vez (no se vuelve a mostrar).
    const data = await createInboxChannel(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
