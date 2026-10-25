'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowUpRight, Check, ArrowRight } from 'lucide-react';
import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();
export function AuthScreen({ signup }: { signup: boolean }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const f = new FormData(e.currentTarget);
    try {
      const data = { email: String(f.get('email')), password: String(f.get('password')) };
      const result = signup
        ? await authClient.signUp.email({ ...data, name: String(f.get('name')) })
        : await authClient.signIn.email(data);
      if (result.error) throw new Error(result.error.message ?? 'Unable to sign in.');
      window.location.href = signup ? '/onboarding' : '/dashboard';
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to connect. Try again.');
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <ShieldCheck size={21} />
          </span>
          BUYWISE<span className="brand-dot">®</span>
        </Link>
        <div>
          <span className="eyebrow light">A little more intention.</span>
          <h1>
            Good purchases.
            <br />
            Better decisions.
          </h1>
          <p>A clear view of what you want, what you can spend, and what’s worth a second look.</p>
          <div className="auth-features">
            {[
              'Your rules, applied consistently',
              'Every decision, explained',
              'Your data stays yours',
            ].map((x) => (
              <span key={x}>
                <Check size={17} />
                {x}
              </span>
            ))}
          </div>
        </div>
        <footer>Independent by design. In your corner.</footer>
        <div className="auth-orbit" aria-hidden="true">
          <ShieldCheck size={160} />
        </div>
      </section>
      <section className="auth-form">
        <span className="eyebrow">YOUR PERSONAL PURCHASE DESK</span>
        <h2>{signup ? 'Make room for better decisions.' : 'Welcome back.'}</h2>
        <p className="muted">
          {signup
            ? 'Create your account. Set your boundaries. Shop on your terms.'
            : 'Sign in to your rules, saved finds, and decision history.'}
        </p>
        <form onSubmit={submit}>
          {signup && (
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={100}
                placeholder="Full name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={signup ? 'new-password' : 'current-password'}
              required
              minLength={12}
              maxLength={128}
              placeholder={signup ? 'At least 12 characters' : 'Your password'}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary wide" disabled={busy}>
            {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {signup ? 'Already have an account?' : 'New to BUYWISE?'}{' '}
          <Link href={signup ? '/login' : '/signup'}>
            {signup ? 'Sign in' : 'Create an account'} <ArrowUpRight size={14} />
          </Link>
        </p>
        <p className="fine-print">
          BUYWISE helps you review purchases. It does not place orders or move your money. No card
          details required.
        </p>
      </section>
    </div>
  );
}
