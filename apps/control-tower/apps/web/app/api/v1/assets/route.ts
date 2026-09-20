import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listAssets, createAsset } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => NextResponse.json({ data: await listAssets(getDb(), org) }));
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createAsset(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
