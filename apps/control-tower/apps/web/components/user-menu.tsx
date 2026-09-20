'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from '@/lib/auth-client';
import { useTheme, type Theme } from '@/lib/theme';
import { Avatar } from '@/components/ui/avatar';
import { t } from '@/lib/i18n';

/**
 * Menú de usuario del header (estilo cuenta de Google): botón avatar + nombre que despliega un menú con el selector
 * de tema (claro/oscuro/sistema), un enlace a Ajustes y el botón de cerrar sesión. Sustituye al email + botón sueltos.
 */
export function UserMenu({ user }: { user: { name: string; email: string; image?: string | null } }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
      >
        <Avatar name={user.name} image={user.image} size="md" />
        <span className="text-sm font-medium text-fg">{user.name}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-fg-subtle" aria-hidden>
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
        >
          {/* Cabecera: identidad */}
          <div className="flex items-center gap-3 border-b border-line-subtle px-3 py-3">
            <Avatar name={user.name} image={user.image} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{user.name}</p>
              <p className="truncate text-xs text-fg-muted">{user.email}</p>
            </div>
          </div>

          {/* Tema */}
          <div className="border-b border-line-subtle px-3 py-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-fg-subtle">{t('userMenu.theme')}</p>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>

          {/* Acciones */}
          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-fg hover:bg-surface-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="text-fg-muted">
                <path
                  d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('nav.settings')}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-danger hover:bg-surface-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('userMenu.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: t('userMenu.themeLight') },
  { value: 'dark', label: t('userMenu.themeDark') },
  { value: 'system', label: t('enum.SYSTEM') },
];

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-md border border-line p-0.5">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
            theme === opt.value ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-muted'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
