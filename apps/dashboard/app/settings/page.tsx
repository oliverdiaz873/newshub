'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/shared/api/auth';
import { getApiBase } from '@/shared/api/config';
import { useUiPrefs, type Density, type PreviewLanguage } from '@/shared/lib/ui-prefs';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { RequireAuth } from '@/shared/components/RequireAuth';
import { useToast } from '@/shared/components/Toasts';
import { NOTIFICATION_TYPES, typeLabelKey } from '@/lib/notifications';

function SettingsBody() {
  const t = useTranslations('settings');
  const tn = useTranslations('notifications');
  const { user, apiFetch, logout } = useAuth();
  const { density, previewLang, save } = useUiPrefs();
  const { notify } = useToast();
  const [checking, setChecking] = useState(false);
  const [muted, setMuted] = useState<string[]>([]);
  const [prefsBusy, setPrefsBusy] = useState(false);
  // A slow initial load must never clobber a faster user toggle.
  const userEditedPrefs = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch('/notifications/prefs');
        if (!res.ok) return;
        const body = (await res.json()) as { mutedTypes?: string[] };
        if (!userEditedPrefs.current) setMuted(Array.isArray(body.mutedTypes) ? body.mutedTypes : []);
      } catch {
        // Preferences are best-effort; UI stays usable.
      }
    })();
  }, [apiFetch]);

  const apiBase = getApiBase();

  async function checkSession() {
    setChecking(true);
    try {
      const res = await apiFetch('/auth/me');
      notify(res.ok ? t('refreshed') : `HTTP ${res.status}`, res.ok ? 'ok' : 'err');
    } catch {
      notify(t('refreshed'), 'err');
    } finally {
      setChecking(false);
    }
  }

  return (
    <main>
      <Breadcrumbs trail={[{ href: '/', label: 'Home' }, { label: t('title') }]} />
      <h1>{t('title')}</h1>

      <section className="nh-card" aria-label={t('session')}>
        <h2>{t('session')}</h2>
        <p className="nh-muted">
          {user ? `${user.displayName} · ${user.email} · ${user.role}` : '—'}
        </p>
        <div className="nh-row">
          <button className="nh-btn" type="button" onClick={() => void checkSession()} disabled={checking}>
            {t('refresh')}
          </button>
          <button className="nh-btn" type="button" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </section>

      <section className="nh-card" aria-label={t('api')}>
        <h2>{t('api')}</h2>
        <div className="nh-field">
          <label htmlFor="api-base">{t('apiBase')}</label>
          <input id="api-base" type="text" value={apiBase} readOnly aria-readonly="true" />
        </div>
      </section>

      <section className="nh-card" aria-label={tn('prefsTitle')}>
        <h2>{tn('prefsTitle')}</h2>
        <p className="nh-muted">{tn('prefsHint')}</p>
        <fieldset disabled={prefsBusy}>
          <legend className="nh-sr-only">{tn('prefsTitle')}</legend>
          {NOTIFICATION_TYPES.map((type) => {
            const isMuted = muted.includes(type);
            return (
              <label key={type} className="nh-row" style={{ justifyContent: 'flex-start', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!isMuted}
                  onChange={() => {
                    const next = isMuted ? muted.filter((m) => m !== type) : [...muted, type];
                    userEditedPrefs.current = true;
                    setMuted(next);
                    setPrefsBusy(true);
                    void (async () => {
                      try {
                        const res = await apiFetch('/notifications/prefs', {
                          method: 'POST',
                          body: JSON.stringify({ mutedTypes: next }),
                        });
                        if (!res.ok) {
                          notify(`HTTP ${res.status}`, 'err');
                          return;
                        }
                        const body = (await res.json()) as { mutedTypes: string[] };
                        setMuted(body.mutedTypes);
                        notify(tn('prefsSaved'), 'ok');
                      } catch {
                        notify(tn('prefsError'), 'err');
                      } finally {
                        setPrefsBusy(false);
                      }
                    })();
                  }}
                />{' '}
                {tn(typeLabelKey(type) as never) as string}
              </label>
            );
          })}
        </fieldset>
      </section>

      <section className="nh-card" aria-label={t('preferences')}>
        <h2>{t('preferences')}</h2>
        <div className="nh-field">
          <label htmlFor="density">{t('density')}</label>
          <select
            id="density"
            value={density}
            onChange={(event) => {
              const next = event.target.value as Density;
              save(next, previewLang);
              notify(t('saved'), 'ok');
            }}
          >
            <option value="comfortable">{t('densityComfortable')}</option>
            <option value="compact">{t('densityCompact')}</option>
          </select>
        </div>
        <div className="nh-field">
          <span className="nh-muted">{t('previewLanguage')}</span>
          <div className="nh-row" role="radiogroup" aria-label={t('previewLanguage')}>
            <label>
              <input
                type="radio"
                name="preview-lang"
                checked={previewLang === 'es-first'}
                onChange={() => {
                  const next: PreviewLanguage = 'es-first';
                  save(density, next);
                  notify(t('saved'), 'ok');
                }}
              />{' '}
              {t('esFirst')}
            </label>
            <label>
              <input
                type="radio"
                name="preview-lang"
                checked={previewLang === 'en-first'}
                onChange={() => {
                  const next: PreviewLanguage = 'en-first';
                  save(density, next);
                  notify(t('saved'), 'ok');
                }}
              />{' '}
              {t('enFirst')}
            </label>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsBody />
    </RequireAuth>
  );
}
