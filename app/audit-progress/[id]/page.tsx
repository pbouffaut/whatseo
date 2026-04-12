'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import Link from 'next/link';

const PHASES = [
  { key: 'crawling', label: 'Crawling your site', description: 'Discovering pages from sitemap and internal links' },
  { key: 'analyzing', label: 'Analyzing pages', description: 'Running 47 checks on each page' },
  { key: 'google_data', label: 'Fetching performance data', description: 'PageSpeed Insights, Core Web Vitals' },
  { key: 'generating_report', label: 'Generating report', description: 'Aggregating results and creating recommendations' },
  { key: 'complete', label: 'Audit complete', description: '' },
];

export default function AuditProgressPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [status, setStatus] = useState('running');
  const [phase, setPhase] = useState('crawling');
  const [pagesCrawled, setPagesCrawled] = useState(0);
  const [pagesTotal, setPagesTotal] = useState(0);
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const auditStartTime = useRef<number | null>(null);

  // Tick elapsed timer every second (based on actual audit createdAt)
  useEffect(() => {
    const timer = setInterval(() => {
      if (auditStartTime.current) {
        setElapsed(Math.round((Date.now() - auditStartTime.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll audit status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${id}`);
        const data = await res.json();

        // Set the real start time from the audit record
        if (data.createdAt && !auditStartTime.current) {
          auditStartTime.current = new Date(data.createdAt).getTime();
          setElapsed(Math.round((Date.now() - auditStartTime.current) / 1000));
        }

        setStatus(data.status);
        setPhase(data.phase || 'crawling');
        setPagesCrawled(data.pages_crawled || 0);
        setPagesTotal(data.pages_total || 0);

        if (data.status === 'complete') {
          setScore(data.score);
          clearInterval(interval);
          // Auto-redirect after 2 seconds
          setTimeout(() => router.push(`/results/${id}`), 2000);
        }

        if (data.status === 'failed') {
          setError(data.error || 'Audit failed');
          clearInterval(interval);
        }
      } catch { /* retry */ }
    }, 2000);

    return () => clearInterval(interval);
  }, [id, router]);

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === phase);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#e05555]/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-[#e05555] text-2xl">!</span>
          </div>
          <h2 className="font-serif text-2xl text-warm-white mb-3">Audit Failed</h2>
          <p className="text-warm-gray text-sm mb-4">{error}</p>
          <p className="text-warm-gray-light text-xs mb-8">Your audit credit has been refunded.</p>
          <Link href="/dashboard" className="px-8 py-3.5 bg-gold text-dark rounded-full font-semibold hover:bg-gold-light transition-colors inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#4aab6a]/10 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-[#4aab6a]" />
          </div>
          <h2 className="font-serif text-3xl text-warm-white mb-3">Audit Complete!</h2>
          <p className="text-gold text-4xl font-bold mb-2">{score}/100</p>
          <p className="text-warm-gray mb-6">{pagesCrawled} pages analyzed</p>
          <p className="text-warm-gray-light text-sm">Redirecting to your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl text-warm-white mb-3">Running Your Audit</h1>
          <p className="text-warm-gray text-sm">
            This usually takes 1-3 minutes. You can close this page and come back later &mdash; your audit will continue running.
          </p>
        </div>

        {/* Progress steps */}
        <div className="space-y-0 mb-10">
          {PHASES.slice(0, -1).map((p, i) => {
            const isActive = i === currentPhaseIndex;
            const isDone = i < currentPhaseIndex;
            const isPending = i > currentPhaseIndex;

            return (
              <div key={p.key} className="flex gap-4 items-start">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-[#4aab6a]' : isActive ? 'bg-gold' : 'bg-warm-white/10'
                  }`}>
                    {isDone ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isActive ? (
                      <svg className="animate-spin h-4 w-4 text-dark" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-warm-gray-light" />
                    )}
                  </div>
                  {i < PHASES.length - 2 && (
                    <div className={`w-0.5 h-10 ${isDone ? 'bg-[#4aab6a]' : 'bg-warm-white/10'}`} />
                  )}
                </div>

                {/* Step content */}
                <div className="pb-8">
                  <p className={`font-medium text-sm ${
                    isDone ? 'text-[#4aab6a]' : isActive ? 'text-warm-white' : 'text-warm-gray-light'
                  }`}>
                    {p.label}
                    {isActive && p.key === 'crawling' && pagesTotal > 0 && (
                      <span className="text-gold ml-2">{pagesCrawled}/{pagesTotal} pages</span>
                    )}
                    {isActive && p.key === 'analyzing' && pagesCrawled > 0 && (
                      <span className="text-gold ml-2">{pagesCrawled} pages</span>
                    )}
                  </p>
                  {(isActive || isDone) && (
                    <p className={`text-xs mt-0.5 ${isDone ? 'text-warm-gray-light' : 'text-warm-gray'}`}>
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Crawl progress bar */}
        {phase === 'crawling' && pagesTotal > 0 && (
          <div className="mb-8">
            <div className="flex justify-between text-xs text-warm-gray mb-1">
              <span>Crawling pages</span>
              <span>{pagesCrawled} / {pagesTotal}</span>
            </div>
            <div className="h-1.5 bg-warm-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (pagesCrawled / pagesTotal) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="text-center text-warm-gray-light text-xs">
          <p>Elapsed: {elapsed}s</p>
          <p className="mt-2">
            <Link href="/dashboard" className="text-gold hover:text-gold-light">
              Back to Dashboard
            </Link>
            {' '}&mdash; your audit will keep running in the background
          </p>
        </div>
      </div>
    </div>
  );
}
