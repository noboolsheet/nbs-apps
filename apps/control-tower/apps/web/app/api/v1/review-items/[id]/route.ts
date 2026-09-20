import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getReviewItem, updateReviewItem } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await getReviewItem(getDb(), org, id);
    // Revisado = congelado (regla `isReviewItemFrozen`): el panel lo pinta de solo lectura, para que el
    // usuario vea POR QUÉ no puede editar en vez de que el autoguardado falle campo a campo.
    const readOnly = data.status === 'REVIEWED';
    return NextResponse.json({
      data,
      meta: {
        readOnly,
        readOnlyReason: readOnly
          ? data.knowledgeItemId
            ? 'Ya revisado y guardado en la biblioteca. Es de solo lectura.'
            : 'Ya revisado: es de solo lectura. Pulsa «Procesar» para pasarlo a la biblioteca.'
          : undefined,
      },
    });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateReviewItem(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}
