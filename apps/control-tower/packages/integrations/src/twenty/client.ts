/**
 * Fuente de datos de Twenty. Se define como interfaz para poder inyectar un fake/fixture en
 * tests sin depender de que Twenty esté levantado. La implementación HTTP apunta al Twenty
 * self-hosted (infrastructure/twenty/). La API REST exacta puede variar por versión → el mapper
 * extrae los campos de forma defensiva.
 */
import { withTimeout } from '../http';

export type TwentyRawRecord = { id: string; [key: string]: unknown };

export interface TwentyDataSource {
  ping(): Promise<boolean>;
  companies(): Promise<TwentyRawRecord[]>;
  people(): Promise<TwentyRawRecord[]>;
  opportunities(): Promise<TwentyRawRecord[]>;
  tasks(): Promise<TwentyRawRecord[]>;
  /** Write-back (E-1): PATCH parcial de un registro. `resource` = companies|people|opportunities. */
  update(resource: string, id: string, body: Record<string, unknown>): Promise<void>;
}

export interface TwentyHttpConfig {
  baseUrl: string; // p. ej. http://twenty.app.prod:3000
  apiKey: string; // secreto, desde env (NUNCA en DB)
  fetchImpl?: typeof fetch;
}

/** Extrae un array de registros de las formas típicas de respuesta REST de Twenty. */
function extractRecords(json: unknown, resource: string): TwentyRawRecord[] {
  if (Array.isArray(json)) return json as TwentyRawRecord[];
  const obj = json as { data?: Record<string, unknown> } | undefined;
  const data = obj?.data;
  if (Array.isArray(data)) return data as TwentyRawRecord[];
  const nested = data?.[resource];
  if (Array.isArray(nested)) return nested as TwentyRawRecord[];
  return [];
}

export class HttpTwentyDataSource implements TwentyDataSource {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly f: typeof fetch;

  constructor(config: TwentyHttpConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.f = withTimeout(config.fetchImpl ?? fetch);
  }

  private async get(path: string): Promise<unknown> {
    const res = await this.f(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Twenty ${path} → HTTP ${res.status}`);
    return res.json();
  }

  /**
   * Lista TODOS los registros de un recurso paginando por cursor (Twenty REST: `pageInfo.hasNextPage`/`endCursor`
   * + `?starting_after=<cursor>`). Degradación grácil: si la respuesta NO trae `pageInfo` (otra versión de la API),
   * se queda en la primera página (comportamiento previo) → sin regresión.
   *
   * **Un pull truncado es un error, no media lista (M40).** Desde que el sync reconcilia borrados, lo que no
   * viene en el pull se ARCHIVA: devolver la primera página de un recurso que tiene más archivaría todo lo
   * demás. Así que las dos formas de truncamiento posibles —tope de páginas, y página llena sin `pageInfo`
   * (no hay manera de saber si hay más)— lanzan. El sync falla, se ve en «Envíos fallidos» y no toca nada.
   */
  private async getAllPages(resource: string): Promise<TwentyRawRecord[]> {
    const PAGE_SIZE = 60;
    const MAX_PAGES = 100;
    const all: TwentyRawRecord[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (cursor) qs.set('starting_after', cursor);
      const json = await this.get(`/rest/${resource}?${qs.toString()}`);
      const records = extractRecords(json, resource);
      all.push(...records);
      const pageInfo = (json as { pageInfo?: { hasNextPage?: boolean; endCursor?: string } } | undefined)?.pageInfo;
      if (!pageInfo?.hasNextPage || !pageInfo.endCursor) {
        if (!pageInfo && records.length >= PAGE_SIZE) {
          throw new Error(
            `Twenty ${resource}: la respuesta no trae pageInfo y la página viene llena (${records.length}); ` +
              'no se puede saber si faltan registros y el sync no debe archivar lo que no ha visto',
          );
        }
        return all;
      }
      cursor = pageInfo.endCursor;
    }
    throw new Error(`Twenty ${resource}: tope de ${MAX_PAGES} páginas alcanzado; el pull está incompleto`);
  }

  async update(resource: string, id: string, body: Record<string, unknown>): Promise<void> {
    if (Object.keys(body).length === 0) return; // nada que escribir
    const path = `/rest/${resource}/${id}`;
    const res = await this.f(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Twenty PATCH ${path} → HTTP ${res.status}${detail ? ` ${detail.slice(0, 300)}` : ''}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.get('/rest/companies?limit=1');
      return true;
    } catch {
      return false;
    }
  }
  async companies(): Promise<TwentyRawRecord[]> {
    return this.getAllPages('companies');
  }
  async people(): Promise<TwentyRawRecord[]> {
    return this.getAllPages('people');
  }
  async opportunities(): Promise<TwentyRawRecord[]> {
    return this.getAllPages('opportunities');
  }
  async tasks(): Promise<TwentyRawRecord[]> {
    return this.getAllPages('tasks');
  }
}
