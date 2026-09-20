import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { Markdown } from './markdown';

/**
 * El renderer de markdown es propio (sin dependencias) y la guía de uso se edita a menudo: este test la renderiza
 * ENTERA con el contenido real del repo, que es exactamente lo que hace `Settings › Guía`. Si algún día un cambio en
 * el `.md` rompe el parser, falla aquí y no en la página en producción.
 */
const guide = readFileSync(new URL('../content/user-guide.md', import.meta.url), 'utf8');

describe('Markdown', () => {
  it('renderiza la guía de uso completa sin lanzar', () => {
    const html = renderToStaticMarkup(<Markdown source={guide} />);
    expect(html).toContain('<h1');
    expect(html).toContain('<table'); // la matriz de información
    expect(html.length).toBeGreaterThan(1000);
  });

  it('escapa el HTML del contenido (no se inyecta markup crudo)', () => {
    const html = renderToStaticMarkup(<Markdown source={'Hola <script>alert(1)</script>'} />);
    expect(html).not.toContain('<script>');
  });

  it('una fila de tabla suelta NO cuelga el render (se pinta como párrafo)', () => {
    // Sin cabecera + separador delante, esa línea no es una tabla válida. Antes el parser se quedaba clavado en
    // ella (bucle infinito → la página de la guía no respondía); ahora avanza y la pinta como texto.
    const html = renderToStaticMarkup(<Markdown source={'Texto\n\n| suelta | fila |\n\nFin'} />);
    expect(html).toContain('Fin');
  });

  it('sanea los enlaces con esquema peligroso', () => {
    const html = renderToStaticMarkup(<Markdown source={'[x](javascript:alert(1))'} />);
    expect(html).not.toContain('javascript:');
  });
});
