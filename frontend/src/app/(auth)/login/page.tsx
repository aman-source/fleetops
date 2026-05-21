'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/stores/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/map');
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-0">
      <div className="w-[360px] bg-panel border border-line rounded-[10px] p-8">
        <div className="text-center mb-8">
          <h1 className="text-ink-0 text-lg font-semibold tracking-wide">FLEETOPS</h1>
          <p className="text-ink-3 text-[12px] mt-1">AR Technology Fleet Management</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-ink-3 text-[11px] uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              data-testid="auth-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-9 px-3 bg-surface border border-line rounded-[6px] text-ink-1 text-[13px] outline-none focus:border-primary transition-colors"
              placeholder="admin@artech.om"
              required
            />
          </div>

          <div>
            <label className="text-ink-3 text-[11px] uppercase tracking-wider mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              data-testid="auth-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 px-3 bg-surface border border-line rounded-[6px] text-ink-1 text-[13px] outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div data-testid="auth-error-message" className="text-nogo text-[12px] bg-nogo-soft px-3 py-2 rounded-[6px]">
              {error}
            </div>
          )}

          <button
            type="submit"
            data-testid="auth-submit-button"
            disabled={loading}
            className="h-9 bg-primary hover:bg-primary-2 text-white text-[13px] font-medium rounded-[6px] transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-ink-4 text-[11px] text-center mt-6">
          Fleetops v0.1.0 — Oman
        </p>
      </div>
    </div>
  );
}
