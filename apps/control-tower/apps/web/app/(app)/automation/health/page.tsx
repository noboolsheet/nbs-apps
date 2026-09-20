import Link from 'next/link';
import { getDb } from '@ct/db';
import { getSystemHealth, listFailedOutbox, listRecentJobs, listLogArchives } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { StatusBadge } from '@/components/ui/status-badge';
import { EntityTable, type Column } from '@/components/ui/entity-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/card';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { buttonCls } from '@/components/ui/button';
import { FailedPushes } from '@/components/automation/failed-pushes';
import { enumLabel } from '@/lib/labels';
import { t } from '@/lib/i18n';
import { formatDate, formatDateTime } from '@/lib/i18n/format';

export const dynamic = 'force-dynamic';

type JobRow = Awaited<ReturnType<typeof listRecentJobs>>[number];

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-3 text-sm">
      <div className="text-fg-muted">{label}</div>
      <div className="mt-1 text-base font-medium">{children}</div>
    </Card>
  );
}

export default async function SystemHealthPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [h, failed, recentJobs, archives] = await Promise.all([
    getSystemHealth(db, ctx.org),
    listFailedOutbox(db, ctx.org.organizationId),
    listRecentJobs(db, 20), // la lista de procesos vive aquí (la portada sólo enseña los errores)
    listLogArchives(db, ctx.org), // F-24: lotes ya rotados (procesos y bandeja de salida)
  ]);
  const jobColumns: Column<JobRow>[] = [
    { header: t('field.kind'), cell: (j) => j.jobType },
    { header: t('field.status'), cell: (j) => <StatusBadge status={j.status} /> },
    { header: t('automation.intentos'), cell: (j) => `${j.attempts}/${j.maxAttempts}` },
    { header: t('automation.lastError'), cell: (j) => <span className="line-clamp-1 text-danger">{j.lastError ?? ''}</span> },
  ];
  const jobStates = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const outboxStates = ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'];

  return (
    <div className="flex flex-col gap-6">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/automation">{t('nav.automation')}</Link> / {t('home.systemHealth')}
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight">{t('home.systemHealth')}</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={t('automation.baseDeDatos')}>
          {h.db.ok ? <StatusBadge status="ACTIVE" /> : <StatusBadge status="ERROR" />}
          {h.db.latencyMs != null && <span className="ml-1 text-xs text-fg-muted">{h.db.latencyMs}ms</span>}
        </Tile>
        <Tile label={t('automation.workerUltimaActividad')}>
          <span className="text-sm">{h.worker.lastJobActivityAt ? formatDateTime(h.worker.lastJobActivityAt) : '—'}</span>
        </Tile>
        <Tile label={t('home.integrations')}>{h.integrations.length}</Tile>
        <Tile label={t('home.outboxPending')}>{h.hasPendingOutbox ? 'sí' : 'no'}</Tile>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('automation.procesos')}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {jobStates.map((st) => (
            <Tile key={st} label={enumLabel(st)}>{h.jobs[st] ?? 0}</Tile>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('automation.bandejaDeSalida')}</h2>
          <a href="/api/v1/outbox/export" className={buttonCls('secondary', 'sm')} download>
            {t('automation.downloadJobsCsv')}
          </a>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {outboxStates.map((st) => (
            <Tile key={st} label={enumLabel(st)}>{h.outbox[st] ?? 0}</Tile>
          ))}
        </div>
      </section>

      <CollapsibleSection
        title={t('automation.failedPushes')}
        count={failed.length}
        defaultOpen={failed.length > 0}
      >
        <p className="mb-2 text-sm text-fg-muted">{t('automation.failedPushesHint')}</p>
        <p className="mb-2 text-xs text-fg-subtle">{t('automation.failedPushesActions')}</p>
        <FailedPushes
          rows={failed.map((f) => ({
            id: f.id,
            eventType: f.eventType,
            aggregateType: f.aggregateType,
            aggregateId: f.aggregateId,
            attempts: f.attempts,
            lastError: f.lastError,
            createdAt: f.createdAt.toISOString(),
          }))}
        />
      </CollapsibleSection>

      <CollapsibleSection title={t('home.integrations')} count={h.integrations.length}>
        {h.integrations.length === 0 ? (
          <EmptyState title={t('automation.sinIntegraciones')} />
        ) : (
          <ul className="flex flex-col gap-2">
            {h.integrations.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded border border-line px-3 py-2 text-sm">
                <span>{i.displayName}</span>
                <StatusBadge status={i.status} />
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title={t('automation.procesosRecientes')} count={recentJobs.length}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {/* La pantalla enseña los últimos 20; el log activo completo se baja en CSV. */}
          <p className="text-xs text-fg-subtle">{t('automation.jobsHistoryHint')}</p>
          <a href="/api/v1/jobs/export" className={buttonCls('secondary', 'sm')} download>
            {t('automation.downloadJobsCsv')}
          </a>
        </div>
        {recentJobs.length === 0 ? (
          <EmptyState title={t('automation.sinProcesos')} hint={t('automation.losProcesosAparecenAlEjecutarseAutomatiz')} />
        ) : (
          <EntityTable columns={jobColumns} rows={recentJobs} getKey={(j) => j.id} />
        )}
      </CollapsibleSection>

      {/* F-24: lotes ya rotados. Sólo aparece la sección cuando hay alguno, para no ocupar sitio el primer año. */}
      {archives.length > 0 && (
        <CollapsibleSection title={t('automation.logArchives')} count={archives.length}>
          <p className="mb-2 text-xs text-fg-subtle">{t('automation.logArchivesHint')}</p>
          <ul className="flex flex-col gap-2">
            {archives.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line px-3 py-2 text-sm">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {a.kind === 'OUTBOX' ? t('automation.bandejaDeSalida') : t('automation.procesos')} ·{' '}
                    {t('automation.logArchiveBatch', { n: a.seq })}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {formatDate(a.rangeFrom)} → {formatDate(a.rangeTo)}
                  </span>
                  <span className="text-xs text-fg-subtle">
                    {t('automation.logArchiveMeta', { rows: a.rowCount, size: Math.max(1, Math.round(a.sizeBytes / 1024)) })}
                  </span>
                </span>
                <a href={`/api/v1/log-archives/${a.id}`} className={buttonCls('secondary', 'sm')} download>
                  {t('automation.downloadJobsCsv')}
                </a>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
