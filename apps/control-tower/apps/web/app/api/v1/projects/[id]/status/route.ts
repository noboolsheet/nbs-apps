import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { changeProjectStatus } from '@ct/application';
import { updateProjectStatusSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { status } = updateProjectStatusSchema.parse(await readJson(req));
    const data = await changeProjectStatus(getDb(), org, id, status);
    return NextResponse.json({ data });
  });
}
