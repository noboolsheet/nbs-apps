import { describe, it, expect } from 'vitest';
import { mapDriveFile } from './mapper';

describe('drive mapper', () => {
  it('mapea archivo con webViewLink y mimeType', () => {
    const f = mapDriveFile({ id: 'f1', name: 'Propuesta.pdf', mimeType: 'application/pdf', webViewLink: 'https://drive.google.com/file/f1' });
    expect(f).toMatchObject({ externalId: 'f1', name: 'Propuesta.pdf', mimeType: 'application/pdf', url: 'https://drive.google.com/file/f1' });
  });

  it('fallback de nombre', () => {
    const f = mapDriveFile({ id: 'f2' });
    expect(f.name).toBe('(archivo sin nombre)');
  });
});
