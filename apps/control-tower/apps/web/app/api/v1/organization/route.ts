import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getOrganization, updateOrganization } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await getOrganization(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function PATCH(req: Request) {
  return withContext(async ({ org }) => {
    const data = await updateOrganization(getDb(), org, await readJson(req));
    return NextResponse.json({ data });
  });
}
