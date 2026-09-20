/**
 * Utilidad HTTP compartida por los clientes de integración.
 *
 * **Por qué existe:** el worker procesa jobs/outbox en serie dentro de un tick guardado por un flag `ticking`.
 * Un `fetch` a un sistema externo (Twenty/Notion/GitHub/Drive/Calendar/Google) que se quede COLGADO sin
 * respuesta bloquearía ese `await` para siempre y con él TODOS los jobs, syncs y barridos. Para evitarlo, todo
 * `fetch` saliente lleva un `AbortSignal` con timeout: si el endpoint no responde a tiempo, la petición se
 * aborta (lanza) y el flujo normal de error/reintento la maneja, en vez de congelar el worker.
 */

/** Timeout por defecto (ms) de las peticiones HTTP salientes. Generoso: solo corta cuelgues reales, no lentitud normal. */
export const DEFAULT_HTTP_TIMEOUT_MS = 30_000;

/**
 * Envuelve un `fetch` para que CADA petición lleve un timeout. Si el llamador ya pasó su propio `signal`, se
 * combinan (aborta el primero que dispare). Preserva la firma de `fetch`, así que es transparente para los
 * clientes y para los `fetchImpl` inyectados en tests (un fetch de fixture resuelve al instante y el timeout
 * nunca salta).
 */
export function withTimeout(f: typeof fetch, ms: number = DEFAULT_HTTP_TIMEOUT_MS): typeof fetch {
  return ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const timeout = AbortSignal.timeout(ms);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return f(input, { ...init, signal });
  }) as typeof fetch;
}
