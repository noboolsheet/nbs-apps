import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updateCapabilityStatus } from '@ct/application';
import { updateCapabilityStatusSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { status } = updateCapabilityStatusSchema.parse(await readJson(req));
    const data = await updateCapabilityStatus(getDb(), org, id, status);
    return NextResponse.json({ data });
  });
}
