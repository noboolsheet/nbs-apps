import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getOpportunity, getIdentityForInternal } from '@ct/application';
import { withContext, parseId } from '@/lib/api';
import { sourceMeta } from '@/lib/source-meta';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const [data, identity] = await Promise.all([
      getOpportunity(getDb(), org, id),
      getIdentityForInternal(getDb(), org, 'opportunity', id),
    ]);
    // `meta.readOnly` congela el registro ENTERO (incluida la etapa) y eso sólo pasa si está archivada. Que el resto
    // de campos no se editen en CT —la oportunidad se edita en Twenty— se expresa campo a campo en el registro del
    // panel (`ownedBy`/`readOnly`), no aquí: si no, la etapa, que es lo único que CT sí mueve, se bloquearía también.
    const readOnly = !!data.archivedAt;
    return NextResponse.json({
      data,
      meta: {
        ...sourceMeta(identity),
        readOnly,
        readOnlyReason: readOnly ? 'La oportunidad está archivada; es de solo lectura. Restáurala para volver a trabajarla.' : undefined,
      },
    });
  });
}
