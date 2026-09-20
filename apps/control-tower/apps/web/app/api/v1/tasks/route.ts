import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createTask } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Crea una tarea a nivel global (nativa de CT), con o sin proyecto asociado (projectId opcional en el body). */
export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const data = await createTask(getDb(), org, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
