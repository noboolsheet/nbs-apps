import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getJobStatus } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Estado de un job encolado. Lo consulta la UI tras un «Sincronizar ahora» para seguirlo hasta que termina: el POST
 * de sync sólo **encola**, y el trabajo lo hace el worker en su tick, así que sin esto la pantalla se quedaba con
 * el «encolada» puesto sin decir nunca si acabó bien o con error.
 */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id, 'proceso');
    const data = await getJobStatus(getDb(), org, id);
    if (!data) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', kind: 'NOT_FOUND', message: 'proceso no encontrado' } },
        { status: 404 },
      );
    }
    return NextResponse.json({ data });
  });
}
