import Link from 'next/link';
import { getDb } from '@ct/db';
import { listIntegrations, latestSyncRunByProvider } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ConnectProviderButton, SyncNowButton, DisconnectButton, IntegrationConfigForm } from '@/components/integrations/controls';
import { SyncRunSummary } from '@/components/integrations/sync-run-summary';
import { t } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

// Proveedores cuya configuración (no sensible) se edita en la UI: Drive (folderId) y Notion (databases).
// Twenty/GitHub/Calendar se configuran solo por env, no usan integrations.configuration.
const CONFIGURABLE = new Set(['GDRIVE', 'NOTION']);

// Providers soportados: Twenty, Notion, GitHub, Google Drive, Google Calendar.
const KNOWN = [
  { provider: 'TWENTY', displayName: 'Twenty CRM' },
  { provider: 'NOTION', displayName: 'Notion' },
  { provider: 'GITHUB', displayName: 'GitHub' },
  { provider: 'GDRIVE', displayName: 'Google Drive' },
  { provider: 'GCALENDAR', displayName: 'Google Calendar' },
];

export default async function IntegrationsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [rows, lastRuns] = await Promise.all([
    listIntegrations(db, ctx.org),
    latestSyncRunByProvider(db, ctx.org), // F-16: último run por proveedor
  ]);
  const connectedProviders = new Set(rows.map((r) => r.provider));

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/automation">{t('nav.automation')}</Link> / {t('home.integrations')}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{t('home.integrations')}</h1>

      {rows.length === 0 ? (
        <EmptyState title={t('automation.sinIntegracionesConectadas')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-line px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-medium">{r.displayName}</span>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  {/* F-16 (salud más fina): ACTIVA pero con registros saltados en la última sync. */}
                  {r.status === 'ACTIVE' && lastRuns.get(r.provider)?.status === 'COMPLETED_WITH_WARNINGS' && (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning-soft-fg">
                      {t('automation.conAdvertencias')}
                    </span>
                  )}
                  <span className="text-xs text-fg-muted">
                    {r.lastHealthCheckAt ? `check: ${formatDateTime(r.lastHealthCheckAt)}` : 'sin check'}
                  </span>
                  <SyncNowButton id={r.id} />
                  <DisconnectButton id={r.id} displayName={r.displayName} />
                </div>
              </div>
              {/* F-16: resultado de la última sync (creados/actualizados/saltados + motivo de cada fallo). */}
              {(() => {
                const run = lastRuns.get(r.provider);
                return run ? (
                  <SyncRunSummary
                    run={{
                      status: run.status,
                      created: run.created,
                      updated: run.updated,
                      deleted: run.deleted,
                      skippedCount: run.skippedCount,
                      skips: run.skips as { entity: string; externalId: string; error: string }[] | null,
                      error: run.error,
                      startedAt: run.startedAt.toISOString(),
                    }}
                  />
                ) : (
                  <span className="text-xs text-fg-subtle">{t('automation.sinEjecucionesRegistradasTodavia')}</span>
                );
              })()}
              {CONFIGURABLE.has(r.provider) && (
                <IntegrationConfigForm id={r.id} provider={r.provider} configuration={r.configuration} />
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('automation.disponibles')}</h2>
        <div className="flex flex-wrap gap-2">
          {KNOWN.filter((k) => !connectedProviders.has(k.provider)).map((k) => (
            <ConnectProviderButton key={k.provider} provider={k.provider} displayName={k.displayName} />
          ))}
          {KNOWN.every((k) => connectedProviders.has(k.provider)) && (
            <span className="text-sm text-fg-muted">{t('automation.todoLoDisponibleYaEstaConectado')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
