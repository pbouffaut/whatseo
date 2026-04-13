'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';

const MESSAGES = [
  'Connecting to your website...',
  'Analyzing technical foundation...',
  'Reviewing page structure...',
  'Detecting structured data...',
  'Measuring performance...',
  'Evaluating content quality...',
  'Checking AI readiness...',
  'Calculating your score...',
];

const TIMEOUT_MS = 90_000; // 90 seconds max wait

function AnalyzeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url') || '';
  const email = searchParams.get('email') || '';
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState('');
  const startTime = useRef(Date.now());

  const startAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to start analysis');
        return;
      }

      if (data.status === 'complete') {
        router.push(`/results/${data.id}`);
        return;
      }

      if (data.status === 'failed') {
        setError(data.error || 'Analysis failed. The site may be blocking our crawler.');
        return;
      }

      pollStatus(data.id);
    } catch {
      setError('Failed to connect. Please check your URL and try again.');
    }
  }, [url, email, router]);

  const pollStatus = useCallback((id: string) => {
    const interval = setInterval(async () => {
      if (Date.now() - startTime.current > TIMEOUT_MS) {
        clearInterval(interval);
        setError('Analysis is taking longer than expected. This can happen with very large sites or sites that block crawlers. Please try again.');
        return;
      }

      try {
        const res = await fetch(`/api/status/${id}`);
        const data = await res.json();
        if (data.status === 'complete') {
          clearInterval(interval);
          router.push(`/results/${id}`);
        }
        if (data.status === 'failed') {
          clearInterval(interval);
          setError(data.error || 'Analysis failed');
        }
      } catch { /* retry on next tick */ }
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    if (url && email) startAnalysis();
  }, [url, email, startAnalysis]);

  useEffect(() => {
    const interval = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setError('Analysis timed out. This can happen with sites that block automated crawlers or have very slow servers. Please try again or try a different URL.');
    }, TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-error-light flex items-center justify-center mx-auto mb-6">
            <span className="text-error text-2xl font-bold">!</span>
          </div>
          <h2 className="font-serif text-2xl text-on-surface mb-3">Something went wrong</h2>
          <p className="text-on-surface-muted text-sm mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3.5 bg-gradient-cta text-on-primary rounded-full font-semibold hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="text-center">
        <div className="mb-8">
          <svg className="animate-spin h-12 w-12 text-primary mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-on-surface mb-3 tracking-tight">Analyzing your site</h1>
        <p className="text-on-surface-muted mb-8 text-sm max-w-md">{url}</p>
        <p className="text-primary font-medium animate-pulse">{MESSAGES[msgIndex]}</p>
        <p className="text-on-surface-light text-xs mt-6">This typically takes 30&ndash;60 seconds</p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><p className="text-on-surface-muted">Loading...</p></div>}>
      <AnalyzeInner />
    </Suspense>
  );
}
