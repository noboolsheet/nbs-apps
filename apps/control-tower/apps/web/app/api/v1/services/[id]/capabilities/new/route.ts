import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { createServiceCapability } from '@ct/application';
import { withContext, readJson, parseId } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Crea una capacidad NUEVA y la vincula al servicio (un paso). Devuelve la capacidad creada. */
export function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withContext(async ({ org }) => {
    const { id } = await params;
    parseId(id);
    const data = await createServiceCapability(getDb(), org, id, await readJson(req));
    return NextResponse.json({ data }, { status: 201 });
  });
}
