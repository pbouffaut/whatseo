'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, Plus, X, Info } from 'lucide-react';

interface FormData {
  websiteUrl: string;
  ga4PropertyId: string;
  notificationChannel: 'email' | 'slack' | 'both';
  slackWebhookUrl: string;
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
    ga4PropertyId: '',
    notificationChannel: 'email',
    slackWebhookUrl: '',
    competitorUrls: [''],
    priorityPages: [''],
  });

  useEffect(() => {
    // Pre-fill if onboarding data exists
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from('onboarding_data').select('*').eq('user_id', user.id).single();
      if (data) {
        setForm({
          websiteUrl: data.website_url || '',
          ga4PropertyId: data.ga4_property_id || '',
          notificationChannel: data.notification_channel || 'email',
          slackWebhookUrl: data.slack_webhook_url || '',
          competitorUrls: data.competitor_urls?.length ? data.competitor_urls : [''],
          priorityPages: data.priority_pages?.length ? data.priority_pages : [''],
        });
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

    const { error: dbError } = await supabase.from('onboarding_data').upsert({
      user_id: user.id,
      website_url: form.websiteUrl,
      ga4_property_id: form.ga4PropertyId || null,
      notification_channel: form.notificationChannel,
      slack_webhook_url: form.slackWebhookUrl || null,
      competitor_urls: form.competitorUrls.filter(Boolean),
      priority_pages: form.priorityPages.filter(Boolean),
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
              description="Connects your real click, impression, and ranking data for accurate traffic analysis. We request read-only access via Google OAuth."
            />
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-gray hover:text-warm-white hover:border-gold/30 transition-colors text-sm"
            >
              Connect Search Console (Coming Soon)
            </button>
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

          {/* Notification Channel */}
          <div>
            <FieldLabel
              label="Report Delivery"
              description="Where should we send your audit reports and score alerts? You can change this anytime."
            />
            <div className="flex gap-3">
              {(['email', 'slack', 'both'] as const).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setForm({ ...form, notificationChannel: ch })}
                  className={`px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    form.notificationChannel === ch
                      ? 'bg-gold text-dark'
                      : 'bg-warm-white/5 text-warm-gray hover:text-warm-white border border-warm-white/10'
                  }`}
                >
                  {ch === 'both' ? 'Both' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Slack Webhook */}
          {(form.notificationChannel === 'slack' || form.notificationChannel === 'both') && (
            <div>
              <FieldLabel
                label="Slack Webhook URL"
                description="Paste your Slack incoming webhook URL. We'll post report summaries and score alerts to this channel. Create one at api.slack.com/apps → Incoming Webhooks."
              />
              <input
                type="url" value={form.slackWebhookUrl}
                onChange={(e) => setForm({ ...form, slackWebhookUrl: e.target.value })}
                placeholder="https://hooks.slack.com/services/T.../B.../xxx"
                className="w-full px-5 py-3.5 rounded-xl bg-warm-white/5 border border-warm-white/10 text-warm-white placeholder-warm-gray-light focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
          )}

          {/* Competitor URLs */}
          <div>
            <FieldLabel
              label="Competitor URLs (up to 3)"
              description="We'll compare your SEO profile against these competitors to find ranking gaps, content opportunities, and structural advantages they have over you."
            />
            {form.competitorUrls.map((url, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="url" value={url}
                  onChange={(e) => updateArrayField('competitorUrls', i, e.target.value)}
                  placeholder={`https://competitor${i + 1}.com`}
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
