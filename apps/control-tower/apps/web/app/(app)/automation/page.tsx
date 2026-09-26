import Link from 'next/link';
import { getDb } from '@ct/db';
import { listRecentJobErrors } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { buttonCls } from '@/components/ui/button';
import { formatDateTime } from '@/lib/i18n/format';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * Portada de Automatización: las tres secciones como tarjetas (qué hay dentro + botón) y, debajo, los **errores
 * recientes**. Los contadores de procesos/bandeja de salida y la lista de procesos recientes viven en «Estado del
 * sistema»: aquí sólo interesa a dónde ir y si algo se ha roto.
 */
const SECTIONS: { href: string; title: string; description: string; cta: string }[] = [
  {
    href: '/automation/list',
    title: t('automation.cardListTitle'),
    description: t('automation.cardListDesc'),
    cta: t('automation.cardListCta'),
  },
  {
    href: '/automation/integrations',
    title: t('automation.cardIntegrationsTitle'),
    description: t('automation.cardIntegrationsDesc'),
    cta: t('automation.cardIntegrationsCta'),
  },
  {
    href: '/automation/health',
    title: t('automation.cardHealthTitle'),
    description: t('automation.cardHealthDesc'),
    cta: t('automation.cardHealthCta'),
  },
];

export default async function AutomationPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const errors = await listRecentJobErrors(getDb());

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.automation')}</h1>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {SECTIONS.map((s) => (
          <Card key={s.href} className="flex flex-col gap-2 p-4">
            <h2 className="text-base font-medium">{s.title}</h2>
            <p className="flex-1 text-sm text-fg-muted">{s.description}</p>
            <Link href={s.href} className={`self-start ${buttonCls('surface', 'md')}`}>
              {s.cta}
            </Link>
          </Card>
        ))}
      </section>

      {/* Plegable: es una lista y, cuando no hay nada roto, no debe ocupar media pantalla. Se abre sola si hay algo. */}
      <CollapsibleSection
        title={t('automation.recentErrors')}
        count={errors.length}
        defaultOpen={errors.length > 0}
      >
        {errors.length === 0 ? (
          <EmptyState title={t('automation.recentErrorsEmpty')} />
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {errors.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 rounded border border-danger-border px-3 py-2">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.jobType}</span>
                  <span className="text-xs text-fg-subtle">{formatDateTime(e.at)}</span>
                </span>
                <span className="text-danger">{e.error}</span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
    </div>
  );
}
