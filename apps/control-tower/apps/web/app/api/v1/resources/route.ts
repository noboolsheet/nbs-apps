import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createResource } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createResource(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
