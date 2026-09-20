import { describe, it, expect } from 'vitest';
import { singleExternalUrl } from './external-url';

/**
 * `sourceUrl` («URLs relacionadas») es texto libre y admite VARIAS urls a propósito. Un `href` sólo admite una:
 * esta función decide cuándo se puede ofrecer como enlace. Si dice que no, la Biblioteca cae al enlace de Notion.
 */
describe('singleExternalUrl', () => {
  it('devuelve la url cuando el campo trae exactamente una', () => {
    expect(singleExternalUrl('https://drive.google.com/drive/folders/abc')).toBe('https://drive.google.com/drive/folders/abc');
    expect(singleExternalUrl('  http://ejemplo.com/x  ')).toBe('http://ejemplo.com/x');
  });

  it('devuelve null con VARIAS urls, sea cual sea el separador', () => {
    expect(singleExternalUrl('https://a.com https://b.com')).toBeNull();
    expect(singleExternalUrl('https://a.com, https://b.com')).toBeNull();
    expect(singleExternalUrl('https://a.com;https://b.com')).toBeNull();
    expect(singleExternalUrl('https://a.com\nhttps://b.com')).toBeNull();
  });

  it('devuelve null si no hay nada o no es una url http(s)', () => {
    expect(singleExternalUrl(null)).toBeNull();
    expect(singleExternalUrl('')).toBeNull();
    expect(singleExternalUrl('   ')).toBeNull();
    expect(singleExternalUrl('la carpeta de ventas')).toBeNull();
    expect(singleExternalUrl('drive.google.com/folders/abc')).toBeNull(); // sin esquema no es enlazable
    // `javascript:` es una url válida para `new URL` pero no se enlaza jamás desde un campo de usuario.
    expect(singleExternalUrl('javascript:alert(1)')).toBeNull();
  });
});
