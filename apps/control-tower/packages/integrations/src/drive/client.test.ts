import { describe, it, expect } from 'vitest';
import { HttpDriveDataSource } from './client';

const FOLDER = 'application/vnd.google-apps.folder';

/** fetch falso: devuelve los hijos de la carpeta pedida en el `q='<id>' in parents`. */
function fakeFetch(tree: Record<string, Array<{ id: string; name: string; mimeType?: string }>>) {
  return (async (url: string) => {
    const q = new URL(url).searchParams.get('q') ?? '';
    const folderId = q.match(/'([^']+)' in parents/)?.[1] ?? '__all__';
    return { ok: true, status: 200, json: async () => ({ files: tree[folderId] ?? [] }) };
  }) as unknown as typeof fetch;
}

describe('drive datasource (recursivo)', () => {
  it('recorre subcarpetas a cualquier profundidad y salta las carpetas', async () => {
    const tree = {
      root: [{ id: 'fA', name: 'A.pdf' }, { id: 'sub1', name: 'Sub1', mimeType: FOLDER }],
      sub1: [{ id: 'fB', name: 'B.pdf' }, { id: 'sub2', name: 'Sub2', mimeType: FOLDER }],
      sub2: [{ id: 'fC', name: 'C.pdf' }],
    };
    const ds = new HttpDriveDataSource({ accessToken: 'x', folderId: 'root', fetchImpl: fakeFetch(tree) });
    const files = await ds.files();
    expect(files.map((f) => f.id).sort()).toEqual(['fA', 'fB', 'fC']);
  });

  it('no entra en bucle infinito si hay un ciclo de carpetas', async () => {
    const tree = {
      root: [{ id: 'fA', name: 'A' }, { id: 'sub1', name: 'S1', mimeType: FOLDER }],
      sub1: [{ id: 'root', name: 'loop', mimeType: FOLDER }, { id: 'fB', name: 'B' }],
    };
    const ds = new HttpDriveDataSource({ accessToken: 'x', folderId: 'root', fetchImpl: fakeFetch(tree) });
    const files = await ds.files();
    expect(files.map((f) => f.id).sort()).toEqual(['fA', 'fB']);
  });
});
