import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { purgeArchivedByIds } from '@ct/application';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Borrado DEFINITIVO en lote de lo que ya está ARCHIVADO. Body: `{ entityType, ids: string[] }`. Requiere rol
 * delete (ADMIN+). No es reversible: queda el rastro en `audit_logs` y nada más.
 *
 * Distinto de `/api/v1/delete`, que borra **tareas** estén archivadas o no (allí el archivado no es el circuito).
 * Aquí la fila tiene que estar archivada: es la salida de «Ajustes › Archivados», no un atajo para borrar cosas
 * vivas desde cualquier lista.
 */
export function POST(req: Request) {
  return withContext(async ({ org }) => {
    const result = await purgeArchivedByIds(getDb(), org, await readJson(req));
    return NextResponse.json({ data: result });
  });
}
