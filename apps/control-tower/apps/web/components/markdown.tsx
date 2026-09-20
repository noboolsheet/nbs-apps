import type { ReactNode } from 'react';

/**
 * Renderizador Markdown minimalista y SIN dependencias. Cubre el subconjunto que usamos en la guía de uso
 * (`content/user-guide.md`): encabezados, párrafos, **negrita**, `código`, bloques de código, listas (ul/ol),
 * **tablas GFM** (para la matriz de información), enlaces, citas y separadores. El contenido lo controlamos
 * nosotros, así que no hace falta un parser general (evitamos añadir react-markdown y su árbol de dependencias).
 */

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((s) => s.trim());
}

/** Formato en línea: `código`, **negrita**, [texto](url). No anida (suficiente para nuestro contenido). */
function renderInline(text: string, kp: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok[0] === '`') {
      out.push(
        <code key={`${kp}-c${i}`} className="rounded bg-neutral-soft px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok[0] === '*') {
      out.push(
        <strong key={`${kp}-b${i}`} className="font-semibold text-fg">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      const lm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (lm) {
        const raw = lm[2] ?? '';
        // Sanea el esquema: solo http(s)/relativo/anchor/mailto. Evita hrefs ejecutables (javascript:, data:…)
        // por si algún día se renderiza markdown de terceros (hoy el contenido es de confianza; defensa en profundidad).
        const href = /^(https?:\/\/|\/|#|mailto:)/i.test(raw) ? raw : '#';
        const external = /^https?:\/\//i.test(href);
        out.push(
          <a
            key={`${kp}-a${i}`}
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            {lm[1] ?? ''}
          </a>,
        );
      }
    }
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function heading(level: number, text: string, key: number): ReactNode {
  const kids = renderInline(text, `h${key}`);
  if (level === 1) return <h1 key={key} className="text-2xl font-semibold tracking-tight">{kids}</h1>;
  if (level === 2)
    return (
      <h2 key={key} className="mt-8 border-b border-line pb-1 text-lg font-semibold tracking-tight">
        {kids}
      </h2>
    );
  if (level === 3) return <h3 key={key} className="mt-5 text-base font-semibold">{kids}</h3>;
  return <h4 key={key} className="mt-4 text-sm font-semibold uppercase tracking-wide text-fg-muted">{kids}</h4>;
}

export function Markdown({ source }: { source: string }): ReactNode {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const L = (n: number): string => lines[n] ?? '';
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const isBlank = (l: string) => /^\s*$/.test(l);
  const isSpecial = (l: string) =>
    /^(#{1,6})\s/.test(l) || /^```/.test(l) || /^\s*([-*]|\d+\.)\s+/.test(l) || /^\s*>\s?/.test(l) || /^\s*\|.*\|\s*$/.test(l) || /^\s*---+\s*$/.test(l);

  while (i < lines.length) {
    const line = L(i);

    if (isBlank(line)) {
      i++;
      continue;
    }

    // Bloque de código ```
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(L(i))) {
        buf.push(L(i));
        i++;
      }
      i++; // cierre ```
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded bg-neutral-900 p-3 text-xs leading-5 text-neutral-100">
          <code>{buf.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Separador
    if (/^\s*---+\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="my-6 border-line" />);
      i++;
      continue;
    }

    // Encabezado
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      blocks.push(heading((h[1] ?? '').length, h[2] ?? '', key++));
      i++;
      continue;
    }

    // Tabla GFM: fila de cabecera + fila separadora con guiones
    if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /-/.test(L(i + 1)) && /^\s*\|?[\s:|-]+\|?\s*$/.test(L(i + 1))) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(L(i))) {
        rows.push(splitRow(L(i)));
        i++;
      }
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci} className="border-b border-line-strong px-2 py-1.5 font-semibold">
                    {renderInline(c, `th${key}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="align-top">
                  {r.map((c, ci) => (
                    <td key={ci} className="border-b border-line-subtle px-2 py-1.5 text-fg-muted">
                      {renderInline(c, `td${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Cita
    if (/^\s*>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(L(i))) {
        buf.push(L(i).replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-line-strong pl-3 text-sm text-fg-muted">
          {renderInline(buf.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Lista (ul/ol)
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items: ReactNode[] = [];
      let li = 0;
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(L(i))) {
        const t = L(i).replace(/^\s*([-*]|\d+\.)\s+/, '');
        items.push(
          <li key={li} className="text-sm leading-6 text-fg-muted">
            {renderInline(t, `li${key}-${li}`)}
          </li>,
        );
        li++;
        i++;
      }
      blocks.push(
        ordered ? (
          <ol key={key++} className="ml-5 list-decimal space-y-1">{items}</ol>
        ) : (
          <ul key={key++} className="ml-5 list-disc space-y-1">{items}</ul>
        ),
      );
      continue;
    }

    // Párrafo. La PRIMERA línea se consume siempre: si es "especial" pero ningún bloque de arriba la ha
    // reconocido (p. ej. una fila de tabla suelta, sin su cabecera y su separador), sin este avance el bucle se
    // quedaría clavado en ella para siempre — que es como una tabla mal escrita tiró la página de la guía.
    const buf: string[] = [L(i)];
    i++;
    while (i < lines.length && !isBlank(L(i)) && !isSpecial(L(i))) {
      buf.push(L(i));
      i++;
    }
    blocks.push(
      <p key={key++} className="text-sm leading-6 text-fg-muted">
        {renderInline(buf.join(' '), `p${key}`)}
      </p>,
    );
  }

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
