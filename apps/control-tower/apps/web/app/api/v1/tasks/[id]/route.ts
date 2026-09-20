import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getTask, updateTask, getIdentityForInternal, getProjectStatus, getOpportunityFreeze } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';
import { sourceMeta } from '@/lib/source-meta';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const [data, identity] = await Promise.all([
      getTask(getDb(), org, id),
      getIdentityForInternal(getDb(), org, 'task', id),
    ]);
    // Congelado: si la tarea pertenece a un proyecto CERRADO, o a una oportunidad ARCHIVADA o CERRADA → solo lectura.
    const [projStatus, oppFreeze] = await Promise.all([
      data.projectId ? getProjectStatus(getDb(), org, data.projectId) : Promise.resolve(null),
      data.opportunityId ? getOpportunityFreeze(getDb(), org, data.opportunityId) : Promise.resolve(null),
    ]);
    const projClosed = projStatus === 'CLOSED';
    const readOnly = projClosed || !!oppFreeze?.archived || !!oppFreeze?.closed;
    const readOnlyReason = oppFreeze?.archived
      ? 'La oportunidad está archivada; la tarea es de solo lectura.'
      : oppFreeze?.closed
        ? 'La oportunidad está cerrada; la tarea es de solo lectura.'
        : projClosed
          ? 'El proyecto está cerrado; la tarea es de solo lectura.'
          : undefined;
    return NextResponse.json({ data, meta: { ...sourceMeta(identity), readOnly, readOnlyReason } });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateTask(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}
