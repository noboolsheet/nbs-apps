import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createAsset, linkProjectAsset, listProjectAssets } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Activos reutilizables enlazados a este proyecto (A-3 / ADR-007). */
export function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await listProjectAssets(getDb(), org, id);
    return NextResponse.json({ data });
  });
}

/**
 * Dos usos en un solo endpoint:
 *  - `{ assetId }` → **enlaza** un activo ya existente del catálogo (idempotente).
 *  - cuerpo de activo (`{ name, assetType, … }`) → lo **crea y lo enlaza** (creación contextual desde el panel).
 */
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const body = (await readJson(req)) as Record<string, unknown>;
    const assetId =
      typeof body.assetId === 'string' && body.assetId
        ? body.assetId
        : (await createAsset(getDb(), org, body)).id;
    await linkProjectAsset(getDb(), org, id, assetId);
    return NextResponse.json({ data: { id: assetId } }, { status: 201 });
  });
}
