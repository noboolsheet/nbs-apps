import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness check (doc 3 §29 / doc 4 §36). No toca la base de datos. */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'control-tower-web',
    time: new Date().toISOString(),
  });
}
