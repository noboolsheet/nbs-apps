import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { listOutboxForExport, outboxToCsv } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Descarga del log ACTIVO de la bandeja de salida en CSV (los lotes rotados se bajan desde su lista). */
export function GET() {
  return withContext(async ({ org }) => {
    const rows = await listOutboxForExport(getDb(), org);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(outboxToCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="control-tower-envios-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
