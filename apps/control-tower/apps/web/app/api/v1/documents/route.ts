import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listDocuments, createDocument } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return withContext(async ({ org }) => {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId') ?? undefined;
    const clientId = url.searchParams.get('clientId') ?? undefined;
    const data = await listDocuments(getDb(), org, { projectId, clientId });
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createDocument(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
