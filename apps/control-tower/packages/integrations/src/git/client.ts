/**
 * Fuente de datos de Git/GitHub. Interfaz inyectable (fixture en tests). La implementación HTTP
 * usa la API REST de GitHub para listar repos. Sólo metadata (nombre, descripción, URLs).
 */
import { withTimeout } from '../http';

export type GitRawRepo = { id: number | string; [key: string]: unknown };

/** Extrae la URL `rel="next"` del header `Link` de GitHub (paginación), o null si no hay más páginas. */
function nextLink(link: string | null): string | null {
  if (!link) return null;
  for (const part of link.split(',')) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1] ?? null;
  }
  return null;
}

export interface GitDataSource {
  ping(): Promise<boolean>;
  repos(): Promise<GitRawRepo[]>;
}

export interface GitHubHttpConfig {
  token: string; // secreto, desde env (GITHUB_TOKEN)
  owner?: string; // usuario/org; si se omite se usan los repos del token (/user/repos)
  baseUrl?: string; // default https://api.github.com
  fetchImpl?: typeof fetch;
}

export class HttpGitHubDataSource implements GitDataSource {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly owner?: string;
  private readonly f: typeof fetch;

  constructor(config: GitHubHttpConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://api.github.com').replace(/\/$/, '');
    this.token = config.token;
    this.owner = config.owner;
    this.f = withTimeout(config.fetchImpl ?? fetch);
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private path(): string {
    return this.owner ? `/users/${this.owner}/repos?per_page=100` : `/user/repos?per_page=100`;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await this.f(`${this.baseUrl}/rate_limit`, { headers: this.headers() });
      return res.ok;
    } catch {
      return false;
    }
  }

  async repos(): Promise<GitRawRepo[]> {
    // Paginación real: seguir `Link: rel="next"` hasta agotar (antes solo traía la 1ª página → tope de 100 repos).
    // Las URLs de `next` son absolutas (las devuelve GitHub), se pasan tal cual. Tope de páginas por seguridad.
    const all: GitRawRepo[] = [];
    let url: string | null = `${this.baseUrl}${this.path()}`;
    for (let page = 0; url && page < 50; page++) {
      const res = await this.f(url, { headers: this.headers() });
      if (!res.ok) throw new Error(`GitHub repos → HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json)) all.push(...(json as GitRawRepo[]));
      url = nextLink(res.headers.get('link'));
    }
    return all;
  }
}
