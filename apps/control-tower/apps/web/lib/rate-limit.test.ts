import { describe, it, expect } from 'vitest';
import { rateLimit, sweepRateLimiter, rateLimiterSize } from './rate-limit';

/**
 * F-27: `sweepRateLimiter` existía y **no lo llamaba nadie**, así que el `Map` de cubetas no se vaciaba nunca.
 * Estos tests fijan las dos mitades del arreglo: que el barrido limpia de verdad y que el limitador sigue
 * limitando (un barrido que se lleve cubetas vivas sería peor que la fuga).
 */
describe('rate limiter', () => {
  it('el barrido elimina las cubetas caducadas y conserva las vivas', () => {
    const antes = rateLimiterSize();
    rateLimit('sweep:caducada', 10, 1); // ventana de 1 ms → caduca de inmediato
    rateLimit('sweep:viva', 10, 60_000);
    expect(rateLimiterSize()).toBe(antes + 2);

    // Esperar a que la primera venza sin usar temporizadores: la ventana es de 1 ms.
    const hasta = Date.now() + 5;
    while (Date.now() < hasta) {
      /* espera activa, 5 ms */
    }
    sweepRateLimiter();
    expect(rateLimiterSize()).toBe(antes + 1);
  });

  it('sigue limitando: pasado el límite, deja de permitir y dice cuánto esperar', () => {
    const key = `limite:${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const bloqueado = rateLimit(key, 3, 60_000);
    expect(bloqueado.ok).toBe(false);
    expect(bloqueado.retryAfterMs).toBeGreaterThan(0);
  });
});
