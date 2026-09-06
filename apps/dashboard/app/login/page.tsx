'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('editor@newshub.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const code = await login(email, password);
    setBusy(false);
    if (code) {
      setError(code === 'unauthorized' ? 'Credenciales inválidas.' : `Error: ${code}`);
      return;
    }
    router.push('/categories');
  }

  return (
    <main>
      <h1>Acceder</h1>
      <form className="nh-card" onSubmit={submit}>
        {error && <div className="nh-error">{error}</div>}
        <div className="nh-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="nh-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="nh-btn primary" type="submit" disabled={busy}>
          {busy ? 'Accediendo…' : 'Acceder'}
        </button>
      </form>
    </main>
  );
}
