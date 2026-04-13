'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function UrlForm({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    router.push(`/analyze?url=${encodeURIComponent(normalizedUrl)}&email=${encodeURIComponent(email)}`);
  };

  return (
    <form onSubmit={handleSubmit} className={`w-full ${compact ? 'max-w-xl' : 'max-w-2xl'}`}>
      <div className={`flex ${compact ? 'flex-col sm:flex-row' : 'flex-col'} gap-3`}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourwebsite.com"
          required
          className="flex-1 px-5 py-3.5 rounded-xl bg-surface-low text-on-surface placeholder-on-surface-light focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-base border-ghost"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="flex-1 px-5 py-3.5 rounded-xl bg-surface-low text-on-surface placeholder-on-surface-light focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all text-base border-ghost"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 bg-gradient-cta text-on-primary font-semibold rounded-full hover:opacity-90 hover:scale-[1.02] transition-all disabled:opacity-60 flex items-center justify-center gap-2 min-w-[200px] text-base"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              Start Your Free Scan
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
