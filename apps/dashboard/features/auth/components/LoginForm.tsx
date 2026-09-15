'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';

/**
 * Auth feature — login form only. Transversal session infrastructure
 * (AuthProvider, useAuth, ApiFetch, RequireAuth, LogoutButton) stays in
 * shared/ because every feature consumes it.
 */
export function LoginForm() {
  const t = useTranslations('login');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    let ok = true;
    if (!email.trim()) {
      setEmailError(t('emailRequired'));
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError(t('emailInvalid'));
      ok = false;
    } else {
      setEmailError(null);
    }
    if (!password) {
      setPasswordError(t('passwordRequired'));
      ok = false;
    } else {
      setPasswordError(null);
    }
    if (!ok) {
      const first = !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'email' : 'password';
      document.getElementById(first)?.focus();
    }
    return ok;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!validate()) return;
    setBusy(true);
    const code = await login(email.trim(), password);
    setBusy(false);
    if (code) {
      setError(t('invalid'));
      document.getElementById('email')?.focus();
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="nh-login-split">
      <div className="nh-login-brand">
        <strong>Newshub · Editorial</strong>
        <p className="nh-muted">{t('subtitle')}</p>
      </div>
      <main>
        <Breadcrumbs trail={[{ label: t('title') }]} />
        <h1>{t('title')}</h1>
        <form className="nh-card" onSubmit={submit} noValidate>
          {error && (
            <div className="nh-error" role="alert">
              {error}
            </div>
          )}
          <div className="nh-field">
            <label htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              required
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'email-err' : undefined}
            />
            {emailError && (
              <span id="email-err" className="nh-muted" role="alert">
                {emailError}
              </span>
            )}
          </div>
          <div className="nh-field">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'password-err' : undefined}
            />
            <div className="nh-row">
              <button className="nh-btn" type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? t('hide') : t('show')}
              </button>
            </div>
            {passwordError && (
              <span id="password-err" className="nh-muted" role="alert">
                {passwordError}
              </span>
            )}
          </div>
          <button className="nh-btn primary" type="submit" disabled={busy}>
            {busy ? t('busy') : t('submit')}
          </button>
        </form>
      </main>
    </div>
  );
}
