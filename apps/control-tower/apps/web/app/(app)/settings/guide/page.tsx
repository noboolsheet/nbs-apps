import Link from 'next/link';
import guideMd from '@/content/user-guide.md';
import { Markdown } from '@/components/markdown';
import { t } from '@/lib/i18n';

export const metadata = { title: t('settings.guideTitleLong') };

/**
 * Guía de uso, legible desde la propia app (Settings › Guía). El contenido canónico vive en
 * `apps/web/content/user-guide.md` (también consultable en el repo) y se inlinea en el bundle
 * vía la regla `asset/source` de next.config.mjs — misma fuente para el repo y para la app.
 */
export default function GuidePage() {
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link href="/settings" className="hover:underline">
          {t('nav.settings')}
        </Link>{' '}
        › Guía de uso
      </nav>
      <article>
        <Markdown source={guideMd} />
      </article>
    </div>
  );
}
