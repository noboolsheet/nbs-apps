import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updateServiceStatus } from '@ct/application';
import { updateServiceStatusSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { status } = updateServiceStatusSchema.parse(await readJson(req));
    const data = await updateServiceStatus(getDb(), org, id, status);
    return NextResponse.json({ data });
  });
}
