import Link from 'next/link';
import { getDb } from '@ct/db';
import { listAutomations, type AutomationRow } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AutomationLink } from '@/components/automation/automation-link';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

const KIND_SECTIONS: { kind: AutomationRow['kind']; title: string; hint?: string }[] = [
  { kind: 'core', title: t('automation.nucleoDelMotor'), hint: t('automation.siempreActivasSinEllasNadaCorreriaSoloLe') },
  { kind: 'event', title: t('automation.porEvento'), hint: t('automation.seDisparanAlOcurrirUnCambio') },
  { kind: 'sync', title: t('automation.sincronizaciones'), hint: t('automation.traenDatosDeLosSistemasExternosDiarioMan') },
  { kind: 'sweep', title: t('automation.barridosDeMantenimiento'), hint: t('automation.limpianArchivanPeriodicamente') },
];

export default async function AutomationsListPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const rows = await listAutomations(getDb(), ctx.org);

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/automation">
          {t('nav.automation')}
        </Link>{' '}
        / Automatizaciones
      </nav>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('automation.automatizaciones')}</h1>
        <p className="text-sm text-fg-muted">{t('automation.todoLoQueControlTowerHacePorSuCuentaPuls')}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t('automation.sinAutomatizaciones')} />
      ) : (
        KIND_SECTIONS.map((section) => {
          const items = rows.filter((r) => r.kind === section.kind);
          if (items.length === 0) return null;
          return (
            <section key={section.kind} className="flex flex-col gap-2">
              <div>
                <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{section.title}</h2>
                {section.hint && <p className="text-xs text-fg-subtle">{section.hint}</p>}
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((r) => (
                  <li key={r.key}>
                    <AutomationLink
                      automationKey={r.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted"
                    >
                      <span className="font-medium">{r.title}</span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-fg-muted">{r.frequencyLabel}</span>
                        <StatusBadge status={r.status} />
                      </span>
                    </AutomationLink>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
