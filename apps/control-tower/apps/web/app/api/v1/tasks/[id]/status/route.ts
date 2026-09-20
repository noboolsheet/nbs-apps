import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updateTaskStatus } from '@ct/application';
import { updateTaskStatusSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { status } = updateTaskStatusSchema.parse(await readJson(req));
    const data = await updateTaskStatus(getDb(), org, id, status);
    return NextResponse.json({ data });
  });
}
