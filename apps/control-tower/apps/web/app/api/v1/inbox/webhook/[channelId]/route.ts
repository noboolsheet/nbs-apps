import { NextResponse } from 'next/server';
import { getDb } from '@ct/db';
import { captureViaChannel } from '@ct/application';
import { errorResponse, parseId } from '@/lib/api';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/** Extrae el token de `Authorization: Bearer <token>` o `X-Inbox-Token`. */
function readToken(req: Request): string {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return req.headers.get('x-inbox-token')?.trim() ?? '';
}

/**
 * Webhook de captura del Inbox (Fase 7). SIN sesión: se autentica con el token del canal. Lo usan
 * herramientas externas (n8n/email/extensión…). Rate-limit por canal.
 */
export async function POST(req: Request, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    // Se valida ANTES de tocar el rate limiter: la clave la elige quien llama y este endpoint no exige
    // sesión, así que un `channelId` libre permitía crear cubetas nuevas sin límite en el Map (F-27).
    // Con el UUID exigido, la cardinalidad queda acotada a los canales que existen de verdad.
    const { channelId } = await params;
    parseId(channelId, 'canal');
    const rl = rateLimit(`inbox:${channelId}`);
    if (!rl.ok) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', kind: 'TRANSIENT', message: 'demasiadas peticiones' } },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } },
      );
    }
    const token = readToken(req);
    const body = await req.json().catch(() => ({}));
    const row = await captureViaChannel(getDb(), channelId, token, body);
    return NextResponse.json({ data: { id: row.id, status: row.status } }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
