import { Suspense, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { UserMenu } from './user-menu';
import { GlobalSearch } from './global-search';
import { RecordPanel } from './ui/record-panel';
import { AutomationPanel } from './automation/automation-panel';

/** AppShell (doc 7 §2): Sidebar persistente + Header + área de contenido. */
export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string; image?: string | null };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
          <GlobalSearch />
          <UserMenu user={user} />
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
      {/* Panel lateral global (crear/editar metadatos), controlado por ?rec=<entidad>:<id|new>. */}
      <Suspense fallback={null}>
        <RecordPanel />
      </Suspense>
      {/* Panel lateral de automatizaciones (solo lectura + acciones), controlado por ?auto=<key>. */}
      <Suspense fallback={null}>
        <AutomationPanel />
      </Suspense>
    </div>
  );
}
