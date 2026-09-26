import Link from 'next/link';
import { getDb } from '@ct/db';
import { getOrganization } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { DescriptionList } from '@/components/ui/description-list';
import { InlineEditSection } from '@/components/ui/inline-edit';
import { PurgeCompletedButton, PurgeArchivedButton, PurgeReviewedButton } from '@/components/settings/actions';
import { ProfilePhoto } from '@/components/settings/profile-photo';
import { enumLabel } from '@/lib/labels';
import { CURRENCIES } from '@/lib/currencies';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

// Zonas horarias y monedas más habituales (lista curada; ampliable). El valor IANA es también la etiqueta.
const TIMEZONES = [
  'UTC',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Berlin',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'America/Bogota',
  'America/Santiago',
  'America/New_York',
  'America/Los_Angeles',
] as const;
// Opciones de retención con su etiqueta ya escrita: la opción "sin valor" del select es «Conservar siempre» y va
// primera (la pone `InlineEditSection` con `emptyLabel`), así que aquí sólo van los plazos.
const RETENTION_DAYS = [
  { value: '30', label: 'Borrar tras 30 días' },
  { value: '90', label: 'Borrar tras 90 días' },
  { value: '180', label: 'Borrar tras 180 días' },
  { value: '365', label: 'Borrar tras 365 días' },
] as const;

export default async function SettingsPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const org = await getOrganization(getDb(), ctx.org);
  const canManage = ctx.org.role === 'OWNER';

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.settings')}</h1>

      {/* Tu perfil va primero: es lo más personal y lo que más se toca. Sólo el NOMBRE es editable: el email es la
          credencial de acceso y cambiarlo pide su propio flujo con verificación (pendiente, ver E-9). */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('settings.yourProfile')}</h2>
        <ProfilePhoto user={{ name: ctx.user.name, image: ctx.user.image }} />
        <InlineEditSection
          endpoint="/api/v1/profile"
          fields={[
            { name: 'name', label: t('field.name'), type: 'text', value: ctx.user.name },
            {
              name: 'email',
              label: t('field.email'),
              type: 'text',
              value: ctx.user.email,
              readOnly: true,
              readOnlyHint: t('settings.emailReadOnly'),
            },
          ]}
        />
        <DescriptionList
          items={[
            { label: t('settings.roleInOrg'), value: enumLabel(ctx.org.role) },
            { label: t('settings.orgSlug'), value: <code>{org.slug}</code> },
          ]}
        />
      </section>

      {/* Separador entre bloques: sin él, «Tu perfil» y «Organización» se leían como una sola lista. */}
      <div className="border-t border-line pt-6">
      <InlineEditSection
        title={t('settings.organization')}
        endpoint="/api/v1/organization"
        canEdit={canManage}
        fields={[
          { name: 'name', label: t('field.name'), type: 'text', value: org.name },
          { name: 'timezone', label: t('settings.timezone'), type: 'select', options: TIMEZONES, value: org.settings.timezone ?? null },
          { name: 'defaultCurrency', label: t('settings.defaultCurrency'), type: 'select', options: CURRENCIES, value: org.settings.defaultCurrency ?? null },
          {
            name: 'completedTaskRetentionDays',
            label: t('settings.retentionCompletedTasks'),
            type: 'select',
            options: RETENTION_DAYS,
            emptyLabel: t('settings.keepForever'),
            value: org.settings.completedTaskRetentionDays ?? null,
            display: org.settings.completedTaskRetentionDays
              ? t('settings.retentionDeleteAfter', { n: org.settings.completedTaskRetentionDays })
              : t('settings.keepForever'),
            // El barrido lo ejecuta el worker; el botón lo lanza ahora, junto a la política que aplica.
            action: canManage ? <PurgeCompletedButton policyLabel={t('settings.retentionCompletedTasks')} /> : undefined,
          },
          {
            name: 'archivedRetentionDays',
            label: t('settings.retentionArchived'),
            type: 'select',
            options: RETENTION_DAYS,
            emptyLabel: t('settings.keepForever'),
            value: org.settings.archivedRetentionDays ?? null,
            display: org.settings.archivedRetentionDays
              ? t('settings.retentionDeleteAfter', { n: org.settings.archivedRetentionDays })
              : t('settings.keepForever'),
            action: canManage ? <PurgeArchivedButton policyLabel={t('settings.retentionArchived')} /> : undefined,
          },
          {
            name: 'reviewRetentionDays',
            label: t('settings.retentionReviewItems'),
            type: 'select',
            options: RETENTION_DAYS,
            emptyLabel: t('settings.keepForever'),
            value: org.settings.reviewRetentionDays ?? null,
            display: org.settings.reviewRetentionDays
              ? t('settings.retentionDeleteAfter', { n: org.settings.reviewRetentionDays })
              : t('settings.keepForever'),
            action: canManage ? <PurgeReviewedButton policyLabel={t('settings.retentionReviewItems')} /> : undefined,
          },
        ]}
      />
      {!canManage && (
        <p className="mt-2 text-xs text-fg-subtle">{t('settings.ownerOnlyHint')}</p>
      )}
      </div>

      <section className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('settings.guide')}</h2>
        <Link className="text-sm text-link underline-offset-2 hover:underline" href="/settings/guide">
          {t('settings.openGuideLink')}
        </Link>
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('settings.archivedTitle')}</h2>
        <Link className="text-sm text-link underline-offset-2 hover:underline" href="/settings/archived">
          {t('settings.viewArchivedLink')}
        </Link>
      </section>

      <section className="flex flex-col gap-2 border-t border-line pt-6">
        <h2 className="text-sm font-medium uppercase tracking-wide text-fg-muted">{t('home.integrations')}</h2>
        <Link className="text-sm text-link underline-offset-2 hover:underline" href="/automation/integrations">
          {t('settings.goToIntegrationsLink')}
        </Link>
      </section>
    </div>
  );
}
