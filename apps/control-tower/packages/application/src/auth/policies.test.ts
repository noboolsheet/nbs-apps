import { describe, it, expect } from 'vitest';
import { can, requireCan, isRole } from './policies';

describe('authz policies', () => {
  it('VIEWER sólo puede leer', () => {
    expect(can('VIEWER', 'read')).toBe(true);
    expect(can('VIEWER', 'write')).toBe(false);
    expect(can('VIEWER', 'delete')).toBe(false);
    expect(can('VIEWER', 'manage_org')).toBe(false);
  });

  it('MEMBER lee y escribe pero no borra', () => {
    expect(can('MEMBER', 'write')).toBe(true);
    expect(can('MEMBER', 'delete')).toBe(false);
  });

  it('ADMIN borra pero no gestiona la org', () => {
    expect(can('ADMIN', 'delete')).toBe(true);
    expect(can('ADMIN', 'manage_org')).toBe(false);
  });

  it('OWNER puede todo', () => {
    expect(can('OWNER', 'read')).toBe(true);
    expect(can('OWNER', 'manage_org')).toBe(true);
  });

  it('requireCan lanza cuando no está permitido', () => {
    expect(() => requireCan('VIEWER', 'write')).toThrow();
    expect(() => requireCan('OWNER', 'manage_org')).not.toThrow();
  });

  it('isRole valida strings', () => {
    expect(isRole('OWNER')).toBe(true);
    expect(isRole('SUPERUSER')).toBe(false);
    expect(isRole(123)).toBe(false);
  });
});
