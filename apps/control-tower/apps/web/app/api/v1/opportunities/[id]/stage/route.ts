import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { changeOpportunityStage } from '@ct/application';
import { updateOpportunityStageSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { stage } = updateOpportunityStageSchema.parse(await readJson(req));
    const data = await changeOpportunityStage(getDb(), org, id, stage);
    return NextResponse.json({ data });
  });
}
