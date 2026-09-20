import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { unlinkProjectAsset } from '@ct/application';
import { withContext, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Quita el enlace proyecto↔activo (A-3 / ADR-007). NO borra el activo del catálogo. */
export function DELETE(_req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  return withContext(async ({ org }) => {
    const { id, assetId } = await params;
    parseId(id, 'proyecto');
    parseId(assetId, 'reutilizable');
    const data = await unlinkProjectAsset(getDb(), org, id, assetId);
    return NextResponse.json({ data });
  });
}
