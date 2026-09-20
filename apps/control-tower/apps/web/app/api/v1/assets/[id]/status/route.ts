import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updateAssetStatus } from '@ct/application';
import { updateAssetStatusSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { status } = updateAssetStatusSchema.parse(await readJson(req));
    const data = await updateAssetStatus(getDb(), org, id, status);
    return NextResponse.json({ data });
  });
}
