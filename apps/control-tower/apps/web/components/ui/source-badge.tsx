import { ExternalSourceLink } from '@/components/ui/external-source-link';

/**
 * Badge de **fuente de verdad** (doc 6/7: la procedencia siempre visible). Distingue entre datos
 * *nativos* de Control Tower (OWNED) y datos *sincronizados/enlazados* de un proveedor externo
 * (Twenty/Notion/GitHub/Drive), y ofrece "Abrir enlace externo" cuando hay URL. Nunca depende sólo del color.
 */

const PROVIDER_LABEL: Record<string, string> = {
  MANUAL: 'Control Tower',
  REVIEW: 'Por revisar', // conocimiento que entró desde la cola de revisión
  CONTROL_TOWER: 'Control Tower',
  NATIVE: 'Control Tower',
  TWENTY: 'Twenty CRM',
  NOTION: 'Notion',
  GITHUB: 'GitHub',
  GIT: 'GitHub',
  GDRIVE: 'Google Drive',
  DRIVE: 'Google Drive',
};

const PROVIDER_GLYPH: Record<string, string> = {
  TWENTY: '◆',
  NOTION: '❐',
  GITHUB: '⎇',
  GIT: '⎇',
  GDRIVE: '▲',
  DRIVE: '▲',
};

function isNative(source: string | null | undefined): boolean {
  if (!source) return true;
  const s = source.toUpperCase();
  return s === 'MANUAL' || s === 'CONTROL_TOWER' || s === 'NATIVE';
}

export function SourceBadge({
  source,
  url,
  nativeLabel = 'Control Tower',
  linkLabel,
}: {
  /** Proveedor/tipo de fuente: 'MANUAL'/'NATIVE' (nativo) o 'TWENTY'/'NOTION'/'GITHUB'/'GDRIVE'. */
  source?: string | null;
  /** URL para abrir la fuente externa, si existe. */
  url?: string | null;
  /** Etiqueta para el caso nativo (por defecto "Control Tower"). */
  nativeLabel?: string;
  /** Texto del enlace externo (por defecto "Abrir enlace externo"). */
  linkLabel?: string;
}) {
  const native = isNative(source);
  const key = (source ?? '').toUpperCase();
  const label = native ? nativeLabel : (PROVIDER_LABEL[key] ?? source ?? 'Externo');
  const glyph = native ? '⌂' : (PROVIDER_GLYPH[key] ?? '↗');

  return (
    <span className="inline-flex items-center gap-2">
      <span
        title={native ? 'Dato nativo de Control Tower' : `Sincronizado desde ${label}`}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
          native ? 'bg-neutral-soft text-neutral-soft-fg' : 'bg-accent-soft text-accent-soft-fg'
        }`}
      >
        <span aria-hidden>{glyph}</span>
        {label}
      </span>
      {url ? <ExternalSourceLink url={url} label={linkLabel} /> : null}
    </span>
  );
}
