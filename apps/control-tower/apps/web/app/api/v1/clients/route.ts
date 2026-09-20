import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listClients, createClient } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await listClients(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createClient(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
