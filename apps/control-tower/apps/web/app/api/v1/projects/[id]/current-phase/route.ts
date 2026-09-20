import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { setCurrentPhase } from '@ct/application';
import { setCurrentPhaseSchema } from '@ct/validation';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Fija (o limpia con phaseId=null) la fase actual del proyecto. Body: { phaseId: string | null }. */
export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { phaseId } = setCurrentPhaseSchema.parse(await readJson(req));
    const data = await setCurrentPhase(getDb(), org, id, phaseId);
    return NextResponse.json({ data });
  });
}
