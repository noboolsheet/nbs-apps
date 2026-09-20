import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listJobsForExport, jobsToCsv } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * Descarga del log ACTIVO de procesos en CSV (Estado del sistema › Procesos recientes › «Descargar CSV»).
 * La pantalla sólo enseña los últimos 20; esto baja todo lo que hay ahora mismo en `jobs`. Los lotes ya rotados
 * (F-24) se descargan uno a uno desde la lista de archivos anteriores.
 */
export function GET() {
  return withContext(async ({ org }) => {
    const rows = await listJobsForExport(getDb(), org);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(jobsToCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="control-tower-procesos-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
