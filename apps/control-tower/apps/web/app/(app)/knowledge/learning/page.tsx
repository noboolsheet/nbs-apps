import Link from 'next/link';
import { getDb } from '@ct/db';
import { listLearningItems } from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { EmptyState } from '@/components/ui/empty-state';
import { NewRecordButton } from '@/components/ui/new-record-button';
import { LearningList } from '@/components/learning/learning-list';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function LearningPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const items = await listLearningItems(getDb(), ctx.org);

  return (
    <div className="flex flex-col gap-4">
      <nav className="text-sm text-fg-muted">
        <Link className="hover:underline" href="/knowledge">{t('nav.knowledge')}</Link> / {t('knowledge.learningPathTitle')}
      </nav>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('knowledge.learningPathTitle')} <span className="font-normal text-fg-subtle">({items.length})</span></h1>
        </div>
        <NewRecordButton entity="learning" />
      </div>
      {items.length === 0 ? (
        <EmptyState title={t('knowledge.learningEmpty')} hint={t('knowledge.learningEmptyHint')} />
      ) : (
        <LearningList items={items} />
      )}
    </div>
  );
}
