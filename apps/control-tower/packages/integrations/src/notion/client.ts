/**
 * Fuente de datos de Notion. Interfaz inyectable (fixture en tests). La implementación HTTP usa la API de Notion.
 * Sólo se leen/escriben propiedades estructuradas + URL; NUNCA el contenido canónico del cuerpo de la página.
 */

import { withTimeout } from '../http';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Página de Notion normalizada (id + url + propiedades crudas por nombre). */
export interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, unknown>;
}

/** Metadatos de una base de datos: nombre de la propiedad título + tipos por nombre. */
export interface NotionDatabaseInfo {
  titlePropName: string;
  propertyTypes: Record<string, string>;
}

export interface NotionDataSource {
  ping(): Promise<boolean>;
  /** Esquema de una base de datos (para descubrir el nombre real de la propiedad título). */
  retrieveDatabase(databaseId: string): Promise<NotionDatabaseInfo>;
  /** Todas las filas de una base de datos (paginado). */
  queryDatabase(databaseId: string): Promise<NotionPage[]>;
  /** Crea una fila (página) en una base de datos con las propiedades dadas. */
  createPage(databaseId: string, properties: Record<string, unknown>): Promise<NotionPage>;
  /** Actualiza las propiedades de una página existente. */
  updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage>;
}

export interface NotionHttpConfig {
  apiKey: string; // secreto, desde env
  baseUrl?: string; // default https://api.notion.com
  notionVersion?: string;
  fetchImpl?: typeof fetch;
}

export class HttpNotionDataSource implements NotionDataSource {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly version: string;
  private readonly f: typeof fetch;

  constructor(config: NotionHttpConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://api.notion.com').replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.version = config.notionVersion ?? '2022-06-28';
    this.f = withTimeout(config.fetchImpl ?? fetch);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Notion-Version': this.version,
      'Content-Type': 'application/json',
    };
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.f(`${this.baseUrl}/v1/search`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ page_size: 1 }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async body(res: Response): Promise<string> {
    return res.text().catch(() => '');
  }

  /**
   * Petición a Notion con reintento en **429** respetando `Retry-After` (Notion limita ~3 req/s). Antes se
   * martilleaba: cada 429 se registraba como fallo y se seguía golpeando. Ahora espera lo indicado (o un backoff
   * por defecto) y reintenta, hasta un tope. Sobre `this.f` (que ya lleva timeout).
   */
  private async req(url: string, init?: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.f(url, init);
      if (res.status !== 429 || attempt >= 4) return res;
      const ra = Number(res.headers.get('retry-after'));
      const waitMs = Number.isFinite(ra) && ra > 0 ? ra * 1000 : (attempt + 1) * 1000;
      await sleep(Math.min(waitMs, 30_000));
    }
  }

  async retrieveDatabase(databaseId: string): Promise<NotionDatabaseInfo> {
    const res = await this.req(`${this.baseUrl}/v1/databases/${databaseId}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`Notion retrieveDatabase → HTTP ${res.status}: ${await this.body(res)}`);
    const json = (await res.json()) as { properties?: Record<string, { type?: string }> };
    const props = json.properties ?? {};
    let titlePropName = 'Name';
    const propertyTypes: Record<string, string> = {};
    for (const [name, def] of Object.entries(props)) {
      const t = typeof def?.type === 'string' ? def.type : 'unknown';
      propertyTypes[name] = t;
      if (t === 'title') titlePropName = name;
    }
    return { titlePropName, propertyTypes };
  }

  async queryDatabase(databaseId: string): Promise<NotionPage[]> {
    const out: NotionPage[] = [];
    let cursor: string | undefined;
    do {
      const res = await this.req(`${this.baseUrl}/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
      });
      if (!res.ok) throw new Error(`Notion query → HTTP ${res.status}: ${await this.body(res)}`);
      const json = (await res.json()) as {
        results?: Array<{ id: string; url?: string; properties?: Record<string, unknown> }>;
        has_more?: boolean;
        next_cursor?: string | null;
      };
      for (const r of json.results ?? []) out.push({ id: r.id, url: r.url ?? '', properties: r.properties ?? {} });
      cursor = json.has_more ? (json.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return out;
  }

  async createPage(databaseId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    const res = await this.req(`${this.baseUrl}/v1/pages`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
    });
    if (!res.ok) throw new Error(`Notion createPage → HTTP ${res.status}: ${await this.body(res)}`);
    const r = (await res.json()) as { id: string; url?: string; properties?: Record<string, unknown> };
    return { id: r.id, url: r.url ?? '', properties: r.properties ?? {} };
  }

  async updatePage(pageId: string, properties: Record<string, unknown>): Promise<NotionPage> {
    const res = await this.req(`${this.baseUrl}/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) throw new Error(`Notion updatePage → HTTP ${res.status}: ${await this.body(res)}`);
    const r = (await res.json()) as { id: string; url?: string; properties?: Record<string, unknown> };
    return { id: r.id, url: r.url ?? '', properties: r.properties ?? {} };
  }
}
