import Link from 'next/link';
import { getDb } from '@ct/db';
import {
  listInbox,
  listKnowledgeItems,
  listDecisions,
  listAssets,
  listDocuments,
  listLearningItems,
  listReviewItems,
} from '@ct/application';
import { getCurrentContext } from '@/lib/auth-context';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export default async function KnowledgeOverviewPage() {
  const ctx = await getCurrentContext();
  if (!ctx?.org) return <p className="text-warning">{t('common.noOrg')}</p>;
  const db = getDb();
  const [inbox, items, decisions, assets, docs, learning, review] = await Promise.all([
    listInbox(db, ctx.org),
    listKnowledgeItems(db, ctx.org),
    listDecisions(db, ctx.org),
    listAssets(db, ctx.org),
    listDocuments(db, ctx.org),
    listLearningItems(db, ctx.org),
    listReviewItems(db, ctx.org),
  ]);
  // La tarjeta enseña lo que queda POR revisar, que es la cifra accionable.
  const pendingReview = review.filter((r) => r.status === 'TO_REVIEW' || r.status === 'REVIEWING').length;
  const pending = inbox.filter((i) => i.status === 'NEW' || i.status === 'PROCESSING').length;

  const cards = [
    { label: t('knowledge.inboxPendingCard'), href: '/knowledge/inbox', value: pending },
    { label: t('knowledge.libraryCardTitle'), href: '/knowledge/library', value: items.length },
    { label: t('knowledge.learningPathTitle'), href: '/knowledge/learning', value: learning.length },
    { label: t('review.title'), href: '/knowledge/review', value: pendingReview },
    { label: t('decisions.title'), href: '/knowledge/decisions', value: decisions.length },
    { label: t('assets.title'), href: '/knowledge/assets', value: assets.length },
    { label: t('documents.title'), href: '/knowledge/documents', value: docs.length },
    // B-5 (owner, 2026-09-01): Portafolio ya no cuelga de Conocimiento; vive en la barra lateral.
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.knowledge')}</h1>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-lg border border-line p-4 hover:bg-surface-muted/40">
            <div className="text-2xl font-semibold">{c.value}</div>
            <div className="text-sm text-fg-muted">{c.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
