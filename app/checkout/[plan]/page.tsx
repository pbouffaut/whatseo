'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPlan, PLANS, type PlanSlug } from '@/lib/plans';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';

type Step = 'details' | 'redirecting' | 'error';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const planSlug = params.plan as string;
  const plan = getPlan(planSlug);

  const [step, setStep] = useState<Step>('details');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true);
        setEmail(user.email || '');
      }
    });
  }, [supabase]);

  if (!plan || !(planSlug in PLANS)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-3xl text-warm-white mb-4">Plan not found</h1>
          <Link href="/#pricing" className="text-gold hover:text-gold-light">View pricing</Link>
        </div>
      </div>
    );
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Create account if not logged in
      if (!isLoggedIn) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (authError) throw authError;
        if (!data.user) throw new Error('Account creation failed');
      }

      setStep('redirecting');

      // Create Stripe Checkout session
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planSlug }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Failed to create checkout session');
      }

      const { url } = await res.json();
      if (!url) throw new Error('No checkout URL returned');

      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('details');
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?redirect=/checkout/${planSlug}` },
    });
    if (error) setError(error.message);
  };

  if (step === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-gold mx-auto mb-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h2 className="font-serif text-2xl text-warm-white mb-2">Redirecting to secure checkout…</h2>
          <p className="text-warm-gray text-sm">You&apos;ll be taken to Stripe to complete payment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
        {/* Plan Summary */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-8">
          <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-3">Your Plan</p>
          <h2 className="font-serif text-2xl text-warm-white mb-2">{plan.name}</h2>
          <div className="mb-2">
            <span className="text-4xl font-bold text-warm-white">{plan.displayPrice}</span>
            <span className="text-warm-gray ml-1">{plan.period}</span>
          </div>
          {plan.commitment && (
            <p className="text-gold text-sm mb-6">{plan.commitment}</p>
          )}
          <ul className="space-y-3 mt-4">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-warm-gray">
                <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-6 border-t border-warm-white/8">
            <div className="flex items-center gap-2 text-warm-gray-light text-xs">
              <Lock className="w-3.5 h-3.5" />
              30-day money-back guarantee
            </div>
          </div>
        </div>

        {/* Auth + Checkout */}
        <div>
          <h2 className="font-serif text-2xl text-warm-white mb-6">
            {isLoggedIn ? 'Complete your purchase' : 'Create your account'}
          </h2>

          {!isLoggedIn && (
            <>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-white text-dark font-semibold hover:bg-gray-100 transition-colors mb-6"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-warm-white/10" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-dark px-4 text-warm-gray-light">or</span></div>
              </div>
            </>
          )}

          <form onSubmit={handleCheckout} className="space-y-4">
            {!isLoggedIn && (
              <>
                <div>
                  <label className="block text-sm text-warm-gray mb-1.5">Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="John Smith" required
                    className="w-full px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-sm text-warm-gray mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com" required
                    className="w-full px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                </div>
                <div>
                  <label className="block text-sm text-warm-gray mb-1.5">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters" required minLength={6}
                    className="w-full px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                </div>
              </>
            )}

            {isLoggedIn && (
              <div className="bg-warm-white/5 rounded-xl p-4 mb-2">
                <p className="text-sm text-warm-gray">Signed in as <span className="text-warm-white">{email}</span></p>
              </div>
            )}

            <div className="pt-4 border-t border-warm-white/10">
              <div className="flex items-center gap-2 text-warm-gray text-sm mb-3">
                <Lock className="w-4 h-4" />
                Secure payment via Stripe
              </div>
              <p className="text-xs text-warm-gray-light">
                You&apos;ll be redirected to Stripe&apos;s secure checkout. Your payment info is never stored on our servers.
              </p>
            </div>

            {error && <p className="text-[#e05555] text-sm">{error}</p>}

            <button type="submit"
              className="w-full py-4 bg-gold text-dark rounded-full font-semibold text-lg hover:bg-gold-light transition-colors mt-4"
            >
              Continue to Payment →
            </button>

            <p className="text-xs text-warm-gray-light text-center">
              Powered by Stripe. 256-bit SSL encryption.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
