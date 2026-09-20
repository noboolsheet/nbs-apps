import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getProjectPhase, updateProjectPhase, deleteProjectPhase } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET/PATCH/DELETE de una fase de proyecto (para el panel lateral: editar y borrar). */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await getProjectPhase(getDb(), org, id);
    return NextResponse.json({ data });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateProjectPhase(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await deleteProjectPhase(getDb(), org, id);
    return NextResponse.json({ data });
  });
}
