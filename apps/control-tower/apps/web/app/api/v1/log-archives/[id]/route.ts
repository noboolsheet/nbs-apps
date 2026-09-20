import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getLogArchiveCsv } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Descarga de un LOTE ya rotado (procesos o bandeja de salida, F-24), descomprimido al vuelo. */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const { kind, seq, csv } = await getLogArchiveCsv(getDb(), org, id);
    const label = kind === 'OUTBOX' ? 'envios' : 'procesos';
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="control-tower-${label}-lote-${String(seq).padStart(3, '0')}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  });
}
