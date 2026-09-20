import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { getAutomation, setAutomationStatus } from '@ct/application';
import { updateAutomationSchema } from '@ct/validation';
import { withContext, readJson } from '@/lib/api';

export const dynamic = 'force-dynamic';

// Detalle de una automatización (catálogo + estado efectivo + última ejecución) para el panel lateral.
export function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  return withContext(async ({ org }) => {
    const { key } = await params;
    const data = await getAutomation(getDb(), org, key);
    return NextResponse.json({ data });
  });
}

// Activa/pausa la automatización. Sólo OWNER (manage_org). Núcleo → 400.
export function PATCH(req: Request, { params }: { params: Promise<{ key: string }> }) {
  return withContext(async ({ org }) => {
    const { key } = await params;
    const { status } = updateAutomationSchema.parse(await readJson(req));
    const data = await setAutomationStatus(getDb(), org, key, status);
    return NextResponse.json({ data });
  });
}
