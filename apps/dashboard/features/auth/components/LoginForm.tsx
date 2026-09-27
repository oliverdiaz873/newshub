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
          <p className="nh-login-brand-name">{t('brandName')}</p>
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
            <img src="/brand/logo-transparent.png" alt="" width={44} height={44} />
          </span>
          <strong>Newshub · Editorial</strong>
        </div>
        <section className="nh-card nh-login-card" aria-labelledby="login-title">
          <div className="nh-login-tile">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-transparent.png" alt="" width={64} height={64} />
          </div>
          <div className="nh-login-head">
            <h1 id="login-title">{t('title')}</h1>
            <p className="nh-muted">{t('subtitle')}</p>
          </div>
          {error && (
            <div className="nh-error nh-login-alert" role="alert">
              <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={submit} noValidate>
            <div className="nh-field">
              <label htmlFor="email">{t('email')}</label>
              <div className="nh-login-control">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lead" aria-hidden="true">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                  placeholder={t('emailPh')}
                  aria-invalid={emailError ? true : undefined}
                  aria-describedby={emailError ? 'email-err' : undefined}
                  className={emailError ? 'invalid' : undefined}
                />
              </div>
              {emailError && (
                <span id="email-err" className="nh-login-inline-err" role="alert">
                  {emailError}
                </span>
              )}
            </div>
            <div className="nh-field">
              <label htmlFor="password">{t('password')}</label>
              <div className="nh-login-control">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lead" aria-hidden="true">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder={t('passPh')}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'password-err' : undefined}
                  className={`has-toggle${passwordError ? ' invalid' : ''}`}
                />
                <button
                  className="nh-login-toggle"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t('hide') : t('show')}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <span id="password-err" className="nh-login-inline-err" role="alert">
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
