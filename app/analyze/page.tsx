'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';

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

function AnalyzeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get('url') || '';
  const email = searchParams.get('email') || '';
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState('');
  const [auditId, setAuditId] = useState('');

  const startAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start analysis'); return; }
      setAuditId(data.id);
    } catch { setError('Failed to connect. Please try again.'); }
  }, [url, email]);

  useEffect(() => {
    if (url && email) startAnalysis();
  }, [url, email, startAnalysis]);

  useEffect(() => {
    const interval = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!auditId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${auditId}`);
        const data = await res.json();
        if (data.status === 'complete') { clearInterval(interval); router.push(`/results/${auditId}`); }
        if (data.status === 'failed') { clearInterval(interval); setError(data.error || 'Analysis failed'); }
      } catch { /* retry */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [auditId, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-[#e05555] text-lg mb-4">{error}</div>
          <button onClick={() => router.push('/')} className="px-8 py-3.5 bg-gold text-dark rounded-full font-semibold hover:bg-gold-light transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mb-8">
          <svg className="animate-spin h-12 w-12 text-gold mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="font-serif text-3xl text-warm-white mb-3">Analyzing your site</h1>
        <p className="text-warm-gray mb-8 text-sm max-w-md">{url}</p>
        <p className="text-gold font-medium animate-pulse">{MESSAGES[msgIndex]}</p>
      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-warm-gray">Loading...</p></div>}>
      <AnalyzeInner />
    </Suspense>
  );
}
