import { describe, it, expect } from 'vitest';
import { parseQuickNote, QUICK_NOTE_DESTINATIONS } from './quick-note';

describe('parseQuickNote', () => {
  it('una línea: todo es título y no hay resto', () => {
    expect(parseQuickNote('Llamar a Marta')).toEqual({ title: 'Llamar a Marta', rest: null, url: null });
  });

  it('varias líneas: la primera es el título y el resto va al campo largo', () => {
    const r = parseQuickNote('Probar Drizzle Studio\n\nA ver si sirve para revisar la base en local.');
    expect(r.title).toBe('Probar Drizzle Studio');
    expect(r.rest).toBe('A ver si sirve para revisar la base en local.');
  });

  it('se salta las líneas vacías del principio (pegar texto suele traerlas)', () => {
    expect(parseQuickNote('\n\n  Idea suelta  \n').title).toBe('Idea suelta');
  });

  it('un título larguísimo se corta por palabra y lo que sobra NO se pierde', () => {
    const palabra = 'palabra ';
    const largo = palabra.repeat(40).trim(); // ~320 caracteres en una sola línea
    const r = parseQuickNote(largo);
    expect(r.title.length).toBeLessThanOrEqual(180);
    expect(r.title.endsWith('palabra')).toBe(true); // no corta a mitad de palabra
    expect(r.rest).toBeTruthy();
    // El texto entero sigue estando entre título y resto.
    expect(`${r.title} ${r.rest}`.replace(/\s+/g, ' ')).toBe(largo);
  });

  it('saca la primera URL, para que un enlace pegado pueda ir a «Por revisar»', () => {
    const r = parseQuickNote('Leer esto https://example.com/articulo?x=1 cuando tenga tiempo');
    expect(r.url).toBe('https://example.com/articulo?x=1');
  });

  it('sin URL devuelve null (y no una cadena vacía, que se colaría en el campo)', () => {
    expect(parseQuickNote('sin enlaces').url).toBeNull();
  });

  it('los destinos son los cuatro sitios donde acaba una idea suelta', () => {
    expect([...QUICK_NOTE_DESTINATIONS]).toEqual(['task', 'decision', 'knowledge_item', 'review_item']);
  });
});
