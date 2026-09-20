import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listProjectTasks, createTask } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await listProjectTasks(getDb(), org, id);
    return NextResponse.json({ data });
  });
}

// Creación contextual: fuerza project_id = :id (doc old_9 §15).
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const body = (await readJson(req)) as Record<string, unknown>;
    const data = await createTask(getDb(), org, { ...body, projectId: id });
    return NextResponse.json({ data }, { status: 201 });
  });
}
