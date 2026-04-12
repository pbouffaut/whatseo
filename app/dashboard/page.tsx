import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: onboarding } = await supabase
    .from('onboarding_data')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const { data: audits } = await supabase
    .from('Audit')
    .select('*')
    .eq('user_id', user.id)
    .order('createdAt', { ascending: false })
    .limit(10);

  const planLabels: Record<string, string> = {
    professional: 'Professional Audit',
    monthly: 'Monthly Monitor',
    bimonthly: 'Bi-Monthly Monitor',
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-gold text-sm uppercase tracking-[0.2em] font-semibold mb-2">Dashboard</p>
            <h1 className="font-serif text-3xl text-warm-white">
              Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name}` : ''}
            </h1>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button className="px-5 py-2 rounded-full text-sm text-warm-gray border border-warm-white/10 hover:text-warm-white hover:border-warm-white/20 transition-colors">
              Sign Out
            </button>
          </form>
        </div>

        {/* Subscription */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
          <h2 className="text-lg font-semibold text-warm-white mb-4">Subscription</h2>
          {subscription ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-warm-white font-medium">{planLabels[subscription.plan] || subscription.plan}</p>
                <p className="text-warm-gray text-sm mt-1">
                  Status: <span className={subscription.status === 'active' ? 'text-[#4aab6a]' : 'text-warm-gray'}>{subscription.status}</span>
                  {subscription.expires_at && (
                    <> &middot; Expires {new Date(subscription.expires_at).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              <span className="bg-gold/10 text-gold text-xs font-bold px-3 py-1 rounded-full">Active</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-warm-gray text-sm">No active subscription</p>
              <Link href="/#pricing" className="text-gold text-sm hover:text-gold-light">View plans</Link>
            </div>
          )}
        </div>

        {/* Onboarding Status */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-warm-white">Audit Configuration</h2>
            <Link href="/onboarding" className="text-gold text-sm hover:text-gold-light">
              {onboarding ? 'Edit' : 'Set up'}
            </Link>
          </div>
          {onboarding ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">Website</p>
                <p className="text-warm-white text-sm">{onboarding.website_url}</p>
              </div>
              <div>
                <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">Notifications</p>
                <p className="text-warm-white text-sm capitalize">{onboarding.notification_channel}</p>
              </div>
              {onboarding.ga4_property_id && (
                <div>
                  <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">GA4 Property</p>
                  <p className="text-warm-white text-sm">{onboarding.ga4_property_id}</p>
                </div>
              )}
              {onboarding.competitor_urls?.length > 0 && (
                <div>
                  <p className="text-xs text-warm-gray-light uppercase tracking-wider mb-1">Competitors</p>
                  <p className="text-warm-white text-sm">{onboarding.competitor_urls.length} tracked</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-warm-gray text-sm">
              Complete your audit setup to get the most accurate analysis.
            </p>
          )}
        </div>

        {/* Audits */}
        <div className="bg-dark-card rounded-2xl border border-warm-white/8 p-6">
          <h2 className="text-lg font-semibold text-warm-white mb-4">Your Audits</h2>
          {audits && audits.length > 0 ? (
            <div className="space-y-3">
              {audits.map((audit) => (
                <Link
                  key={audit.id}
                  href={`/results/${audit.id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-warm-white/3 hover:bg-warm-white/5 transition-colors"
                >
                  <div>
                    <p className="text-warm-white text-sm font-medium">{audit.url}</p>
                    <p className="text-warm-gray-light text-xs mt-1">
                      {new Date(audit.createdAt).toLocaleDateString()} &middot; {audit.status}
                    </p>
                  </div>
                  {audit.score !== null && (
                    <div className={`text-lg font-bold ${
                      audit.score >= 70 ? 'text-[#4aab6a]' : audit.score >= 40 ? 'text-[#d4952b]' : 'text-[#e05555]'
                    }`}>
                      {audit.score}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-warm-gray text-sm">No audits yet. Your first audit will appear here once we analyze your site.</p>
          )}
        </div>

        {/* Account */}
        <div className="mt-8 text-center">
          <p className="text-warm-gray-light text-xs">
            Signed in as {user.email}
          </p>
        </div>
      </div>
    </div>
  );
}
