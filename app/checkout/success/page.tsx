'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { Suspense } from 'react';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!sessionId) {
      router.replace('/');
      return;
    }
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push('/onboarding');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-[#4aab6a]/10 flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-[#4aab6a]" strokeWidth={2} />
        </div>
        <h1 className="font-serif text-4xl text-warm-white mb-4">Payment Successful!</h1>
        <p className="text-warm-gray mb-2">
          Your audit credit has been added to your account.
        </p>
        <p className="text-warm-gray-light text-sm mb-8">
          Redirecting you to set up your first audit in {countdown}s…
        </p>
        <button
          onClick={() => router.push('/onboarding')}
          className="bg-gold text-dark px-8 py-3 rounded-full font-semibold hover:bg-gold-light transition-colors"
        >
          Start Your Audit Now
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
