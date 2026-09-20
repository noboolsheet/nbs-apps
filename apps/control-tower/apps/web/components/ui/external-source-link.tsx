import { t } from '@/lib/i18n';

/** Enlace a una fuente externa con acción "Abrir enlace externo" (doc 6/7: fuentes externas claras). */
export function ExternalSourceLink({ url, label }: { url: string | null; label?: string }) {
  if (!url) return <span className="text-fg-subtle">—</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-link underline-offset-2 hover:underline"
    >
      {label ?? t('common.openExternal')} ↗
    </a>
  );
}
