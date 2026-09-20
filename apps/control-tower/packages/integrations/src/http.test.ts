import { describe, it, expect } from 'vitest';
import { withTimeout } from './http';

describe('withTimeout', () => {
  it('inyecta un AbortSignal y deja pasar la respuesta del fetch subyacente', async () => {
    let seenSignal: AbortSignal | null | undefined;
    const fake = (async (_url: unknown, init?: RequestInit) => {
      seenSignal = init?.signal;
      return new Response('ok');
    }) as unknown as typeof fetch;

    const res = await withTimeout(fake, 1000)('https://example.test');
    expect(seenSignal).toBeInstanceOf(AbortSignal);
    expect(await res.text()).toBe('ok');
  });

  it('aborta (rechaza) si el fetch subyacente no responde antes del timeout', async () => {
    // fetch que se "cuelga" pero respeta el signal: rechaza cuando se aborta.
    const hanging = ((_url: unknown, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      })) as unknown as typeof fetch;

    await expect(withTimeout(hanging, 5)('https://example.test')).rejects.toThrow();
  });
});
