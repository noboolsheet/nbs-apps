import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listAutomations } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Lista el catálogo de automatizaciones con su estado efectivo por organización.
export function GET() {
  return withContext(async ({ org }) => {
    const data = await listAutomations(getDb(), org);
    return NextResponse.json({ data });
  });
}
