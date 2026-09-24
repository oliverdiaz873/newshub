'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { LocaleToggle, ThemeToggle } from '@/shared/components/Topbar';

/**
 * Auth feature — login form only. Transversal session infrastructure
 * (AuthProvider, useAuth, ApiFetch, RequireAuth) stays in shared/ because
 * every feature consumes it.
 */
export function LoginForm() {
  const t = useTranslations('login');
  const tc = useTranslations('common');
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
    try {
      const code = await login(email.trim(), password);
      if (code) {
        setError(t('invalid'));
        document.getElementById('email')?.focus();
        return;
      }
    } catch {
      // Network/API failure (e.g. CORS, API down): release the form
      // and show feedback instead of sticking on busy forever.
      setError(tc('networkError'));
      document.getElementById('email')?.focus();
      return;
    } finally {
      setBusy(false);
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="nh-login-shell">
      <aside className="nh-login-brand" aria-hidden="true">
        <div className="nh-login-brand-core">
          <p className="nh-login-kicker">{t('brandKicker')}</p>
          <h2>
            {t('brandTitle1')}
            <br />
            {t('brandTitle2')}
          </h2>
          <p className="nh-login-sub">{t('brandSub')}</p>
          <ul className="nh-login-points">
            <li>
              <span className="nh-login-tick">✓</span>
              <span>{t('brandP1')}</span>
            </li>
            <li>
              <span className="nh-login-tick">✓</span>
              <span>{t('brandP2')}</span>
            </li>
            <li>
              <span className="nh-login-tick">✓</span>
              <span>{t('brandP3')}</span>
            </li>
          </ul>
        </div>
        <div className="nh-login-brand-bottom">{t('brandFooter')}</div>
      </aside>
      <main className="nh-login-main">
        <div className="nh-login-theme">
          <LocaleToggle />
          <ThemeToggle />
        </div>
        <div className="nh-login-mobile-brand">
          <span className="nh-login-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpeg" alt="" width={44} height={44} />
          </span>
          <strong>Newshub · Editorial</strong>
        </div>
        <section className="nh-card nh-login-card" aria-labelledby="login-title">
          <div className="nh-login-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpeg" alt="" width={64} height={64} />
          </div>
          <div className="nh-login-head">
            <h1 id="login-title">{t('title')}</h1>
            <p className="nh-muted">{t('subtitle')}</p>
          </div>
          {error && (
            <div className="nh-error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <div className="nh-field">
              <label htmlFor="email">{t('email')}</label>
              <div className="nh-login-control">
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-.781.375L8 7.054l6.719-3.679A1 1 0 0 0 14 3zM14 5.029 8 8.822 2 5.029V12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1z" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'email-err' : undefined}
                  className={emailError ? 'invalid' : undefined}
                />
              </div>
              {emailError && (
                <span id="email-err" className="nh-muted" role="alert">
                  {emailError}
                </span>
              )}
            </div>
            <div className="nh-field">
              <label htmlFor="password">{t('password')}</label>
              <div className="nh-login-control">
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2M5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'password-err' : undefined}
                  className={passwordError ? 'invalid' : undefined}
                />
                <button
                  className="nh-login-toggle"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                >
                  {showPassword ? t('hide') : t('show')}
                </button>
              </div>
              {passwordError && (
                <span id="password-err" className="nh-muted" role="alert">
                  {passwordError}
                </span>
              )}
            </div>
            <button className="nh-btn primary nh-login-submit" type="submit" disabled={busy}>
              {busy && (
                <span className="nh-spinner" aria-hidden="true" />
              )}
              {busy ? t('busy') : t('submit')}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
