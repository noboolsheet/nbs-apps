import type { GitRawRepo } from './client';
import type { NormalizedRepo } from '../types';

/** Mapea un repo crudo de GitHub a un repo normalizado (metadata + URLs). Extracción defensiva. */
function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v : undefined;
}

export function mapRepo(raw: GitRawRepo): NormalizedRepo {
  return {
    externalId: String(raw.id),
    name: str(raw.name) ?? str(raw.full_name) ?? '(repo sin nombre)',
    description: str(raw.description),
    url: str(raw.html_url),
    repositoryUrl: str(raw.clone_url) ?? str(raw.ssh_url) ?? str(raw.html_url),
  };
}
