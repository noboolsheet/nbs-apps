'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/auth-client';
import { btnLink, btnPrimary } from '@/components/ui/button';
import { fieldCls } from '@/components/ui/input';
import { t } from '@/lib/i18n';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'signin'
          ? await signIn.email({ email, password })
          : await signUp.email({ email, password, name: name || email });
      if (res.error) {
        setError(res.error.message ?? t('login.authError'));
        return;
      }
      const next = new URLSearchParams(window.location.search).get('next') ?? '/';
      router.push(next);
      router.refresh();
    } catch {
      setError(t('login.genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('login.controlTower')}</h1>
        <p className="text-sm text-fg-muted">
          {mode === 'signin' ? t('login.signIn') : t('login.createAccount')}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            className={`${fieldCls} px-3 py-2`}
            placeholder={t('field.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        )}
        <input
          className={`${fieldCls} px-3 py-2`}
          type="email"
          placeholder={t('field.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={`${fieldCls} px-3 py-2`}
          type="password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={8}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className={btnPrimary}
        >
          {loading ? '…' : mode === 'signin' ? t('login.submitSignIn') : t('login.submitSignUp')}
        </button>
      </form>

      {/* El alta es **bootstrap-only**: sólo se puede crear la PRIMERA cuenta, así que este formulario responde 403
          en una instancia ya usada. Se dice antes de que lo intente, en vez de dejarle descubrirlo con un error. */}
      {mode === 'signup' && <p className="text-xs text-fg-muted">{t('login.signUpClosed')}</p>}

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className={btnLink}
      >
        {mode === 'signin' ? t('login.toSignUp') : t('login.toSignIn')}
      </button>
    </main>
  );
}
