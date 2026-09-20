import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listSectors } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => NextResponse.json({ data: await listSectors(getDb(), org) }));
}
