'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { FrequentLinks } from './frequent-links';

/**
 * Navegación principal: Inicio · Negocio · CRM · Proyectos · Conocimiento · **Portafolio** · Automatización ·
 * Ajustes. La IA original (doc 6) congelaba 7 ítems y dejaba Portfolio dentro de Conocimiento; **el owner
 * decidió (2026-09-01, B-5) sacarlo a primer nivel** porque es un catálogo con vida propia, no material de
 * consulta. Es la única desviación de la nav congelada y está registrada en FINDINGS (B-5).
 */
const NAV: { label: string; href: string; enabled: boolean }[] = [
  { label: t('nav.home'), href: '/', enabled: true },
  { label: t('nav.business'), href: '/business', enabled: true },
  { label: t('nav.crm'), href: '/crm', enabled: true },
  { label: t('nav.projects'), href: '/projects', enabled: true },
  { label: t('nav.knowledge'), href: '/knowledge', enabled: true },
  { label: t('nav.portfolio'), href: '/portfolio', enabled: true },
  { label: t('nav.payments'), href: '/payments', enabled: true },
  { label: t('nav.automation'), href: '/automation', enabled: true },
  { label: t('nav.settings'), href: '/settings', enabled: true },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-line p-3">
      <div className="flex items-center gap-2 px-2 py-2 text-sm font-semibold tracking-tight">
        <img src="/control-tower-icono.png" alt="" width={22} height={22} className="rounded" />
        {t('login.controlTower')}
      </div>
      {NAV.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
        if (!item.enabled) {
          return (
            <span
              key={item.href}
              className="flex items-center justify-between rounded px-2 py-1.5 text-sm text-fg-subtle"
            >
              {item.label}
              <span className="text-[10px] uppercase">{t('nav.soon')}</span>
            </span>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded px-2 py-1.5 text-sm ${
              active
                ? 'bg-primary text-primary-fg'
                : 'text-fg-muted hover:bg-neutral-soft'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      {/* Aprendido del uso: accesos directos a las páginas profundas que más visitas. */}
      <FrequentLinks />
    </nav>
  );
}
