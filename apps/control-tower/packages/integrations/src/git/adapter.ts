import type { CodeSourceAdapter, HealthResult, CodePullResult } from '../types';
import type { GitDataSource } from './client';
import { mapRepo } from './mapper';

/** Adapter de GitHub: pull de repos → repos normalizados (se reflejan como Assets). */
export class GitAdapter implements CodeSourceAdapter {
  readonly provider = 'GITHUB';
  constructor(private readonly source: GitDataSource) {}

  async healthCheck(): Promise<HealthResult> {
    try {
      const ok = await this.source.ping();
      return ok ? { status: 'HEALTHY' } : { status: 'ERROR', message: 'ping failed' };
    } catch (e) {
      return { status: 'ERROR', message: e instanceof Error ? e.message : 'unknown error' };
    }
  }

  async pull(): Promise<CodePullResult> {
    const repos = await this.source.repos();
    return { repos: repos.map(mapRepo) };
  }
}
