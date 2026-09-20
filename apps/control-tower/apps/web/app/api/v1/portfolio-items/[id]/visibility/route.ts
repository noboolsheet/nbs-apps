import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { updatePortfolioItemVisibility } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updatePortfolioItemVisibility(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}
