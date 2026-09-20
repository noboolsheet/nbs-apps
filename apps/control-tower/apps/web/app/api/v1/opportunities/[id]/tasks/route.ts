import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listOpportunityTasks, createTask } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await listOpportunityTasks(getDb(), org, id);
    return NextResponse.json({ data });
  });
}

// Creación contextual: fuerza opportunity_id = :id (tarea de preventa). El comando rechaza si la oportunidad está archivada.
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const body = (await readJson(req)) as Record<string, unknown>;
    const data = await createTask(getDb(), org, { ...body, opportunityId: id });
    return NextResponse.json({ data }, { status: 201 });
  });
}
