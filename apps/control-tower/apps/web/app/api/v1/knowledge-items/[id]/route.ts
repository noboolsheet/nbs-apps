import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getKnowledgeItem, updateKnowledgeItem, getIdentityForInternal } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';
import { sourceMeta } from '@/lib/source-meta';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const [data, identity] = await Promise.all([
      getKnowledgeItem(getDb(), org, id),
      getIdentityForInternal(getDb(), org, 'knowledge_item', id),
    ]);
    // `meta.source` → el panel ofrece «Abrir en Notion» (el cuerpo del ítem vive allí).
    return NextResponse.json({ data, meta: sourceMeta(identity) });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateKnowledgeItem(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}
