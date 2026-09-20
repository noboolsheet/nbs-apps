import { describe, it, expect } from 'vitest';
import { parseEnv, loadWebEnv } from './env';

describe('parseEnv', () => {
  it('acepta un entorno válido y aplica defaults', () => {
    const result = parseEnv({ DATABASE_URL: 'postgres://u:p@localhost:5432/db' });
    expect(result.success).toBe(true);
    expect(result.env?.NODE_ENV).toBe('development');
    expect(result.env?.PORT).toBe(3000);
  });

  it('falla si falta DATABASE_URL', () => {
    const result = parseEnv({});
    expect(result.success).toBe(false);
    expect(result.errors?.some((e) => e.includes('DATABASE_URL'))).toBe(true);
  });

  it('coacciona PORT numérico desde string', () => {
    const result = parseEnv({ DATABASE_URL: 'postgres://x', PORT: '4270' });
    expect(result.env?.PORT).toBe(4270);
  });
});

/**
 * La web NO puede arrancar sin `BETTER_AUTH_SECRET`: antes arrancaba igual (`/api/health` daba 200) y sólo
 * fallaba al iniciar sesión, con un 500 opaco. Comprobado en vivo antes de escribir la guarda.
 */
describe('loadWebEnv', () => {
  const base = { DATABASE_URL: 'postgres://u:p@localhost:5432/db' };

  it('falla si falta BETTER_AUTH_SECRET', () => {
    expect(() => loadWebEnv(base)).toThrow(/BETTER_AUTH_SECRET/);
  });

  it('falla si el secreto es demasiado corto', () => {
    expect(() => loadWebEnv({ ...base, BETTER_AUTH_SECRET: 'corto' })).toThrow(/32 caracteres/);
  });

  it('acepta un secreto de longitud suficiente', () => {
    const env = loadWebEnv({ ...base, BETTER_AUTH_SECRET: 'x'.repeat(32) });
    expect(env.BETTER_AUTH_SECRET).toHaveLength(32);
  });
});
