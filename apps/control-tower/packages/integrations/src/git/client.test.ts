import { describe, it, expect } from 'vitest';
import { HttpGitHubDataSource } from './client';

describe('HttpGitHubDataSource.repos', () => {
  it('sigue el header Link rel="next" hasta agotar las páginas', async () => {
    const p1 = 'https://api.github.com/user/repos?per_page=100';
    const p2 = 'https://api.github.com/user/repos?per_page=100&page=2';
    const pages: Record<string, { body: unknown; link: string | null }> = {
      [p1]: { body: [{ id: 1 }, { id: 2 }], link: `<${p2}>; rel="next"` },
      [p2]: { body: [{ id: 3 }], link: null },
    };
    const calls: string[] = [];
    const fetchImpl = (async (url: unknown) => {
      const key = String(url);
      calls.push(key);
      const page = pages[key]!;
      return new Response(JSON.stringify(page.body), { headers: page.link ? { link: page.link } : {} });
    }) as unknown as typeof fetch;

    const ds = new HttpGitHubDataSource({ token: 't', fetchImpl });
    const repos = await ds.repos();
    expect(repos.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(calls).toEqual([p1, p2]);
  });

  it('sin header Link trae solo una página', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify([{ id: 1 }]))) as unknown as typeof fetch;
    const ds = new HttpGitHubDataSource({ token: 't', owner: 'acme', fetchImpl });
    const repos = await ds.repos();
    expect(repos.map((r) => r.id)).toEqual([1]);
  });

  // M40: si se alcanza el tope de páginas el pull está incompleto; el sync archivaría los repos que faltan.
  it('tope de páginas ⇒ lanza en vez de devolver un pull truncado', async () => {
    const fetchImpl = (async (url: unknown) =>
      new Response(JSON.stringify([{ id: 1 }]), {
        headers: { link: `<${String(url)}&next>; rel="next"` },
      })) as unknown as typeof fetch;

    const ds = new HttpGitHubDataSource({ token: 't', fetchImpl });
    await expect(ds.repos()).rejects.toThrow(/incompleto/);
  });
});
