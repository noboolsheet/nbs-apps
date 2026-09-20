/**
 * Fuente de datos de Google Drive. Interfaz inyectable (fixture en tests). La implementación HTTP
 * usa la API Drive v3 (files.list). Sólo metadata + webViewLink; NO se descargan/almacenan archivos.
 * Con `folderId` el listado es RECURSIVO: recorre el árbol (BFS) e indexa ficheros a cualquier
 * profundidad, saltando las carpetas (no son documentos) y protegido contra ciclos (atajos/duplicados).
 */
import { withTimeout } from '../http';

export type DriveRawFile = { id: string; [key: string]: unknown };

const FOLDER_MIME = 'application/vnd.google-apps.folder';

function isFolder(f: DriveRawFile): boolean {
  return f.mimeType === FOLDER_MIME;
}

export interface DriveDataSource {
  ping(): Promise<boolean>;
  files(): Promise<DriveRawFile[]>;
}

export interface DriveHttpConfig {
  /** Token estático (compat/dev; caduca ~1h). */
  accessToken?: string;
  /** Proveedor de token (cuenta de servicio): recomendado, sin caducidad problemática. */
  getToken?: () => Promise<string>;
  /** Scoping (E-4): sólo archivos dentro de esta carpeta. Si falta, lista todo lo accesible. */
  folderId?: string;
  baseUrl?: string; // default https://www.googleapis.com
  fetchImpl?: typeof fetch;
}

export class HttpDriveDataSource implements DriveDataSource {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly getTokenFn?: () => Promise<string>;
  private readonly folderId?: string;
  private readonly f: typeof fetch;

  constructor(config: DriveHttpConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://www.googleapis.com').replace(/\/$/, '');
    this.accessToken = config.accessToken;
    this.getTokenFn = config.getToken;
    this.folderId = config.folderId;
    this.f = withTimeout(config.fetchImpl ?? fetch);
  }

  private async token(): Promise<string> {
    if (this.getTokenFn) return this.getTokenFn();
    if (this.accessToken) return this.accessToken;
    throw new Error('Drive: falta getToken o accessToken');
  }

  private async headers(): Promise<Record<string, string>> {
    return { Authorization: `Bearer ${await this.token()}`, Accept: 'application/json' };
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.f(`${this.baseUrl}/drive/v3/about?fields=user`, { headers: await this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Lista los hijos DIRECTOS de una carpeta (o todo lo accesible si `folderId` es undefined), paginado. */
  private async listChildren(folderId?: string): Promise<DriveRawFile[]> {
    const headers = await this.headers();
    const out: DriveRawFile[] = [];
    let pageToken: string | undefined;
    do {
      const params = new URLSearchParams({
        pageSize: '100',
        fields: 'nextPageToken,files(id,name,mimeType,webViewLink)',
      });
      if (folderId) params.set('q', `'${folderId}' in parents and trashed = false`);
      if (pageToken) params.set('pageToken', pageToken);
      const res = await this.f(`${this.baseUrl}/drive/v3/files?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`Drive files → HTTP ${res.status}`);
      const json = (await res.json()) as { files?: DriveRawFile[]; nextPageToken?: string };
      out.push(...(json.files ?? []));
      pageToken = json.nextPageToken;
    } while (pageToken);
    return out;
  }

  async files(): Promise<DriveRawFile[]> {
    // Sin carpeta: todo lo accesible por la SA (a cualquier profundidad); se descartan las carpetas.
    if (!this.folderId) return (await this.listChildren(undefined)).filter((f) => !isFolder(f));

    // Con carpeta: recorrido recursivo (BFS). Las carpetas se recorren; solo los ficheros se emiten.
    const out: DriveRawFile[] = [];
    const visited = new Set<string>();
    const queue: string[] = [this.folderId];
    while (queue.length > 0) {
      const folder = queue.shift()!;
      if (visited.has(folder)) continue;
      visited.add(folder);
      for (const child of await this.listChildren(folder)) {
        if (isFolder(child)) queue.push(child.id);
        else out.push(child);
      }
    }
    return out;
  }
}
