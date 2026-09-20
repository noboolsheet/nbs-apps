import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listOpportunities } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Owner 2026-09-02: **no hay POST**. Las oportunidades nacen en Twenty y llegan a CT por el pull; Control Tower es
 * sólo su máquina de estados (lo único que se escribe es `PATCH /opportunities/[id]/stage`). El comando
 * `createOpportunity` sigue existiendo para el sync, pero rechaza a los actores USER.
 */
export function GET() {
  return withContext(async ({ org }) => {
    const data = await listOpportunities(getDb(), org);
    return NextResponse.json({ data });
  });
}
