import { describe, it, expect } from 'vitest';
import { clientCrmDisplay } from './client-crm-display';
import { t } from './i18n';
import { enumLabel } from './labels';

describe('tipo de organización y relación de un cliente, según su origen', () => {
  it('un cliente que es una PERSONA se enseña como cliente individual y cuenta comercial', () => {
    // Owner 2026-10-04: las dos columnas estaban vacías porque esas columnas sólo las rellena el pull de companies.
    expect(clientCrmDisplay({ externalType: 'person' })).toEqual({
      organizationType: 'INDIVIDUAL_CLIENT',
      relationshipRoles: ['COMMERCIAL_ACCOUNT'],
    });
  });

  it('y lo que hubiera guardado de una company NO lo pisa al revés: la empresa manda lo suyo', () => {
    expect(clientCrmDisplay({ externalType: 'company', industry: 'BUSINESS', relationshipRoles: ['SUPPLIER'] })).toEqual(
      { organizationType: 'BUSINESS', relationshipRoles: ['SUPPLIER'] },
    );
  });

  it('en una persona, lo derivado manda sobre lo que hubiera en las columnas', () => {
    // Si un sync viejo dejó algo ahí, no se enseña: el origen es el hecho, la columna es un residuo.
    const d = clientCrmDisplay({ externalType: 'person', industry: 'BUSINESS', relationshipRoles: ['SUPPLIER'] });
    expect(d.organizationType).toBe('INDIVIDUAL_CLIENT');
    expect(d.relationshipRoles).toEqual(['COMMERCIAL_ACCOUNT']);
  });

  it('un cliente nativo de CT (sin identidad) no enseña nada inventado', () => {
    expect(clientCrmDisplay({})).toEqual({ organizationType: null, relationshipRoles: [] });
    expect(clientCrmDisplay({ industry: '   ' }).organizationType).toBeNull(); // vacío en blanco = vacío
  });

  it('los dos códigos derivados tienen etiqueta: si no, la columna enseñaría el código crudo', () => {
    expect(enumLabel('INDIVIDUAL_CLIENT')).toBe('Cliente individual');
    expect(enumLabel('COMMERCIAL_ACCOUNT')).toBe(t('enum.COMMERCIAL_ACCOUNT'));
  });
});
