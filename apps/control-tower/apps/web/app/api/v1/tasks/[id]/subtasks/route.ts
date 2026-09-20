import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getTask, createTask } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Crea una subtarea (hija) de una tarea. Hereda el proyecto O la oportunidad del padre. 100% CT (no va a Twenty). */
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const parent = await getTask(getDb(), org, id); // valida que el padre existe y es de la org
    const body = (await readJson(req)) as Record<string, unknown>;
    const data = await createTask(getDb(), org, {
      ...body,
      parentTaskId: parent.id,
      projectId: parent.projectId ?? undefined,
      opportunityId: parent.opportunityId ?? undefined,
    });
    return NextResponse.json({ data }, { status: 201 });
  });
}
