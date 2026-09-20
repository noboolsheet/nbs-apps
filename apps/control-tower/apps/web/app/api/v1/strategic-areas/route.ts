import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listStrategicAreas, createStrategicArea } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await listStrategicAreas(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createStrategicArea(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
