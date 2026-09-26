import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getProjectDetail, listIdentitiesForRecord, updateProject } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';
import { mirrorMeta } from '@/lib/source-meta';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const [data, identities] = await Promise.all([
      getProjectDetail(getDb(), org, id),
      listIdentitiesForRecord(getDb(), org, 'project', id),
    ]);
    // `meta.mirrors` = dónde vive este mismo proyecto fuera de CT (su página de Notion). Lo pinta el panel como
    // enlace directo, encima del bloque «Contexto».
    return NextResponse.json({ data, meta: mirrorMeta(identities) });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateProject(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}
