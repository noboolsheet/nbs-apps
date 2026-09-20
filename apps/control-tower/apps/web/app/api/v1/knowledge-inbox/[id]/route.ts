import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getInboxItem, updateInboxItem, deleteInboxItem } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await getInboxItem(getDb(), org, id);
    // Procesada/descartada = congelada: el panel la muestra de solo lectura (ya vive en la biblioteca).
    const readOnly = data.status === 'PROCESSED' || data.status === 'DISCARDED';
    return NextResponse.json({
      data,
      meta: {
        readOnly,
        readOnlyReason: readOnly
          ? 'La captura ya está resuelta; vive en la biblioteca. Es de solo lectura.'
          : undefined,
      },
    });
  });
}

export function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await updateInboxItem(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data });
  });
}

export function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await deleteInboxItem(getDb(), org, id);
    return NextResponse.json({ data });
  });
}
