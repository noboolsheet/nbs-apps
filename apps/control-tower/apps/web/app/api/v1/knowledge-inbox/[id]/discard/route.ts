import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { discardInboxItem } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await discardInboxItem(getDb(), org, id);
    return NextResponse.json({ data });
  });
}
