import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentContext } from '@/lib/auth-context';
import { AppShell } from '@/components/app-shell';

export const dynamic = 'force-dynamic';

/** Layout autenticado: verifica sesión real (defensa en profundidad tras el middleware) y monta el shell. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect('/login');
  return <AppShell user={ctx.user}>{children}</AppShell>;
}
