import { describe, it, expect } from 'vitest';
import { mapRepo } from './mapper';

describe('git mapper', () => {
  it('mapea un repo con url de clone', () => {
    const r = mapRepo({ id: 42, name: 'control-tower', description: 'CT', html_url: 'https://github.com/x/control-tower', clone_url: 'https://github.com/x/control-tower.git' });
    expect(r).toMatchObject({ externalId: '42', name: 'control-tower', description: 'CT', url: 'https://github.com/x/control-tower', repositoryUrl: 'https://github.com/x/control-tower.git' });
  });

  it('fallbacks defensivos', () => {
    const r = mapRepo({ id: 7, full_name: 'x/y' });
    expect(r.name).toBe('x/y');
    expect(r.repositoryUrl).toBeUndefined();
  });
});
