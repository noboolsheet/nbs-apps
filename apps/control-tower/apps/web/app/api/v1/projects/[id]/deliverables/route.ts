import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createDeliverable } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await createDeliverable(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
