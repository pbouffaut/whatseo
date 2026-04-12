'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getPlan, PLANS, type PlanSlug } from '@/lib/plans';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';

type Step = 'details' | 'processing' | 'success';

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
    setStep('processing');

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

      // Simulate payment processing
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create subscription
      const { error: subError } = await supabase.from('subscriptions').insert({
        user_id: user.id,
        plan: planSlug,
        status: 'active',
        amount_cents: plan.price,
        interval_months: plan.intervalMonths,
        expires_at: plan.intervalMonths
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      });
      if (subError) throw subError;

      // Grant audit credit(s)
      const { error: creditError } = await supabase.from('audit_credits').insert({
        user_id: user.id,
        credit_type: plan.intervalMonths ? 'subscription' : 'one_time',
        status: 'available',
        amount_cents: plan.price,
      });
      if (creditError) throw creditError;

      setStep('success');
      setTimeout(() => router.push('/onboarding'), 2000);
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

  if (step === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-gold mx-auto mb-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <h2 className="font-serif text-2xl text-warm-white mb-2">Processing your payment...</h2>
          <p className="text-warm-gray text-sm">This will only take a moment</p>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-[#4aab6a]/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-[#4aab6a]" />
          </div>
          <h2 className="font-serif text-3xl text-warm-white mb-3">Payment successful!</h2>
          <p className="text-warm-gray">Redirecting you to set up your audit...</p>
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
          <div className="mb-6">
            <span className="text-4xl font-bold text-warm-white">{plan.displayPrice}</span>
            <span className="text-warm-gray ml-1">{plan.period}</span>
          </div>
          {plan.commitment && (
            <p className="text-gold text-sm mb-6">{plan.commitment}</p>
          )}
          <ul className="space-y-3">
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

        {/* Checkout Form */}
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

            {/* Dummy card fields */}
            <div className="pt-4 border-t border-warm-white/10">
              <p className="text-sm text-warm-gray mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Payment details
              </p>
              <input type="text" placeholder="4242 4242 4242 4242" maxLength={19}
                className="w-full px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold mb-3" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="MM / YY" maxLength={7}
                  className="px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
                <input type="text" placeholder="CVC" maxLength={4}
                  className="px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold" />
              </div>
            </div>

            {error && <p className="text-[#e05555] text-sm">{error}</p>}

            <button type="submit"
              className="w-full py-4 bg-gold text-dark rounded-full font-semibold text-lg hover:bg-gold-light transition-colors mt-4"
            >
              Pay {plan.displayPrice}
            </button>

            <p className="text-xs text-warm-gray-light text-center">
              Encrypted with TLS 1.3. Your payment info is never stored on our servers.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
