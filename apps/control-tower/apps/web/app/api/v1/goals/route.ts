import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listGoals, createGoal } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET() {
  return withContext(async ({ org }) => {
    const data = await listGoals(getDb(), org);
    return NextResponse.json({ data });
  });
}

export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createGoal(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
