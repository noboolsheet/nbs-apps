import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { globalSearch } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(req: Request) {
  return withContext(async ({ org }) => {
    const q = new URL(req.url).searchParams.get('q') ?? '';
    const data = await globalSearch(getDb(), org, q);
    return NextResponse.json({ data });
  });
}
