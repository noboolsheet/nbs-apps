import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createReviewItem, listReviewItems } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await listReviewItems(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createReviewItem(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
