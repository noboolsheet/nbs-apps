import type { IntegrationAdapter, HealthResult, CrmPullResult } from '../types';
import type { TwentyDataSource } from './client';
import { mapCompany, mapPerson, mapOpportunity, mapTask } from './mapper';

/** Adapter de Twenty: implementa el contrato común usando una TwentyDataSource inyectable. */
export class TwentyAdapter implements IntegrationAdapter {
  readonly provider = 'TWENTY';
  constructor(private readonly source: TwentyDataSource) {}

  async healthCheck(): Promise<HealthResult> {
    try {
      const ok = await this.source.ping();
      return ok ? { status: 'HEALTHY' } : { status: 'ERROR', message: 'ping failed' };
    } catch (e) {
      return { status: 'ERROR', message: e instanceof Error ? e.message : 'unknown error' };
    }
  }

  async pull(): Promise<CrmPullResult> {
    const [companies, people, opportunities, tasks] = await Promise.all([
      this.source.companies(),
      this.source.people(),
      this.source.opportunities(),
      this.source.tasks(),
    ]);
    return {
      companies: companies.map(mapCompany),
      people: people.map(mapPerson),
      opportunities: opportunities.map(mapOpportunity),
      tasks: tasks.map(mapTask),
    };
  }
}
