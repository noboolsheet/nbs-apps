import { describe, it, expect } from 'vitest';
import { HttpTwentyDataSource } from './client';

describe('HttpTwentyDataSource', () => {
  it('pagina por cursor (pageInfo.hasNextPage/endCursor + starting_after)', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: unknown) => {
      const u = String(url);
      calls.push(u);
      if (u.includes('starting_after=c1')) {
        return new Response(
          JSON.stringify({ data: { companies: [{ id: 'c' }] }, pageInfo: { hasNextPage: false, endCursor: null } }),
        );
      }
      return new Response(
        JSON.stringify({ data: { companies: [{ id: 'a' }, { id: 'b' }] }, pageInfo: { hasNextPage: true, endCursor: 'c1' } }),
      );
    }) as unknown as typeof fetch;

    const ds = new HttpTwentyDataSource({ baseUrl: 'http://twenty', apiKey: 'k', fetchImpl });
    const rows = await ds.companies();
    expect(rows.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('starting_after=c1');
  });

  it('sin pageInfo se queda en una sola página (degradación grácil, sin regresión)', async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      return new Response(JSON.stringify({ data: { companies: [{ id: 'x' }] } }));
    }) as unknown as typeof fetch;

    const ds = new HttpTwentyDataSource({ baseUrl: 'http://twenty', apiKey: 'k', fetchImpl });
    const rows = await ds.companies();
    expect(rows.map((r) => r.id)).toEqual(['x']);
    expect(n).toBe(1);
  });

  // M40: desde que el sync archiva lo que no viene en el pull, devolver media lista archivaría la otra media.
  it('página llena sin pageInfo ⇒ lanza en vez de devolver un pull truncado', async () => {
    const full = Array.from({ length: 60 }, (_, i) => ({ id: `c${i}` }));
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ data: { companies: full } }))) as unknown as typeof fetch;

    const ds = new HttpTwentyDataSource({ baseUrl: 'http://twenty', apiKey: 'k', fetchImpl });
    await expect(ds.companies()).rejects.toThrow(/pageInfo/);
  });
});
