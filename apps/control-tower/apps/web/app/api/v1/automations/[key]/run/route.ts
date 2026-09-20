import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { runAutomationNow } from '@ct/application';
import { withContext } from '@/lib/api';

export const dynamic = 'force-dynamic';

// «Ejecutar ahora»: sync.* encola su job; sweep.* corre el barrido inline. Resto → 400 (no ejecutable).
export function POST(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  return withContext(async ({ org }) => {
    const { key } = await params;
    const data = await runAutomationNow(getDb(), org, key);
    return NextResponse.json({ data }, { status: 202 });
  });
}
