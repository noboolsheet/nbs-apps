import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getHomeDashboard } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Context API (doc 3 §12): base para el futuro agente. La UI usa la misma query server-side.
export function GET() {
  return withContext(async ({ org }) => NextResponse.json({ data: await getHomeDashboard(getDb(), org) }));
}
