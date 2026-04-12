'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, Plus, X, Info } from 'lucide-react';

interface FormData {
  websiteUrl: string;
  gscConnected: boolean;
  ga4PropertyId: string;
  competitorUrls: string[];
  priorityPages: string[];
}

function FieldLabel({ label, required, description }: { label: string; required?: boolean; description: string }) {
  return (
    <div className="mb-2">
      <label className="text-sm font-semibold text-warm-white">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      <p className="text-xs text-warm-gray mt-0.5 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-warm-gray-light shrink-0 mt-0.5" />
        {description}
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormData>({
    websiteUrl: '',
    gscConnected: false,
    ga4PropertyId: '',
    competitorUrls: [''],
    priorityPages: [''],
  });

  const handleConnectGSC = async () => {
    // Initiate Google OAuth with Search Console scope
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
        scopes: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) setError(error.message);
    else setForm({ ...form, gscConnected: true });
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Check multiple sources for Google tokens:
      // 1. Session provider_token (available right after OAuth)
      const { data: sessionData } = await supabase.auth.getSession();
      let providerToken = sessionData?.session?.provider_token || null;
      let providerRefreshToken = sessionData?.session?.provider_refresh_token || null;

      // 2. URL params fallback (if callback couldn't save to DB)
      if (!providerToken && typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlToken = params.get('gsc_token');
        const urlRefresh = params.get('gsc_refresh');
        if (urlToken) {
          providerToken = urlToken;
          providerRefreshToken = urlRefresh;
          // Clean URL params
          window.history.replaceState({}, '', window.location.pathname);
        }
      }

      const justConnectedGoogle = !!providerToken;

      const { data } = await supabase.from('onboarding_data').select('*').eq('user_id', user.id).single();

      // 3. Check if tokens were already saved by the callback route
      const hasTokensInDb = !!data?.google_access_token;
      const gscConnected = justConnectedGoogle || hasTokensInDb || data?.gsc_connected || false;

      // If just connected Google, persist the tokens for later use by the audit
      if (justConnectedGoogle && data) {
        await supabase.from('onboarding_data').update({
          gsc_connected: true,
          google_access_token: providerToken,
          google_refresh_token: providerRefreshToken || data.google_refresh_token || null,
          google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // ~1 hour
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      } else if (justConnectedGoogle && !data) {
        // No onboarding data yet — tokens will be saved when form is submitted
      }

      if (data) {
        setForm({
          websiteUrl: data.website_url || '',
          gscConnected,
          ga4PropertyId: data.ga4_property_id || '',
          competitorUrls: data.competitor_urls?.length ? data.competitor_urls : [''],
          priorityPages: data.priority_pages?.length ? data.priority_pages : [''],
        });
      } else if (justConnectedGoogle) {
        // No onboarding data yet, but GSC was just connected — update form state
        setForm((prev) => ({ ...prev, gscConnected: true }));
      }
    });
  }, [supabase]);

  const addField = (field: 'competitorUrls' | 'priorityPages', max: number) => {
    if (form[field].length >= max) return;
    setForm({ ...form, [field]: [...form[field], ''] });
  };

  const removeField = (field: 'competitorUrls' | 'priorityPages', index: number) => {
    setForm({ ...form, [field]: form[field].filter((_, i) => i !== index) });
  };

  const updateArrayField = (field: 'competitorUrls' | 'priorityPages', index: number, value: string) => {
    const updated = [...form[field]];
    updated[index] = value;
    setForm({ ...form, [field]: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }

    // Get current tokens from session if available
    const { data: sessionData } = await supabase.auth.getSession();
    const currentToken = sessionData?.session?.provider_token;
    const currentRefreshToken = sessionData?.session?.provider_refresh_token;

    // Get existing tokens from DB (don't overwrite with null)
    const { data: existing } = await supabase.from('onboarding_data').select('google_access_token, google_refresh_token').eq('user_id', user.id).single();

    const { error: dbError } = await supabase.from('onboarding_data').upsert({
      user_id: user.id,
      website_url: form.websiteUrl,
      gsc_connected: form.gscConnected,
      ga4_property_id: form.ga4PropertyId || null,
      notification_channel: 'email',
      slack_webhook_url: null,
      competitor_urls: form.competitorUrls.filter(Boolean),
      priority_pages: form.priorityPages.filter(Boolean),
      google_access_token: currentToken || existing?.google_access_token || null,
      google_refresh_token: currentRefreshToken || existing?.google_refresh_token || null,
      google_token_expires_at: currentToken ? new Date(Date.now() + 3600 * 1000).toISOString() : null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (dbError) { setError(dbError.message); setLoading(false); return; }
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-3">Setup</p>
          <h1 className="font-serif text-3xl md:text-4xl text-warm-white mb-3">
            Configure Your Audit
          </h1>
          <p className="text-warm-gray max-w-lg mx-auto">
            Tell us about your website so we can deliver the most accurate analysis.
            Only the website URL is required — everything else can be added later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Website URL */}
          <div>
            <FieldLabel
              label="Website URL"
              required
              description="The primary URL we'll audit. We'll crawl up to 500 pages starting from this domain."
            />
            <input
              type="url" value={form.websiteUrl}
              onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              placeholder="https://yourcompany.com"
              required
              className="w-full px-5 py-3.5 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>

          {/* Google Search Console */}
          <div>
            <FieldLabel
              label="Google Search Console"
              description="Connects your real click, impression, and ranking data for accurate traffic analysis. We request read-only access via Google OAuth. You can revoke access anytime from your Google account."
            />
            {form.gscConnected ? (
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#4aab6a]/10 border border-[#4aab6a]/20">
                <Check className="w-5 h-5 text-[#4aab6a]" />
                <span className="text-[#4aab6a] text-sm font-medium">Search Console connected</span>
                <button type="button" onClick={() => setForm({ ...form, gscConnected: false })}
                  className="ml-auto text-xs text-warm-gray-light hover:text-warm-white">Disconnect</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConnectGSC}
                className="flex items-center gap-3 px-6 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white hover:border-gold/30 transition-colors text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Connect Google Search Console
              </button>
            )}
          </div>

          {/* GA4 Property ID */}
          <div>
            <FieldLabel
              label="Google Analytics Property ID"
              description="Links your GA4 data so we can measure organic traffic trends, engagement rates, and conversion impact. Find it in GA4 → Admin → Property Settings."
            />
            <input
              type="text" value={form.ga4PropertyId}
              onChange={(e) => setForm({ ...form, ga4PropertyId: e.target.value })}
              placeholder="e.g., 325845615"
              className="w-full px-5 py-3.5 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
            />
          </div>

          {/* Report info */}
          <div className="bg-warm-white/5 rounded-xl p-5 border border-warm-white/8">
            <p className="text-sm text-warm-gray leading-relaxed">
              <span className="text-gold font-medium">Reports:</span> All audit reports will be emailed to your account email and available for download in your dashboard. Historical reports are kept so you can track progress over time.
            </p>
          </div>

          {/* Competitor URLs */}
          <div>
            <FieldLabel
              label="Competitor URLs (up to 3)"
              description="We'll compare your SEO profile against these competitors to find ranking gaps, content opportunities, and structural advantages they have over you."
            />
            {form.competitorUrls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text" value={url}
                  onChange={(e) => updateArrayField('competitorUrls', i, e.target.value)}
                  placeholder={`competitor${i + 1}.com`}
                  className="flex-1 px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
                {form.competitorUrls.length > 1 && (
                  <button type="button" onClick={() => removeField('competitorUrls', i)}
                    className="p-3 text-warm-gray-light hover:text-warm-white"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            {form.competitorUrls.length < 3 && (
              <button type="button" onClick={() => addField('competitorUrls', 3)}
                className="flex items-center gap-1.5 text-gold text-sm hover:text-gold-light mt-1">
                <Plus className="w-4 h-4" /> Add competitor
              </button>
            )}
          </div>

          {/* Priority Pages */}
          <div>
            <FieldLabel
              label="Priority Pages (up to 5)"
              description="Specific pages you want us to focus on — your top landing pages, underperforming pages, or key conversion pages. We'll provide deeper analysis on these."
            />
            {form.priorityPages.map((page, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text" value={page}
                  onChange={(e) => updateArrayField('priorityPages', i, e.target.value)}
                  placeholder={`/your-important-page-${i + 1}`}
                  className="flex-1 px-5 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
                {form.priorityPages.length > 1 && (
                  <button type="button" onClick={() => removeField('priorityPages', i)}
                    className="p-3 text-warm-gray-light hover:text-warm-white"><X className="w-4 h-4" /></button>
                )}
              </div>
            ))}
            {form.priorityPages.length < 5 && (
              <button type="button" onClick={() => addField('priorityPages', 5)}
                className="flex items-center gap-1.5 text-gold text-sm hover:text-gold-light mt-1">
                <Plus className="w-4 h-4" /> Add page
              </button>
            )}
          </div>

          {error && <p className="text-[#e05555] text-sm">{error}</p>}

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button type="submit" disabled={loading}
              className="flex-1 py-4 bg-gold text-dark rounded-full font-semibold text-lg hover:bg-gold-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? 'Saving...' : <><Check className="w-5 h-5" /> Save &amp; Continue</>}
            </button>
            <button type="button" onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-warm-white/5 text-warm-gray rounded-full font-semibold hover:bg-warm-white/10 transition-colors border border-warm-white/10"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
