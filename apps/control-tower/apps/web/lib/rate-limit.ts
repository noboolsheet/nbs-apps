/**
 * Rate limiter en memoria (ventana fija). Suficiente para el MVP self-hosted single-instance
 * (doc old_9 §26). En multi-instancia se movería a Redis/Postgres, pero eso es Fase 2.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Cada cuántas llamadas se barren las cubetas caducadas. Amortizado a propósito, en vez de un `setInterval`:
 * no deja un temporizador vivo, funciona igual si el proceso se reinicia y no depende de que alguien se
 * acuerde de arrancarlo — que es exactamente lo que pasó (F-27: `sweepRateLimiter` existía y no lo llamaba
 * nadie, así que el `Map` no se vaciaba nunca).
 */
const SWEEP_EVERY = 500;
let callsSinceSweep = 0;

export function rateLimit(key: string, limit = 120, windowMs = 10_000): RateLimitResult {
  const now = Date.now();
  if (++callsSinceSweep >= SWEEP_EVERY) {
    callsSinceSweep = 0;
    sweepRateLimiter();
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  bucket.count++;
  if (bucket.count > limit) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterMs: 0 };
}

/**
 * Limpieza de cubetas caducadas. La llama `rateLimit()` cada `SWEEP_EVERY` peticiones; se exporta también para
 * poder invocarla desde un test.
 */
export function sweepRateLimiter(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Número de cubetas vivas. Para tests: comprobar que el barrido de verdad vacía. */
export function rateLimiterSize(): number {
  return buckets.size;
}
