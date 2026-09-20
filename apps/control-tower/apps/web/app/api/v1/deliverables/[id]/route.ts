import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getDeliverable, updateDeliverable } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await getDeliverable(getDb(), org, id);
    return NextResponse.json({ data });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateDeliverable(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}
